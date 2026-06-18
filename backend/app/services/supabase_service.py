from typing import List, Optional

from app.dependencies import get_supabase_admin


def save_itinerary(
    user_id: str,
    source: Optional[str],
    destination: str,
    days: int,
    budget: float,
    interests: List[str],
    itinerary: List[dict],
) -> str:
    """
    Persists the trip and its day-by-day itinerary to Supabase using the
    service-role client (bypasses RLS; user_id is set explicitly from the
    verified JWT, not trusted from client input). Returns the new trip id.
    """
    supabase = get_supabase_admin()

    total_cost = sum(float(day.get("estimated_cost", 0)) for day in itinerary)

    trip_result = (
        supabase.table("trips")
        .insert(
            {
                "user_id": user_id,
                "source": source,
                "destination": destination,
                "days": days,
                "budget": budget,
                "total_estimated_cost": total_cost,
                "interests": interests,
            }
        )
        .execute()
    )

    trip_id = trip_result.data[0]["id"]

    day_rows = [
        {
            "trip_id": trip_id,
            "day_number": day["day"],
            "title": day["title"],
            "location": day["location"],
            "description": day["description"],
            "start_time": day["start_time"],
            "estimated_cost": day["estimated_cost"],
        }
        for day in itinerary
    ]

    supabase.table("itinerary_days").insert(day_rows).execute()

    return trip_id


def get_latest_trip(user_id: str) -> Optional[dict]:
    """Fetches the user's most recently created trip with its itinerary days, if any."""
    supabase = get_supabase_admin()

    trip_result = (
        supabase.table("trips")
        .select("*")
        .eq("user_id", user_id)
        .order("created_at", desc=True)
        .limit(1)
        .execute()
    )

    if not trip_result.data:
        return None

    trip = trip_result.data[0]

    days_result = (
        supabase.table("itinerary_days")
        .select("*")
        .eq("trip_id", trip["id"])
        .order("day_number", desc=False)
        .execute()
    )

    trip["itinerary_days"] = days_result.data
    return trip


def get_user_trips(user_id: str) -> List[dict]:
    """Fetches all trips for the user, including their itinerary days, ordered by created_at desc."""
    supabase = get_supabase_admin()

    trips_result = (
        supabase.table("trips")
        .select("*")
        .eq("user_id", user_id)
        .order("created_at", desc=True)
        .execute()
    )

    trips = trips_result.data
    for trip in trips:
        days_result = (
            supabase.table("itinerary_days")
            .select("*")
            .eq("trip_id", trip["id"])
            .order("day_number", desc=False)
            .execute()
        )
        trip["itinerary_days"] = days_result.data

    return trips


def update_trip_itinerary(user_id: str, trip_id: str, itinerary: List[dict]) -> dict:
    """
    Verifies ownership, replaces all itinerary days for the trip, and updates
    the trip's days and total_estimated_cost. Returns the updated trip.
    """
    supabase = get_supabase_admin()

    # Verify ownership
    trip_result = (
        supabase.table("trips")
        .select("*")
        .eq("id", trip_id)
        .eq("user_id", user_id)
        .execute()
    )
    if not trip_result.data:
        raise ValueError("Trip not found or access denied")

    total_cost = sum(float(day.get("estimated_cost", 0)) for day in itinerary)
    num_days = len(itinerary)

    # Delete existing itinerary days
    supabase.table("itinerary_days").delete().eq("trip_id", trip_id).execute()

    # Insert new itinerary days
    day_rows = [
        {
            "trip_id": trip_id,
            "day_number": day["day"],
            "title": day["title"],
            "location": day["location"],
            "description": day["description"],
            "start_time": day["start_time"],
            "estimated_cost": day["estimated_cost"],
        }
        for day in itinerary
    ]
    if day_rows:
        supabase.table("itinerary_days").insert(day_rows).execute()

    # Update trip metadata
    updated_trip_result = (
        supabase.table("trips")
        .update({
            "days": num_days,
            "total_estimated_cost": total_cost,
        })
        .eq("id", trip_id)
        .execute()
    )

    trip = updated_trip_result.data[0]
    trip["itinerary_days"] = day_rows
    return trip


def delete_trip(user_id: str, trip_id: str) -> None:
    """Verifies ownership and deletes the trip."""
    supabase = get_supabase_admin()

    # Verify ownership
    trip_result = (
        supabase.table("trips")
        .select("*")
        .eq("id", trip_id)
        .eq("user_id", user_id)
        .execute()
    )
    if not trip_result.data:
        raise ValueError("Trip not found or access denied")

    supabase.table("trips").delete().eq("id", trip_id).execute()

