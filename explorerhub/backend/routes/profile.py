from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from database import get_database
from auth import get_current_active_user
from models.user import UserInDB
from utils import serialize_doc
import os
import shutil
from pathlib import Path
from typing import Optional
from pydantic import BaseModel

router = APIRouter(prefix="/api/profile", tags=["profile"])

# Directory for storing profile pictures
UPLOAD_DIR = Path("uploads/profile_pictures")
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)


class ProfileUpdate(BaseModel):
    username: Optional[str] = None
    full_name: Optional[str] = None
    country: Optional[str] = None
    language: Optional[str] = None
    preferences: Optional[list] = None
    birth_date: Optional[str] = None


@router.get("/me")
async def get_profile(
    current_user: UserInDB = Depends(get_current_active_user),
    db = Depends(get_database)
):
    """Get current user's full profile"""
    user = await db.users.find_one({"id": current_user.id})
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    user = serialize_doc(user)
    # Remove sensitive data
    user.pop("hashed_password", None)
    user.pop("_id", None)
    
    return user


@router.put("/update")
async def update_profile(
    profile_data: ProfileUpdate,
    current_user: UserInDB = Depends(get_current_active_user),
    db = Depends(get_database)
):
    """Update user profile"""
    update_data = profile_data.model_dump(exclude_unset=True)
    
    # Check if username is being changed and if it's available
    if "username" in update_data and update_data["username"] != current_user.username:
        existing = await db.users.find_one({"username": update_data["username"]})
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Username already taken"
            )
    
    # Validate birth_date if provided (must be 18+ years old)
    if "birth_date" in update_data and update_data["birth_date"]:
        from datetime import datetime
        try:
            birth_date = datetime.fromisoformat(update_data["birth_date"].replace('Z', '+00:00'))
            today = datetime.now()
            age = today.year - birth_date.year - ((today.month, today.day) < (birth_date.month, birth_date.day))
            
            if age < 18:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Debes ser mayor de edad"
                )
            
            if birth_date > today:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="La fecha de nacimiento no puede estar en el futuro"
                )
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Formato de fecha inválido"
            )
    
    if update_data:
        await db.users.update_one(
            {"id": current_user.id},
            {"$set": update_data}
        )
    
    updated_user = await db.users.find_one({"id": current_user.id})
    updated_user = serialize_doc(updated_user)
    updated_user.pop("hashed_password", None)
    updated_user.pop("_id", None)
    
    return updated_user


@router.post("/upload-picture")
async def upload_profile_picture(
    file: UploadFile = File(...),
    current_user: UserInDB = Depends(get_current_active_user),
    db = Depends(get_database)
):
    """Upload profile picture"""
    # Validate file type
    allowed_types = ["image/jpeg", "image/jpg", "image/png", "image/webp"]
    if file.content_type not in allowed_types:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only JPG, PNG, and WebP images are allowed"
        )
    
    # Validate file size (max 5MB)
    file.file.seek(0, 2)
    file_size = file.file.tell()
    file.file.seek(0)
    
    if file_size > 5 * 1024 * 1024:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File size must be less than 5MB"
        )
    
    # Generate unique filename
    file_extension = file.filename.split(".")[-1]
    new_filename = f"user_{current_user.id}_{current_user.username}.{file_extension}"
    file_path = UPLOAD_DIR / new_filename
    
    # Save file
    try:
        with file_path.open("wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error saving file: {str(e)}"
        )
    
    # Update user profile with image URL
    profile_picture_url = f"/uploads/profile_pictures/{new_filename}"
    
    await db.users.update_one(
        {"id": current_user.id},
        {"$set": {"profile_picture": profile_picture_url}}
    )
    
    return {
        "message": "Profile picture uploaded successfully",
        "profile_picture": profile_picture_url
    }


@router.delete("/delete-picture")
async def delete_profile_picture(
    current_user: UserInDB = Depends(get_current_active_user),
    db = Depends(get_database)
):
    """Delete profile picture"""
    user = await db.users.find_one({"id": current_user.id})
    
    if user and user.get("profile_picture"):
        # Delete file from disk
        file_path = Path(".") / user["profile_picture"].lstrip("/")
        if file_path.exists():
            file_path.unlink()
        
        # Update database
        await db.users.update_one(
            {"id": current_user.id},
            {"$set": {"profile_picture": None}}
        )
    
    return {"message": "Profile picture deleted successfully"}
