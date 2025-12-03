from fastapi import APIRouter, Depends, HTTPException, status, Request
from typing import List, Optional
from datetime import datetime, timedelta
import random
import re
import logging
from database import get_database
from models.trip import TripCreate, Trip, TripInDB, TripActivity, TripWithUser, TripVisibility, TripAutoGenerateRequest, BudgetLevel
from models.counter import get_next_sequence_value
from auth import get_current_active_user, get_optional_current_user
from models.user import UserInDB
from utils import serialize_doc, serialize_docs
from routes.notifications import notify_trip_collaborator

router = APIRouter(prefix="/api/trips", tags=["trips"])
logger = logging.getLogger("uvicorn.error")


async def get_current_user_optional(request: Request, db = Depends(get_database)) -> Optional[UserInDB]:
    """Get current user if authenticated, None otherwise"""
    try:
        return await get_current_active_user(request, db)
    except:
        return None


async def can_user_view_trip(trip_visibility: str, trip_user_id: str, current_user: UserInDB = None, db = None) -> bool:
    """Check if current user can view a trip based on its visibility"""
    # Default to public if visibility is not set (for backward compatibility)
    if not trip_visibility:
        trip_visibility = TripVisibility.public
    
    if trip_visibility == TripVisibility.public:
        return True
    
    if not current_user:
        return False
    
    # Get current user ID as string
    current_user_id = str(current_user.id) if hasattr(current_user, 'id') else str(current_user._id)
    
    # User can always see their own trips
    if current_user_id == trip_user_id:
        return True
    
    if trip_visibility == TripVisibility.followers:
        # Check if current user follows the trip owner
        follow = await db.followers.find_one({
            "follower_id": current_user_id,
            "following_id": trip_user_id
        })
        return follow is not None
    
    # Private trips can only be seen by the owner
    return False


@router.post("/", response_model=Trip, status_code=status.HTTP_201_CREATED)
async def create_trip(
    trip: TripCreate,
    current_user: UserInDB = Depends(get_current_active_user),
    db = Depends(get_database)
):
    """Create a new trip"""
    trip_dict = trip.model_dump()
    
    # Convert date strings to datetime objects for MongoDB compatibility
    if isinstance(trip_dict["start_date"], str):
        trip_dict["start_date"] = datetime.fromisoformat(trip_dict["start_date"])
    if isinstance(trip_dict["end_date"], str):
        trip_dict["end_date"] = datetime.fromisoformat(trip_dict["end_date"])
    
    # Validate dates (compare only dates, not datetime)
    today = datetime.now().date()
    start_date = trip_dict["start_date"].date() if hasattr(trip_dict["start_date"], 'date') else trip_dict["start_date"]
    end_date = trip_dict["end_date"].date() if hasattr(trip_dict["end_date"], 'date') else trip_dict["end_date"]
    
    if start_date < today:
        raise HTTPException(
            status_code=400,
            detail="La fecha de inicio debe ser igual o posterior a hoy"
        )
    
    if end_date < today:
        raise HTTPException(
            status_code=400,
            detail="La fecha de fin debe ser igual o posterior a hoy"
        )
    
    if end_date < start_date:
        raise HTTPException(
            status_code=400,
            detail="La fecha de fin debe ser posterior o igual a la fecha de inicio"
        )
    
    trip_dict["user_id"] = str(current_user.id)
    trip_dict["activities"] = []
    trip_dict["collaborators"] = []
    trip_dict["created_at"] = datetime.utcnow()
    trip_dict["updated_at"] = datetime.utcnow()
    
    # Get next sequential ID
    next_id = await get_next_sequence_value("trips", db)
    trip_dict["id"] = next_id
    
    await db.trips.insert_one(trip_dict)
    created_trip = await db.trips.find_one({"id": next_id})
    created_trip = serialize_doc(created_trip)
    
    return Trip(**created_trip)


@router.get("/", response_model=List[Trip])
async def get_my_trips(
    current_user: UserInDB = Depends(get_current_active_user),
    db = Depends(get_database)
):
    """Get all trips for current user (owned + collaborating)"""
    user_id = str(current_user.id) if hasattr(current_user, 'id') else str(current_user._id)
    
    # Get trips where user is owner OR collaborator
    query = {
        "$or": [
            {"user_id": user_id},  # Trips owned by user
            {"collaborators": user_id}  # Trips where user is collaborator
        ]
    }
    
    cursor = db.trips.find(query).sort("start_date", -1)
    trips = await cursor.to_list(length=100)
    trips = serialize_docs(trips)
    
    return [Trip(**t) for t in trips]


@router.get("/public", response_model=List[TripWithUser])
async def get_public_trips(
    current_user: Optional[UserInDB] = Depends(get_current_user_optional),
    db = Depends(get_database),
    skip: int = 0,
    limit: int = 20
):
    """Get trips visible to current user (public + followers' trips)"""
    current_user_id = str(current_user.id) if current_user else None
    
    # Get list of users current user follows (if authenticated)
    following_ids = []
    if current_user_id:
        cursor = db.followers.find({"follower_id": current_user_id})
        following = await cursor.to_list(length=1000)
        following_ids = [f["following_id"] for f in following]
        following_ids.append(current_user_id)  # Include own trips
    
    # Build query for trips that user can see
    if current_user_id:
        # Authenticated user can see public trips, followers-only trips from followed users, and their own private trips
        query = {
            "$or": [
                {"visibility": TripVisibility.public},  # Public trips
                {
                    "$and": [
                        {"visibility": TripVisibility.followers},  # Followers-only trips
                        {"user_id": {"$in": following_ids}}  # From users they follow or themselves
                    ]
                },
                {
                    "$and": [
                        {"visibility": TripVisibility.private},  # Private trips
                        {"user_id": current_user_id}  # Only their own
                    ]
                }
            ]
        }
    else:
        # Unauthenticated users can only see public trips
        query = {"visibility": TripVisibility.public}
    
    cursor = db.trips.find(query).sort("created_at", -1).skip(skip).limit(limit)
    trips = await cursor.to_list(length=limit)
    
    trips_with_users = []
    for trip in trips:
        trip = serialize_doc(trip)
        
        # Get user info
        user = await db.users.find_one({"id": int(trip["user_id"])})
        if user:
            trip["user_name"] = user.get("full_name", "Usuario")
            trip["user_profile_picture"] = user.get("profile_picture")
            print(f"DEBUG: Public trip user {trip['user_id']} profile_picture: {trip['user_profile_picture']}")
        else:
            trip["user_name"] = "Usuario"
            trip["user_profile_picture"] = None
        
        # Get comments count
        comments = await db.trip_comments.find({"trip_id": trip["id"]}).to_list(length=100)
        trip["comments"] = [serialize_doc(c) for c in comments]
        
        # Get likes count
        likes_count = await db.trip_likes.count_documents({"trip_id": trip["id"]})
        trip["likes_count"] = likes_count
        
        trips_with_users.append(TripWithUser(**trip))
    
    return trips_with_users


@router.get("/user/{user_id}/public", response_model=List[Trip])
async def get_user_public_trips(
    user_id: str,
    current_user: UserInDB = Depends(get_current_active_user),
    db = Depends(get_database)
):
    """Get public trips for a specific user (visible to current user)"""
    current_user_id = str(current_user.id)
    
    # Check if current user can see this user's trips
    can_view = False
    if current_user_id == user_id:
        # User can see all their own trips
        can_view = True
    else:
        # Check if current user follows the target user
        follow = await db.followers.find_one({
            "follower_id": current_user_id,
            "following_id": user_id
        })
        can_view = follow is not None
    
    if not can_view:
        # If not following, only show public trips
        query = {
            "user_id": user_id,
            "visibility": TripVisibility.public
        }
    else:
        # If following, show public and followers-only trips
        query = {
            "user_id": user_id,
            "visibility": {"$in": [TripVisibility.public, TripVisibility.followers]}
        }
    
    cursor = db.trips.find(query).sort("created_at", -1)
    trips = await cursor.to_list(length=100)
    trips = serialize_docs(trips)
    
    return [Trip(**t) for t in trips]


@router.get("/{trip_id}", response_model=Trip)
async def get_trip(
    trip_id: int,
    current_user: UserInDB = Depends(get_current_active_user),
    db = Depends(get_database)
):
    """Get a specific trip"""
    trip = await db.trips.find_one({"id": trip_id})
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")
    
    user_id = str(current_user.id) if hasattr(current_user, 'id') else str(current_user._id)
    collaborators = trip.get("collaborators", [])
    if trip["user_id"] != user_id and user_id not in collaborators:
        raise HTTPException(status_code=403, detail="Not authorized to view this trip")
    
    trip = serialize_doc(trip)
    
    # Enrich activities with business images and location
    if trip.get("activities"):
        for activity in trip["activities"]:
            business_id = activity.get("business_id")
            logger.info(f"[GET_TRIP] Enriching activity business_id={business_id}, name={activity.get('business_name')}")
            if business_id:
                business = await db.businesses.find_one({"id": int(business_id)})
                if business:
                    logger.info(f"[GET_TRIP] Raw business data keys: {list(business.keys())}")
                    images = business.get("images", [])
                    cats = business.get("categories", [])
                    logger.info(f"[GET_TRIP] Business images field: {images}")
                    logger.info(f"[GET_TRIP] Business categories field: {cats}")
                    activity["business_images"] = images
                    activity["categories"] = cats
                    logger.info(f"[GET_TRIP] Activity after enrichment - business_images: {activity.get('business_images')}, categories: {activity.get('categories')}")
                    # Add location from business
                    if business.get("location"):
                        loc = business["location"]
                        logger.info(f"[GET_TRIP] Business location structure: {loc}")
                        activity["location"] = {
                            "address": loc.get("address", ""),
                            "city": loc.get("city", ""),
                            "lat": loc.get("coordinates", {}).get("lat") if loc.get("coordinates") else loc.get("latitude"),
                            "lng": loc.get("coordinates", {}).get("lng") if loc.get("coordinates") else loc.get("longitude")
                        }
                        logger.info(f"[GET_TRIP] Added location: {activity['location']}")
                else:
                    logger.warning(f"[GET_TRIP] Business not found for id={business_id}")
    
    return Trip(**trip)


@router.get("/{trip_id}/public", response_model=TripWithUser)
async def get_trip_public(
    trip_id: int,
    current_user: Optional[UserInDB] = Depends(get_optional_current_user),
    db = Depends(get_database)
):
    """Get a specific trip for public viewing (respects visibility settings)"""
    trip = await db.trips.find_one({"id": trip_id})
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")
    
    trip_data = serialize_doc(trip)
    trip_user_id = trip_data["user_id"]
    trip_visibility = trip_data.get("visibility", TripVisibility.public.value)
    
    # Check if current user can view this trip
    if not await can_user_view_trip(trip_visibility, trip_user_id, current_user, db):
        raise HTTPException(status_code=403, detail="Not authorized to view this trip")
    
    # Get user info
    user = await db.users.find_one({"id": int(trip_user_id)})
    if user:
        trip_data["user_name"] = user.get("full_name", "Usuario")
        trip_data["user_profile_picture"] = user.get("profile_picture")
    else:
        trip_data["user_name"] = "Usuario"
        trip_data["user_profile_picture"] = None
    
    # Get comments
    comments = await db.trip_comments.find({"trip_id": trip_id}).sort("created_at", -1).to_list(length=100)
    trip_data["comments"] = [serialize_doc(c) for c in comments]
    
    # Get likes count
    likes_count = await db.trip_likes.count_documents({"trip_id": trip_id})
    trip_data["likes_count"] = likes_count
    
    # Enrich activities with business images and location
    if trip_data.get("activities"):
        for activity in trip_data["activities"]:
            business_id = activity.get("business_id")
            logger.info(f"[GET_TRIP_PUBLIC] Enriching activity business_id={business_id}")
            if business_id:
                business = await db.businesses.find_one({"id": int(business_id)})
                if business:
                    images = business.get("images", [])
                    cats = business.get("categories", [])
                    activity["business_images"] = images
                    activity["categories"] = cats
                    logger.info(f"[GET_TRIP_PUBLIC] Found business: images={len(images)}, categories={cats}")
                    # Add location from business
                    if business.get("location"):
                        activity["location"] = {
                            "address": business["location"].get("address", ""),
                            "city": business["location"].get("city", ""),
                            "lat": business["location"].get("coordinates", {}).get("lat"),
                            "lng": business["location"].get("coordinates", {}).get("lng")
                        }
                else:
                    logger.warning(f"[GET_TRIP_PUBLIC] Business not found for id={business_id}")
    
    return TripWithUser(**trip_data)


@router.put("/{trip_id}", response_model=Trip)
async def update_trip(
    trip_id: int,
    trip_update: TripCreate,
    current_user: UserInDB = Depends(get_current_active_user),
    db = Depends(get_database)
):
    """Update a trip"""
    existing_trip = await db.trips.find_one({"id": trip_id})
    if not existing_trip:
        raise HTTPException(status_code=404, detail="Trip not found")
    
    user_id = str(current_user.id)
    collaborators = existing_trip.get("collaborators", [])
    if existing_trip["user_id"] != user_id and user_id not in collaborators:
        raise HTTPException(status_code=403, detail="Not authorized to update this trip")
    
    update_data = trip_update.model_dump()
    
    # Convert date strings to datetime objects for MongoDB compatibility
    if isinstance(update_data["start_date"], str):
        update_data["start_date"] = datetime.fromisoformat(update_data["start_date"])
    if isinstance(update_data["end_date"], str):
        update_data["end_date"] = datetime.fromisoformat(update_data["end_date"])
    
    # Validate dates (compare only dates, not datetime)
    today = datetime.now().date()
    start_date = update_data["start_date"].date() if hasattr(update_data["start_date"], 'date') else update_data["start_date"]
    end_date = update_data["end_date"].date() if hasattr(update_data["end_date"], 'date') else update_data["end_date"]
    
    if start_date < today:
        raise HTTPException(
            status_code=400,
            detail="La fecha de inicio debe ser igual o posterior a hoy"
        )
    
    if end_date < today:
        raise HTTPException(
            status_code=400,
            detail="La fecha de fin debe ser igual o posterior a hoy"
        )
    
    if end_date < start_date:
        raise HTTPException(
            status_code=400,
            detail="La fecha de fin debe ser posterior o igual a la fecha de inicio"
        )
    
    update_data["updated_at"] = datetime.utcnow()
    
    await db.trips.update_one(
        {"id": trip_id},
        {"$set": update_data}
    )
    
    updated_trip = await db.trips.find_one({"id": trip_id})
    updated_trip = serialize_doc(updated_trip)
    return Trip(**updated_trip)


@router.delete("/{trip_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_trip(
    trip_id: int,
    current_user: UserInDB = Depends(get_current_active_user),
    db = Depends(get_database)
):
    """Delete a trip"""
    existing_trip = await db.trips.find_one({"id": trip_id})
    if not existing_trip:
        raise HTTPException(status_code=404, detail="Trip not found")
    
    if existing_trip["user_id"] != str(current_user.id):
        raise HTTPException(status_code=403, detail="Not authorized to delete this trip")
    
    await db.trips.delete_one({"id": trip_id})
    return None


@router.post("/{trip_id}/activities", response_model=Trip)
async def add_activity_to_trip(
    trip_id: int,
    activity: TripActivity,
    current_user: UserInDB = Depends(get_current_active_user),
    db = Depends(get_database)
):
    """Add an activity to a trip"""
    trip = await db.trips.find_one({"id": trip_id})
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")
    
    user_id = str(current_user.id)
    collaborators = trip.get("collaborators", [])
    if trip["user_id"] != user_id and user_id not in collaborators:
        raise HTTPException(status_code=403, detail="Not authorized to modify this trip")
    
    # Validate activity date is within trip dates
    trip_start = trip["start_date"]
    trip_end = trip["end_date"]
    
    if isinstance(trip_start, str):
        trip_start = datetime.fromisoformat(trip_start.replace('Z', '+00:00'))
    if isinstance(trip_end, str):
        trip_end = datetime.fromisoformat(trip_end.replace('Z', '+00:00'))
    
    # Only validate if scheduled_date is provided
    if activity.scheduled_date:
        activity_date = activity.scheduled_date.date() if hasattr(activity.scheduled_date, 'date') else activity.scheduled_date
        trip_start_date = trip_start.date() if hasattr(trip_start, 'date') else trip_start
        trip_end_date = trip_end.date() if hasattr(trip_end, 'date') else trip_end
        
        if activity_date < trip_start_date or activity_date > trip_end_date:
            raise HTTPException(
                status_code=400, 
                detail=f"La fecha de la actividad debe estar entre {trip_start_date.strftime('%d/%m/%Y')} y {trip_end_date.strftime('%d/%m/%Y')}"
            )
    
    # Verify business exists
    business = await db.businesses.find_one({"id": activity.business_id})
    if not business:
        raise HTTPException(status_code=404, detail="Business not found")
    
    # Enrich activity with business location data
    activity_dict = activity.model_dump()
    business_location = business.get("location", {})
    activity_dict["location"] = {
        "address": business_location.get("address"),
        "city": business_location.get("city"),
        "lat": business_location.get("latitude"),
        "lng": business_location.get("longitude")
    }
    
    await db.trips.update_one(
        {"id": trip_id},
        {
            "$push": {"activities": activity_dict},
            "$set": {"updated_at": datetime.utcnow()}
        }
    )
    
    updated_trip = await db.trips.find_one({"id": trip_id})
    updated_trip = serialize_doc(updated_trip)
    return Trip(**updated_trip)


@router.delete("/{trip_id}/activities/{business_id}", response_model=Trip)
async def remove_activity_from_trip(
    trip_id: int,
    business_id: int,
    current_user: UserInDB = Depends(get_current_active_user),
    db = Depends(get_database)
):
    """Remove an activity from a trip"""
    trip = await db.trips.find_one({"id": trip_id})
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")
    
    user_id = str(current_user.id)
    collaborators = trip.get("collaborators", [])
    if trip["user_id"] != user_id and user_id not in collaborators:
        raise HTTPException(status_code=403, detail="Not authorized to modify this trip")
    
    await db.trips.update_one(
        {"id": trip_id},
        {
            "$pull": {"activities": {"business_id": business_id}},
            "$set": {"updated_at": datetime.utcnow()}
        }
    )
    
    updated_trip = await db.trips.find_one({"id": trip_id})
    updated_trip = serialize_doc(updated_trip)
    return Trip(**updated_trip)


@router.put("/{trip_id}/activities/{business_id}", response_model=Trip)
async def update_activity_in_trip(
    trip_id: int,
    business_id: int,
    activity_update: dict,
    current_user: UserInDB = Depends(get_current_active_user),
    db = Depends(get_database)
):
    """Update an activity in a trip (scheduled_date, notes)"""
    trip = await db.trips.find_one({"id": trip_id})
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")
    
    user_id = str(current_user.id)
    collaborators = trip.get("collaborators", [])
    if trip["user_id"] != user_id and user_id not in collaborators:
        raise HTTPException(status_code=403, detail="Not authorized to modify this trip")
    
    # Validate scheduled_date if provided
    if "scheduled_date" in activity_update:
        trip_start = trip["start_date"]
        trip_end = trip["end_date"]
        
        if isinstance(trip_start, str):
            trip_start = datetime.fromisoformat(trip_start.replace('Z', '+00:00'))
        if isinstance(trip_end, str):
            trip_end = datetime.fromisoformat(trip_end.replace('Z', '+00:00'))
        
        scheduled_date = activity_update["scheduled_date"]
        if isinstance(scheduled_date, str):
            scheduled_date = datetime.fromisoformat(scheduled_date.replace('Z', '+00:00'))
        
        scheduled_date_only = scheduled_date.date() if hasattr(scheduled_date, 'date') else scheduled_date
        trip_start_date = trip_start.date() if hasattr(trip_start, 'date') else trip_start
        trip_end_date = trip_end.date() if hasattr(trip_end, 'date') else trip_end
        
        if scheduled_date_only < trip_start_date or scheduled_date_only > trip_end_date:
            raise HTTPException(
                status_code=400,
                detail=f"La fecha de la actividad debe estar entre {trip_start_date.strftime('%d/%m/%Y')} y {trip_end_date.strftime('%d/%m/%Y')}"
            )
    
    # Build update query for the specific activity
    update_query = {}
    if "scheduled_date" in activity_update:
        # Convert string to datetime if needed
        scheduled_date = activity_update["scheduled_date"]
        if isinstance(scheduled_date, str):
            scheduled_date = datetime.fromisoformat(scheduled_date.replace('Z', '+00:00'))
        update_query["activities.$.scheduled_date"] = scheduled_date
    
    if "notes" in activity_update:
        update_query["activities.$.notes"] = activity_update["notes"]
    
    if "images" in activity_update:
        update_query["activities.$.images"] = activity_update["images"]
    
    if not update_query:
        raise HTTPException(status_code=400, detail="No valid fields to update")
    
    update_query["updated_at"] = datetime.utcnow()
    
    # Update the specific activity in the array
    result = await db.trips.update_one(
        {"id": trip_id, "activities.business_id": business_id},
        {"$set": update_query}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Activity not found in trip")
    
    updated_trip = await db.trips.find_one({"id": trip_id})
    updated_trip = serialize_doc(updated_trip)
    return Trip(**updated_trip)


@router.post("/{trip_id}/comments", response_model=dict)
async def add_comment_to_trip(
    trip_id: int,
    comment_data: dict,
    current_user: UserInDB = Depends(get_current_active_user),
    db = Depends(get_database)
):
    """Add a comment to a trip"""
    comment = comment_data.get("comment", "").strip()
    if not comment:
        raise HTTPException(status_code=400, detail="Comment cannot be empty")
    
    trip = await db.trips.find_one({"id": trip_id})
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")
    
    trip_data = serialize_doc(trip)
    trip_user_id = trip_data["user_id"]
    
    # Check if user can view this trip
    if not await can_user_view_trip(trip_data["visibility"], trip_user_id, current_user, db):
        raise HTTPException(status_code=403, detail="Cannot comment on this trip")
    
    comment_doc = {
        "trip_id": trip_id,
        "user_id": str(current_user.id),
        "user_name": current_user.full_name,
        "comment": comment,
        "created_at": datetime.utcnow()
    }
    
    await db.trip_comments.insert_one(comment_doc)
    
    return {"message": "Comment added successfully", "comment": comment_doc}


@router.get("/my-liked-trips", response_model=dict)
async def get_my_liked_trips(
    current_user: UserInDB = Depends(get_current_active_user),
    db = Depends(get_database)
):
    """Get all trip IDs liked by current user"""
    likes = await db.trip_likes.find({"user_id": str(current_user.id)}).to_list(None)
    liked_trip_ids = [like["trip_id"] for like in likes]
    
    return {"liked_trip_ids": liked_trip_ids}


@router.post("/{trip_id}/like", status_code=status.HTTP_201_CREATED)
async def like_trip(
    trip_id: int,
    current_user: UserInDB = Depends(get_current_active_user),
    db = Depends(get_database)
):
    """Like a public trip and add to favorites"""
    print(f"DEBUG: Liking trip {trip_id} for user {current_user.id}")
    
    trip = await db.trips.find_one({"id": trip_id})
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")
    
    trip_data = serialize_doc(trip)
    trip_user_id = trip_data["user_id"]
    
    # Check if user can view this trip
    if not await can_user_view_trip(trip_data["visibility"], trip_user_id, current_user, db):
        raise HTTPException(status_code=403, detail="Cannot like this trip")
    
    # Check if already liked
    existing_like = await db.trip_likes.find_one({
        "trip_id": trip_id,
        "user_id": str(current_user.id)
    })
    
    if existing_like:
        # If already liked, just ensure it's in favorites too
        print(f"DEBUG: Trip {trip_id} already liked, ensuring it's in favorites")
        user = await db.users.find_one({"id": current_user.id})
        if user:
            favorite_trips = user.get("favorite_trips", [])
            if trip_id not in favorite_trips:
                favorite_trips.append(trip_id)
                await db.users.update_one(
                    {"id": current_user.id},
                    {"$set": {"favorite_trips": favorite_trips}}
                )
                print(f"DEBUG: Added existing like {trip_id} to favorites for user {current_user.id}")
        return {"message": "Trip already liked and added to favorites"}
    
    # Add like
    await db.trip_likes.insert_one({
        "trip_id": trip_id,
        "user_id": str(current_user.id),
        "created_at": datetime.utcnow()
    })
    
    # Also add to favorites
    print(f"DEBUG: About to add trip {trip_id} to favorites for user {current_user.id}")
    user = await db.users.find_one({"id": current_user.id})
    print(f"DEBUG: Found user: {user is not None}")
    if user:
        favorite_trips = user.get("favorite_trips", [])
        print(f"DEBUG: Current favorite_trips: {favorite_trips}")
        if trip_id not in favorite_trips:
            favorite_trips.append(trip_id)
            print(f"DEBUG: Updating favorite_trips to: {favorite_trips}")
            await db.users.update_one(
                {"id": current_user.id},
                {"$set": {"favorite_trips": favorite_trips}}
            )
            print(f"DEBUG: Added trip {trip_id} to favorites for user {current_user.id}")
        else:
            print(f"DEBUG: Trip {trip_id} already in favorites for user {current_user.id}")
    
    return {"message": "Trip liked and added to favorites successfully"}


@router.post("/generate", response_model=Trip, status_code=status.HTTP_201_CREATED)
async def generate_trip(
    req: TripAutoGenerateRequest,
    current_user: UserInDB = Depends(get_current_active_user),
    db = Depends(get_database)
):
    logger.info(f"[GENERATE] Starting with name={req.name}, budget={req.budget}, activities_per_day={req.activities_per_day}, cities={len(req.cities)}")
    if not req.cities:
        raise HTTPException(status_code=400, detail="Debe ingresar al menos una ciudad")
    
    # Validate dates
    today = datetime.now().date()
    for city_block in req.cities:
        if city_block.start_date.date() < today:
            raise HTTPException(status_code=400, detail="La fecha de inicio debe ser igual o posterior a hoy")
        if city_block.end_date.date() < today:
            raise HTTPException(status_code=400, detail="La fecha de fin debe ser igual o posterior a hoy")
        if city_block.end_date.date() < city_block.start_date.date():
            raise HTTPException(status_code=400, detail="La fecha de fin debe ser igual o posterior a la fecha de inicio")

    def budget_range(b: BudgetLevel):
        if b == BudgetLevel.bajo:
            return 1, 2
        if b == BudgetLevel.medio:
            return 2, 3
        return 3, 4

    min_pl, max_pl = budget_range(req.budget)
    logger.info(f"[GENERATE] Budget {req.budget} -> price_level {min_pl}-{max_pl}")

    overall_start = min(c.start_date for c in req.cities)
    overall_end = max(c.end_date for c in req.cities)
    
    logger.info(f"[GENERATE] Date range calculated: start={overall_start}, end={overall_end}")
    logger.info(f"[GENERATE] Individual cities: {[(c.city, c.start_date, c.end_date) for c in req.cities]}")

    destination = req.cities[0].city if len(req.cities) == 1 else "Multi-ciudad"

    # Build automatic description from city names (ordered, no duplicates)
    city_names_ordered = []
    seen_city_keys = set()
    for c in req.cities:
        name = (c.city or "").strip()
        key = name.lower()
        if name and key not in seen_city_keys:
            seen_city_keys.add(key)
            city_names_ordered.append(name)
    cities_label = ", ".join(city_names_ordered) if city_names_ordered else destination
    auto_description = f"Viaje a {cities_label} generado por explorerhub"

    activities: List[TripActivity] = []
    used_activity_ids = set()
    used_restaurant_ids = set()

    def city_regex(name: str):
        return {"$regex": f"^{re.escape(name)}$", "$options": "i"}

    async def pick_one_hotels(city: str):
        cursor = db.businesses.find({
            "categories": {"$in": ["Alojamiento", "Accommodation", "Hotel"]},
            "location.city": city_regex(city),
            "price_level": {"$gte": min_pl, "$lte": max_pl}
        }).sort("rating", -1).limit(10)
        hotels = await cursor.to_list(length=10)
        return random.choice(hotels) if hotels else None

    async def list_by_categories(city: str, cats: List[str], limit: int = 200):
        # Trae TODAS las opciones de categorías sin filtrar por precio.
        cursor = db.businesses.find({
            "categories": {"$in": cats},
            "location.city": city_regex(city),
        }).limit(limit)
        return await cursor.to_list(length=limit)

    activity_cats = [
        "Actividad", "Atracción", "Entretenimiento", "Cultural", "Naturaleza", "Histórico", "Familiar", "Compras", "Vida Nocturna", "Bienestar"
    ]

    for city_block in req.cities:
        city_name = city_block.city
        start_date = city_block.start_date
        end_date = city_block.end_date
        logger.info(f"[GENERATE] Processing city {city_name} from {start_date.date()} to {end_date.date()}")
        if end_date < start_date:
            raise HTTPException(status_code=400, detail=f"Rango de fechas inválido para {city_name}")

        hotel = await pick_one_hotels(city_name)
        if hotel:
            logger.info(f"[GENERATE] Found hotel: {hotel.get('name')} (id={hotel.get('id')})")
            activities.append(TripActivity(
                business_id=hotel.get("id"),
                business_name=hotel.get("name"),
                scheduled_date=start_date,
                notes="Alojamiento"
            ))
        else:
            logger.warning(f"[GENERATE] No hotels found for {city_name}")

        candidates_acts = await list_by_categories(city_name, activity_cats, 200)
        candidates_rest = await list_by_categories(city_name, ["Restaurante", "Restaurant"], 200)
        logger.info(f"[GENERATE] Found {len(candidates_acts)} total activities and {len(candidates_rest)} total restaurants for {city_name}")

        # Particionar según rango de presupuesto para priorizar (in-range primero, luego más caro, luego más barato)
        def partition(items):
            in_range = []
            higher = []
            lower = []
            for it in items:
                pl = it.get("price_level")
                if pl is None:
                    # Sin price_level -> tratar como in_range (neutral)
                    in_range.append(it)
                elif min_pl <= pl <= max_pl:
                    in_range.append(it)
                elif pl > max_pl:
                    higher.append(it)
                else:
                    lower.append(it)
            return in_range, higher, lower

        in_range_acts, higher_acts, lower_acts = partition(candidates_acts)
        in_range_rests, higher_rests, lower_rests = partition(candidates_rest)

        day = start_date
        while day.date() <= end_date.date():
            # Construir pools disponibles (únicos) cada día - filtrar por lo ya usado
            avail_in_range_acts = [a for a in in_range_acts if a.get("id") not in used_activity_ids]
            avail_higher_acts = [a for a in higher_acts if a.get("id") not in used_activity_ids]
            avail_lower_acts = [a for a in lower_acts if a.get("id") not in used_activity_ids]

            random.shuffle(avail_in_range_acts)
            random.shuffle(avail_higher_acts)
            random.shuffle(avail_lower_acts)

            # Combinar todas las opciones disponibles en orden de prioridad
            all_available = avail_in_range_acts + avail_higher_acts + avail_lower_acts
            
            selected_count = 0
            for a in all_available:
                if selected_count >= req.activities_per_day:
                    break
                # Verificar nuevamente que no se haya usado (por si acaso)
                if a.get("id") not in used_activity_ids:
                    activities.append(TripActivity(
                        business_id=a.get("id"),
                        business_name=a.get("name"),
                        scheduled_date=day
                    ))
                    used_activity_ids.add(a.get("id"))
                    selected_count += 1
                    
                    # Log cuando escalamos fuera del rango
                    pl = a.get("price_level")
                    if pl is not None and pl > max_pl and selected_count == 1:
                        logger.info(f"[GENERATE] Using higher price activity in {city_name} for day {day.date()}")
                    elif pl is not None and pl < min_pl and selected_count == 1:
                        logger.info(f"[GENERATE] Using lower price activity in {city_name} for day {day.date()}")

            # Restaurantes: prioridad in-range, luego más caro, luego más barato (sin repetir)
            avail_in_range_rests = [r for r in in_range_rests if r.get("id") not in used_restaurant_ids]
            avail_higher_rests = [r for r in higher_rests if r.get("id") not in used_restaurant_ids]
            avail_lower_rests = [r for r in lower_rests if r.get("id") not in used_restaurant_ids]

            random.shuffle(avail_in_range_rests)
            random.shuffle(avail_higher_rests)
            random.shuffle(avail_lower_rests)

            # Combinar todas las opciones en orden de prioridad
            all_available_rests = avail_in_range_rests + avail_higher_rests + avail_lower_rests
            
            if all_available_rests:
                chosen_rest = all_available_rests[0]
                pl = chosen_rest.get("price_level")
                
                # Log cuando escalamos fuera del rango
                if pl is not None and pl > max_pl:
                    logger.info(f"[GENERATE] Using higher price restaurant in {city_name} for day {day.date()}")
                elif pl is not None and pl < min_pl:
                    logger.info(f"[GENERATE] Using lower price restaurant in {city_name} for day {day.date()}")
                
                activities.append(TripActivity(
                    business_id=chosen_rest.get("id"),
                    business_name=chosen_rest.get("name"),
                    scheduled_date=day,
                    notes="Restaurante"
                ))
                used_restaurant_ids.add(chosen_rest.get("id"))

            day = day + timedelta(days=1)

    trip_dict = {
        "name": req.name,
        "destination": destination,
        "start_date": overall_start,
        "end_date": overall_end,
        "description": auto_description,
        "visibility": req.visibility,
        "user_id": str(current_user.id),
        "activities": [a.model_dump() for a in activities],
        "collaborators": [],
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow(),
    }

    next_id = await get_next_sequence_value("trips", db)
    trip_dict["id"] = next_id
    
    logger.info(f"[GENERATE] Creating trip id={next_id}, name={trip_dict['name']}, {len(activities)} activities")
    await db.trips.insert_one(trip_dict)
    created = await db.trips.find_one({"id": next_id})
    if not created:
        logger.error(f"[GENERATE] ERROR: Trip id={next_id} not found after insertion!")
        raise HTTPException(status_code=500, detail="Error al crear el viaje")
    created = serialize_doc(created)
    logger.info(f"[GENERATE] SUCCESS: Trip created with id={created.get('id')}")
    return Trip(**created)


@router.post("/{trip_id}/collaborators", response_model=dict)
async def add_collaborator(
    trip_id: int,
    collaborator_data: dict,
    current_user: UserInDB = Depends(get_current_active_user),
    db = Depends(get_database)
):
    """Add a collaborator to a trip (only owner can do this)"""
    trip = await db.trips.find_one({"id": trip_id})
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")
    
    user_id = str(current_user.id)
    if trip["user_id"] != user_id:
        raise HTTPException(status_code=403, detail="Only the trip owner can add collaborators")
    
    collaborator_id = collaborator_data.get("user_id")
    if not collaborator_id:
        raise HTTPException(status_code=400, detail="user_id is required")
    
    # Verify collaborator user exists
    collaborator = await db.users.find_one({"id": int(collaborator_id)})
    if not collaborator:
        raise HTTPException(status_code=404, detail="Collaborator user not found")
    
    # Get current collaborators list
    collaborators = trip.get("collaborators", [])
    
    # Check if already a collaborator
    if collaborator_id in collaborators:
        return {"message": "User is already a collaborator"}
    
    # Add collaborator
    collaborators.append(collaborator_id)
    await db.trips.update_one(
        {"id": trip_id},
        {"$set": {"collaborators": collaborators, "updated_at": datetime.utcnow()}}
    )
    
    # Send notification to collaborator
    owner = await db.users.find_one({"id": current_user.id})
    owner_name = owner.get("full_name", "Un usuario") if owner else "Un usuario"
    
    await notify_trip_collaborator(
        trip_id=trip_id,
        trip_name=trip.get("name", "un viaje"),
        owner_name=owner_name,
        collaborator_user_id=int(collaborator_id),
        db=db
    )
    
    return {"message": "Collaborator added successfully", "collaborator_id": collaborator_id}


@router.delete("/{trip_id}/collaborators/{collaborator_id}", response_model=dict)
async def remove_collaborator(
    trip_id: int,
    collaborator_id: str,
    current_user: UserInDB = Depends(get_current_active_user),
    db = Depends(get_database)
):
    """Remove a collaborator from a trip (only owner can do this)"""
    trip = await db.trips.find_one({"id": trip_id})
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")
    
    user_id = str(current_user.id)
    if trip["user_id"] != user_id:
        raise HTTPException(status_code=403, detail="Only the trip owner can remove collaborators")
    
    # Get current collaborators list
    collaborators = trip.get("collaborators", [])
    
    # Check if user is a collaborator
    if collaborator_id not in collaborators:
        raise HTTPException(status_code=404, detail="User is not a collaborator")
    
    # Remove collaborator
    collaborators.remove(collaborator_id)
    await db.trips.update_one(
        {"id": trip_id},
        {"$set": {"collaborators": collaborators, "updated_at": datetime.utcnow()}}
    )
    
    return {"message": "Collaborator removed successfully"}


@router.get("/{trip_id}/collaborators", response_model=List[dict])
async def get_collaborators(
    trip_id: int,
    current_user: UserInDB = Depends(get_current_active_user),
    db = Depends(get_database)
):
    """Get list of collaborators for a trip"""
    trip = await db.trips.find_one({"id": trip_id})
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")
    
    user_id = str(current_user.id)
    collaborators_ids = trip.get("collaborators", [])
    
    # Only owner and collaborators can see the collaborators list
    if trip["user_id"] != user_id and user_id not in collaborators_ids:
        raise HTTPException(status_code=403, detail="Not authorized to view collaborators")
    
    # Get collaborator details
    collaborators = []
    for collab_id in collaborators_ids:
        user = await db.users.find_one({"id": int(collab_id)})
        if user:
            user = serialize_doc(user)
            collaborators.append({
                "id": collab_id,
                "username": user.get("username", ""),
                "full_name": user.get("full_name", "Usuario"),
                "profile_picture": user.get("profile_picture")
            })
    
    return collaborators

