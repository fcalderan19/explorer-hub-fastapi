from datetime import timedelta, datetime
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from database import get_database
from models.user import UserCreate, User, Token, UserLogin
from models.counter import get_next_sequence_value
from auth import (
    get_password_hash,
    verify_password,
    create_access_token,
    get_current_active_user,
)
from config import settings
from utils import serialize_doc
from email_service import email_service

router = APIRouter(prefix="/api/auth", tags=["authentication"])


@router.post("/signup", response_model=dict, status_code=status.HTTP_201_CREATED)
async def signup(user: UserCreate, db = Depends(get_database)):
    """Register a new user"""
    # Check if user already exists
    existing_user = await db.users.find_one({"email": user.email})
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    # Check if username already exists
    if user.username:
        existing_username = await db.users.find_one({"username": user.username})
        if existing_username:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Username already taken"
            )
    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username is required"
        )
    
    # Validate role
    if user.role not in ["client", "business"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Role must be either 'client' or 'business'"
        )
    
    # Validate age +18 if birth_date is provided
    if hasattr(user, 'birth_date') and user.birth_date:
        birth_date = datetime.fromisoformat(user.birth_date.replace('Z', '+00:00')) if isinstance(user.birth_date, str) else user.birth_date
        today = datetime.now()
        age = today.year - birth_date.year
        
        # Adjust age if birthday hasn't occurred yet this year
        if (today.month, today.day) < (birth_date.month, birth_date.day):
            age -= 1
        
        if age < 18:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="You must be at least 18 years old to create an account"
            )
    
    # Validate required fields
    if not user.full_name or not user.full_name.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Full name is required"
        )
    
    if not user.email or not user.email.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email is required"
        )
    
    # Create new user
    user_dict = user.model_dump()
    user_dict["hashed_password"] = get_password_hash(user_dict.pop("password"))
    
    # Get next sequential ID
    next_id = await get_next_sequence_value("users", db)
    user_dict["id"] = next_id
    
    await db.users.insert_one(user_dict)
    created_user = await db.users.find_one({"id": next_id})
    
    # Remove _id field
    created_user = serialize_doc(created_user)
    
    access_token_expires = timedelta(minutes=settings.access_token_expire_minutes)
    access_token = create_access_token(
        data={"sub": created_user["email"]}, expires_delta=access_token_expires
    )
    
    return {
        "access_token": access_token,
        "user": {
            "id": created_user["id"],
            "email": created_user["email"],
            "full_name": created_user["full_name"],
            "username": created_user.get("username"),
            "profile_picture": created_user.get("profile_picture"),
            "role": created_user.get("role", "client"),
            "country": created_user.get("country"),
            "birth_date": created_user.get("birth_date"),
            "language": created_user.get("language", "es"),
            "preferences": created_user.get("preferences", [])
        }
    }


@router.post("/login")
async def login(user_credentials: UserLogin, db = Depends(get_database)):
    """Login user and return access token"""
    # Try to find user by email first, then by username
    user = await db.users.find_one({"email": user_credentials.identifier})
    if not user:
        user = await db.users.find_one({"username": user_credentials.identifier})
    
    if not user or not verify_password(user_credentials.password, user["hashed_password"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email/username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Ensure user has id field
    user = serialize_doc(user)
    
    access_token_expires = timedelta(minutes=settings.access_token_expire_minutes)
    access_token = create_access_token(
        data={"sub": user["email"]}, expires_delta=access_token_expires
    )
    
    return {
        "access_token": access_token,
        "user": {
            "id": user["id"],
            "email": user["email"],
            "full_name": user["full_name"],
            "username": user.get("username"),
            "profile_picture": user.get("profile_picture"),
            "role": user.get("role", "client"),
            "country": user.get("country"),
            "birth_date": user.get("birth_date"),
            "language": user.get("language", "es"),
            "preferences": user.get("preferences", [])
        }
    }


@router.get("/me")
async def get_me(current_user = Depends(get_current_active_user)):
    """Get current user information"""
    return {
        "id": current_user.id,
        "email": current_user.email,
        "full_name": current_user.full_name,
        "username": current_user.username,
        "profile_picture": current_user.profile_picture,
        "role": current_user.role,
        "country": getattr(current_user, "country", None),
        "birth_date": getattr(current_user, "birth_date", None),
        "language": getattr(current_user, "language", "es"),
        "preferences": getattr(current_user, "preferences", [])
    }


@router.get("/check-username/{username}")
async def check_username(username: str, db = Depends(get_database)):
    """Check if username is available"""
    existing = await db.users.find_one({"username": username})
    return {"available": existing is None}


@router.post("/forgot-password")
async def forgot_password(request: dict, db = Depends(get_database)):
    """Send password reset email"""
    email = request.get("email")
    if not email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email is required"
        )
    
    # Check if user exists
    user = await db.users.find_one({"email": email})
    if not user:
        # Don't reveal if email exists or not for security
        return {"message": "If the email exists, a password reset link has been sent"}
    
    # Check if email service is configured
    if not email_service.api_token:
        print("WARNING: Email service not configured. Please set MAILTRAP_API_TOKEN in .env")
        return {"message": "Email service not configured. Please contact support."}
    
    # Generate reset token (simplified - in production use proper JWT with expiration)
    import secrets
    reset_token = secrets.token_urlsafe(32)
    
    # Store reset token with expiration (1 hour)
    reset_data = {
        "email": email,
        "token": reset_token,
        "expires_at": datetime.now() + timedelta(hours=1)
    }
    
    # Remove any existing reset tokens for this email
    await db.password_resets.delete_many({"email": email})
    
    # Insert new reset token
    await db.password_resets.insert_one(reset_data)
    
    # Send email
    email_sent = email_service.send_password_reset_email(email, reset_token)
    
    if email_sent:
        print(f"Password reset email sent successfully to {email}")
        return {"message": "Password reset email sent successfully"}
    else:
        print(f"Failed to send password reset email to {email}")
        return {"message": "Failed to send email. Please try again later or contact support."}


@router.post("/reset-password")
async def reset_password(request: dict, db = Depends(get_database)):
    """Reset password using reset token"""
    token = request.get("token")
    password = request.get("password")
    
    if not token or not password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Token and password are required"
        )
    
    # Find valid reset token
    reset_doc = await db.password_resets.find_one({
        "token": token,
        "expires_at": {"$gt": datetime.now()}
    })
    
    if not reset_doc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired reset token"
        )
    
    email = reset_doc["email"]
    
    # Hash new password
    hashed_password = get_password_hash(password)
    
    # Update user password
    result = await db.users.update_one(
        {"email": email},
        {"$set": {"hashed_password": hashed_password}}
    )
    
    if result.modified_count == 0:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # Remove used reset token
    await db.password_resets.delete_one({"token": token})
    
    return {"message": "Password reset successfully"}
