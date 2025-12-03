from fastapi import APIRouter, Body, Depends, HTTPException, status
from typing import List
from datetime import datetime
from database import get_database
from models.review import ReviewCreate, Review, ReviewInDB, ReplyCreate, Reply
from models.counter import get_next_sequence_value
from auth import get_current_active_user
from models.user import UserInDB
from utils import serialize_doc, serialize_docs
from routes.notifications import notify_new_review, notify_review_response

router = APIRouter(prefix="/api/reviews", tags=["reviews"])


@router.post("/", response_model=Review, status_code=status.HTTP_201_CREATED)
async def create_review(
    review: ReviewCreate,
    current_user: UserInDB = Depends(get_current_active_user),
    db = Depends(get_database)
):
    """Create a new review"""
    # Verify business exists
    business = await db.businesses.find_one({"id": review.business_id})
    if not business:
        raise HTTPException(status_code=404, detail="Business not found")
    
    # Check if user already reviewed this business
    existing_review = await db.reviews.find_one({
        "business_id": review.business_id,
        "user_id": str(current_user.id)
    })
    if existing_review:
        raise HTTPException(
            status_code=400,
            detail="Ya has dejado una reseña en este negocio"
        )
    
    # Create review
    review_dict = review.model_dump()
    review_dict["user_id"] = str(current_user.id)
    review_dict["user_name"] = current_user.full_name
    review_dict["username"] = current_user.username if hasattr(current_user, 'username') else None
    review_dict["profile_picture"] = current_user.profile_picture if hasattr(current_user, 'profile_picture') else None
    review_dict["helpful_count"] = 0
    review_dict["replies"] = []
    review_dict["created_at"] = datetime.utcnow()
    review_dict["updated_at"] = datetime.utcnow()
    
    # Get next sequential ID
    next_id = await get_next_sequence_value("reviews", db)
    review_dict["id"] = next_id
    
    await db.reviews.insert_one(review_dict)
    
    # Update business rating
    await update_business_rating(review.business_id, db)
    
    created_review = await db.reviews.find_one({"id": next_id})
    if not created_review:
        raise HTTPException(status_code=500, detail="Failed to create review")
    
    created_review = serialize_doc(created_review)
    
    # Ensure id is int
    if isinstance(created_review.get("id"), str):
        created_review["id"] = int(created_review["id"])
    
    # Send notification to business owner
    await notify_new_review(
        review_id=next_id,
        business_id=review.business_id,
        business_name=business["name"],
        business_owner_id=int(business["owner_id"]),
        user_name=current_user.full_name,
        rating=review.rating,
        db=db
    )
    
    return Review(**created_review)


@router.get("/business/{business_id}", response_model=List[Review])
async def get_business_reviews(
    business_id: int,
    skip: int = 0,
    limit: int = 20,
    db = Depends(get_database)
):
    """Get all reviews for a business"""
    cursor = db.reviews.find({"business_id": business_id}).sort("created_at", -1).skip(skip).limit(limit)
    reviews = await cursor.to_list(length=limit)
    reviews = serialize_docs(reviews)
    
    # Ensure all reviews have replies field
    for review in reviews:
        if "replies" not in review:
            review["replies"] = []
    
    return [Review(**r) for r in reviews]


@router.get("/user/my-reviews", response_model=List[Review])
async def get_my_reviews(
    current_user: UserInDB = Depends(get_current_active_user),
    db = Depends(get_database)
):
    """Get all reviews by current user"""
    user_id = str(current_user.id) if hasattr(current_user, 'id') else str(current_user._id)
    cursor = db.reviews.find({"user_id": user_id}).sort("created_at", -1)
    reviews = await cursor.to_list(length=100)
    reviews = serialize_docs(reviews)
    
    # Ensure all reviews have replies field
    for review in reviews:
        if "replies" not in review:
            review["replies"] = []
    
    return [Review(**r) for r in reviews]


@router.put("/{review_id}", response_model=Review)
async def update_review(
    review_id: int,
    review_update: ReviewCreate,
    current_user: UserInDB = Depends(get_current_active_user),
    db = Depends(get_database)
):
    """Update a review (only by author)"""
    existing_review = await db.reviews.find_one({"id": review_id})
    if not existing_review:
        raise HTTPException(status_code=404, detail="Review not found")
    
    if existing_review["user_id"] != str(current_user.id):
        raise HTTPException(status_code=403, detail="Not authorized to update this review")
    
    update_data = review_update.model_dump()
    update_data["updated_at"] = datetime.utcnow()
    
    await db.reviews.update_one(
        {"id": review_id},
        {"$set": update_data}
    )
    
    # Update business rating
    await update_business_rating(existing_review["business_id"], db)
    
    updated_review = await db.reviews.find_one({"id": review_id})
    updated_review = serialize_doc(updated_review)
    return Review(**updated_review)


@router.delete("/{review_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_review(
    review_id: int,
    current_user: UserInDB = Depends(get_current_active_user),
    db = Depends(get_database)
):
    """Delete a review (only by author)"""
    existing_review = await db.reviews.find_one({"id": review_id})
    if not existing_review:
        raise HTTPException(status_code=404, detail="Review not found")
    
    if existing_review["user_id"] != str(current_user.id):
        raise HTTPException(status_code=403, detail="Not authorized to delete this review")
    
    business_id = existing_review["business_id"]
    await db.reviews.delete_one({"id": review_id})
    
    # Update business rating
    await update_business_rating(business_id, db)
    
    return None


@router.post("/{review_id}/helpful", status_code=status.HTTP_200_OK)
async def mark_review_helpful(
    review_id: int,
    current_user: UserInDB = Depends(get_current_active_user),
    db = Depends(get_database)
):
    """Mark a review as helpful"""
    result = await db.reviews.update_one(
        {"id": review_id},
        {"$inc": {"helpful_count": 1}}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Review not found")
    
    return {"message": "Review marked as helpful"}


@router.post("/{review_id}/replies", response_model=Review, status_code=status.HTTP_201_CREATED)
async def create_reply(
    review_id: int,
    reply: ReplyCreate,
    current_user: UserInDB = Depends(get_current_active_user),
    db = Depends(get_database)
):
    """Create a reply to a review"""
    # Verify review exists
    review = await db.reviews.find_one({"id": review_id})
    if not review:
        raise HTTPException(status_code=404, detail="Review not found")
    
    # Get next reply ID (use review_id + reply count for uniqueness)
    next_reply_id = await get_next_sequence_value("replies", db)
    
    # Create reply
    new_reply = {
        "id": next_reply_id,
        "user_id": str(current_user.id),
        "user_name": current_user.full_name,
        "username": current_user.username if hasattr(current_user, 'username') else None,
        "profile_picture": current_user.profile_picture if hasattr(current_user, 'profile_picture') else None,
        "text": reply.text,
        "created_at": datetime.utcnow()
    }
    
    # Add reply to review
    await db.reviews.update_one(
        {"id": review_id},
        {
            "$push": {"replies": new_reply},
            "$set": {"updated_at": datetime.utcnow()}
        }
    )
    
    # Get updated review
    updated_review = await db.reviews.find_one({"id": review_id})
    updated_review = serialize_doc(updated_review)
    
    # Ensure id is int
    if isinstance(updated_review.get("id"), str):
        updated_review["id"] = int(updated_review["id"])
    
    # Send notification to review author (if replier is not the same person)
    if str(current_user.id) != review.get("user_id"):
        business = await db.businesses.find_one({"id": review.get("business_id")})
        if business:
            await notify_review_response(
                review_id=review_id,
                user_id=int(review.get("user_id")),
                business_name=business["name"],
                responder_name=current_user.full_name,
                db=db
            )
    
    return Review(**updated_review)


@router.post("/{review_id}/replies/{reply_id}/replies", response_model=Reply)
async def create_nested_reply(
    review_id: int,
    reply_id: int,
    reply_text: str = Body(..., embed=True),
    current_user: UserInDB = Depends(get_current_active_user),
    db = Depends(get_database)
):
    """Create a reply to a reply (nested reply)"""
    review = await db.reviews.find_one({"id": review_id})
    if not review:
        raise HTTPException(status_code=404, detail="Review not found")
    
    # Helper function to find and add nested reply recursively
    def add_nested_reply_recursive(replies_list, target_id, new_reply):
        for reply in replies_list:
            if reply["id"] == target_id:
                if "replies" not in reply:
                    reply["replies"] = []
                reply["replies"].append(new_reply)
                return True
            # Check nested replies
            if "replies" in reply and reply["replies"]:
                if add_nested_reply_recursive(reply["replies"], target_id, new_reply):
                    return True
        return False
    
    # Get next reply ID - usar el mismo contador que las respuestas directas
    next_id = await get_next_sequence_value("replies", db)
    
    # Create new nested reply
    new_reply = {
        "id": next_id,
        "user_id": str(current_user.id),
        "user_name": current_user.full_name,
        "username": current_user.username if hasattr(current_user, 'username') else None,
        "profile_picture": current_user.profile_picture if hasattr(current_user, 'profile_picture') else None,
        "text": reply_text,
        "created_at": datetime.utcnow(),
        "replies": []
    }
    
    # Find parent reply and add nested reply
    replies_list = review.get("replies", [])
    if not add_nested_reply_recursive(replies_list, reply_id, new_reply):
        raise HTTPException(status_code=404, detail="Parent reply not found")
    
    # Update review with modified replies
    await db.reviews.update_one(
        {"id": review_id},
        {
            "$set": {
                "replies": replies_list,
                "updated_at": datetime.utcnow()
            }
        }
    )
    
    return Reply(**new_reply)


@router.delete("/{review_id}/replies/{reply_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_reply(
    review_id: int,
    reply_id: int,
    current_user: UserInDB = Depends(get_current_active_user),
    db = Depends(get_database)
):
    """Delete a reply (only by author) - works recursively for nested replies"""
    review = await db.reviews.find_one({"id": review_id})
    if not review:
        raise HTTPException(status_code=404, detail="Review not found")
    
    # Helper function to find reply recursively
    def find_reply_recursive(replies_list, target_id):
        for reply in replies_list:
            if reply["id"] == target_id:
                return reply
            # Check nested replies
            if "replies" in reply and reply["replies"]:
                found = find_reply_recursive(reply["replies"], target_id)
                if found:
                    return found
        return None
    
    # Helper function to remove reply recursively
    def remove_reply_recursive(replies_list, target_id):
        for i, reply in enumerate(replies_list):
            if reply["id"] == target_id:
                replies_list.pop(i)
                return True
            # Check nested replies
            if "replies" in reply and reply["replies"]:
                if remove_reply_recursive(reply["replies"], target_id):
                    return True
        return False
    
    # Find the reply to verify ownership
    replies_list = review.get("replies", [])
    reply_to_delete = find_reply_recursive(replies_list, reply_id)
    
    if not reply_to_delete:
        raise HTTPException(status_code=404, detail="Reply not found")
    
    # Check if user is the author
    if reply_to_delete["user_id"] != str(current_user.id):
        raise HTTPException(status_code=403, detail="Not authorized to delete this reply")
    
    # Remove reply recursively
    if remove_reply_recursive(replies_list, reply_id):
        # Update review with modified replies
        await db.reviews.update_one(
            {"id": review_id},
            {
                "$set": {
                    "replies": replies_list,
                    "updated_at": datetime.utcnow()
                }
            }
        )
    else:
        raise HTTPException(status_code=404, detail="Reply not found")
    
    return None


async def update_business_rating(business_id: int, db):
    """Helper function to recalculate business rating"""
    pipeline = [
        {"$match": {"business_id": business_id}},
        {"$group": {
            "_id": "$business_id",
            "avg_rating": {"$avg": "$rating"},
            "count": {"$sum": 1}
        }}
    ]
    
    result = await db.reviews.aggregate(pipeline).to_list(length=1)
    
    if result:
        await db.businesses.update_one(
            {"id": business_id},
            {"$set": {
                "rating": round(result[0]["avg_rating"], 1),
                "review_count": result[0]["count"]
            }}
        )
    else:
        await db.businesses.update_one(
            {"id": business_id},
            {"$set": {"rating": 0.0, "review_count": 0}}
        )
