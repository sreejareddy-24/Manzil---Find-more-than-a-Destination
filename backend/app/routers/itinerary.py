from typing import List
from fastapi import APIRouter, Depends, HTTPException, status

from app.models.schemas import ItineraryRequest, ItineraryResponse, ItineraryDay
from app.services.groq_service import generate_itinerary
from app.services.supabase_service import (
    save_itinerary,
    get_latest_trip,
    get_user_trips,
    update_trip_itinerary,
    delete_trip,
)
from app.dependencies import get_current_user

router = APIRouter(prefix="/api/itinerary", tags=["itinerary"])


@router.post("/generate", response_model=ItineraryResponse)
async def generate(request: ItineraryRequest, user=Depends(get_current_user)):
    """
    Takes the planner form payload, asks Groq for a structured day-by-day
    itinerary, saves the trip + days to Supabase under the authenticated
    user, and returns the saved itinerary (including its new trip_id).
    """
    try:
        raw_days = generate_itinerary(
            source=request.source,
            destination=request.destination,
            days=request.days,
            budget=request.budget,
            interests=request.interests,
        )
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=str(exc))
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY, detail=f"Groq request failed: {exc}"
        )

    total_cost = sum(float(d.get("estimated_cost", 0)) for d in raw_days)

    try:
        trip_id = save_itinerary(
            user_id=user.id,
            source=request.source,
            destination=request.destination,
            days=request.days,
            budget=request.budget if request.budget is not None else total_cost,
            interests=request.interests,
            itinerary=raw_days,
        )
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Generated itinerary but failed to save it: {exc}",
        )

    return ItineraryResponse(
        trip_id=trip_id,
        source=request.source,
        destination=request.destination,
        days=request.days,
        budget=request.budget if request.budget is not None else total_cost,
        total_estimated_cost=total_cost,
        interests=request.interests,
        itinerary=[ItineraryDay(**d) for d in raw_days],
    )


@router.get("/latest", response_model=ItineraryResponse)
async def latest(user=Depends(get_current_user)):
    """Returns the authenticated user's most recently generated trip, if any."""
    trip = get_latest_trip(user.id)
    if trip is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No trips found")

    itinerary = [
        ItineraryDay(
            day=d["day_number"],
            title=d["title"],
            location=d["location"],
            description=d["description"],
            start_time=d["start_time"],
            estimated_cost=d["estimated_cost"],
        )
        for d in trip["itinerary_days"]
    ]

    return ItineraryResponse(
        trip_id=trip["id"],
        source=trip.get("source"),
        destination=trip["destination"],
        days=trip["days"],
        budget=trip["budget"],
        total_estimated_cost=trip["total_estimated_cost"],
        interests=trip.get("interests") or [],
        itinerary=itinerary,
    )


@router.get("/list", response_model=List[ItineraryResponse])
async def list_trips(user=Depends(get_current_user)):
    """Returns all trips for the authenticated user, newest first."""
    trips = get_user_trips(user.id)
    out = []
    for trip in trips:
        itinerary = [
            ItineraryDay(
                day=d["day_number"],
                title=d["title"],
                location=d["location"],
                description=d["description"],
                start_time=d["start_time"],
                estimated_cost=d["estimated_cost"],
            )
            for d in trip["itinerary_days"]
        ]
        out.append(
            ItineraryResponse(
                trip_id=trip["id"],
                source=trip.get("source"),
                destination=trip["destination"],
                days=trip["days"],
                budget=trip["budget"],
                total_estimated_cost=trip["total_estimated_cost"],
                interests=trip.get("interests") or [],
                itinerary=itinerary,
            )
        )
    return out


@router.put("/{trip_id}", response_model=ItineraryResponse)
async def update(trip_id: str, request: List[ItineraryDay], user=Depends(get_current_user)):
    """Updates a trip's timeline days, re-inserting them under verification."""
    try:
        updated_itinerary = [
            {
                "day": d.day,
                "title": d.title,
                "location": d.location,
                "description": d.description,
                "start_time": d.start_time,
                "estimated_cost": d.estimated_cost,
            }
            for d in request
        ]
        trip = update_trip_itinerary(user.id, trip_id, updated_itinerary)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc))
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update itinerary: {exc}",
        )

    itinerary = [
        ItineraryDay(
            day=d["day_number"],
            title=d["title"],
            location=d["location"],
            description=d["description"],
            start_time=d["start_time"],
            estimated_cost=d["estimated_cost"],
        )
        for d in trip["itinerary_days"]
    ]

    return ItineraryResponse(
        trip_id=trip["id"],
        source=trip.get("source"),
        destination=trip["destination"],
        days=trip["days"],
        budget=trip["budget"],
        total_estimated_cost=trip["total_estimated_cost"],
        interests=trip.get("interests") or [],
        itinerary=itinerary,
    )


@router.delete("/{trip_id}")
async def delete(trip_id: str, user=Depends(get_current_user)):
    """Deletes the user's trip."""
    try:
        delete_trip(user.id, trip_id)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc))
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete trip: {exc}",
        )
    return {"status": "ok", "deleted_trip_id": trip_id}

