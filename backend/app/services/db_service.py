from sqlalchemy.orm import Session
from app import models, schemas
from app.config import settings
from supabase import create_client, Client
from typing import List, Dict, Any, Optional

# Setup Supabase client if key & url are available
_supabase_client: Optional[Client] = None
if settings.SUPABASE_URL and settings.SUPABASE_KEY:
    try:
        _supabase_client = create_client(settings.SUPABASE_URL, settings.SUPABASE_KEY)
        print("Connected successfully to Supabase Database.")
    except Exception as e:
        print(f"Failed to connect to Supabase: {e}")

def get_supabase() -> Optional[Client]:
    return _supabase_client

# USER OPERATIONS

def get_user_by_email(db: Session, email: str) -> Optional[models.User]:
    supabase = get_supabase()
    if not supabase:
        raise Exception("Supabase connection not initialized.")
    try:
        res = supabase.table("users").select("*").eq("email", email).execute()
        if res.data:
            u = res.data[0]
            return models.User(
                id=u["id"],
                email=u["email"],
                hashed_password=u["hashed_password"]
            )
    except Exception as e:
        print(f"Supabase get_user_by_email error: {e}")
        raise e
    return None

def create_user(db: Session, email: str, hashed_pw: str) -> models.User:
    supabase = get_supabase()
    if not supabase:
        raise Exception("Supabase connection not initialized.")
    try:
        res = supabase.table("users").insert({
            "email": email,
            "hashed_password": hashed_pw
        }).execute()
        if res.data:
            u = res.data[0]
            return models.User(id=u["id"], email=u["email"], hashed_password=u["hashed_password"])
    except Exception as e:
        print(f"Supabase create_user error: {e}")
        raise e
    raise Exception("Could not create user in Supabase.")

# TRIP OPERATIONS

def create_trip(db: Session, trip_in: schemas.TripCreate, user_id: str) -> Dict[str, Any]:
    supabase = get_supabase()
    if supabase:
        try:
            response = supabase.table("trips").insert({
                "user_id": user_id,
                "source": trip_in.source,
                "destination": trip_in.destination,
                "start_date": trip_in.start_date,
                "duration": trip_in.duration,
                "budget": trip_in.budget,
                "interests": trip_in.interests,
                "itinerary": trip_in.itinerary
            }).execute()
            if response.data:
                res_data = response.data[0]
                res_data["expenses"] = []
                return res_data
        except Exception as e:
            print(f"Supabase create_trip error: {e}. Falling back to SQLite.")

    db_trip = models.Trip(
        user_id=user_id,
        source=trip_in.source,
        destination=trip_in.destination,
        start_date=trip_in.start_date,
        duration=trip_in.duration,
        budget=trip_in.budget,
        interests=trip_in.interests,
        itinerary=trip_in.itinerary
    )
    db.add(db_trip)
    db.commit()
    db.refresh(db_trip)
    return {
        "id": db_trip.id,
        "user_id": db_trip.user_id,
        "source": db_trip.source,
        "destination": db_trip.destination,
        "start_date": db_trip.start_date,
        "duration": db_trip.duration,
        "budget": db_trip.budget,
        "interests": db_trip.interests,
        "itinerary": db_trip.itinerary,
        "created_at": db_trip.created_at,
        "expenses": []
    }

def get_trip(db: Session, trip_id: str, user_id: str) -> Optional[Dict[str, Any]]:
    supabase = get_supabase()
    if supabase:
        try:
            trip_res = supabase.table("trips").select("*").eq("id", trip_id).eq("user_id", user_id).execute()
            if trip_res.data:
                trip_data = trip_res.data[0]
                expenses_res = supabase.table("expenses").select("*").eq("trip_id", trip_id).execute()
                trip_data["expenses"] = expenses_res.data or []
                return trip_data
            return None
        except Exception as e:
            print(f"Supabase get_trip error: {e}. Falling back to SQLite.")

    db_trip = db.query(models.Trip).filter(models.Trip.id == trip_id, models.Trip.user_id == user_id).first()
    if db_trip:
        return {
            "id": db_trip.id,
            "user_id": db_trip.user_id,
            "source": db_trip.source,
            "destination": db_trip.destination,
            "start_date": db_trip.start_date,
            "duration": db_trip.duration,
            "budget": db_trip.budget,
            "interests": db_trip.interests,
            "itinerary": db_trip.itinerary,
            "created_at": db_trip.created_at,
            "expenses": [
                {
                    "id": exp.id,
                    "trip_id": exp.trip_id,
                    "title": exp.title,
                    "amount": exp.amount,
                    "category": exp.category,
                    "date": exp.date,
                    "created_at": exp.created_at
                } for exp in db_trip.expenses
            ]
        }
    return None

def list_trips(db: Session, user_id: str) -> List[Dict[str, Any]]:
    supabase = get_supabase()
    if supabase:
        try:
            response = supabase.table("trips").select("*").eq("user_id", user_id).order("created_at", desc=True).execute()
            trips_list = response.data or []
            for t in trips_list:
                t["expenses"] = []
            return trips_list
        except Exception as e:
            print(f"Supabase list_trips error: {e}. Falling back to SQLite.")

    db_trips = db.query(models.Trip).filter(models.Trip.user_id == user_id).order_by(models.Trip.created_at.desc()).all()
    return [
        {
            "id": trip.id,
            "user_id": trip.user_id,
            "source": trip.source,
            "destination": trip.destination,
            "start_date": trip.start_date,
            "duration": trip.duration,
            "budget": trip.budget,
            "interests": trip.interests,
            "itinerary": trip.itinerary,
            "created_at": trip.created_at,
            "expenses": []
        } for trip in db_trips
    ]

def delete_trip(db: Session, trip_id: str, user_id: str) -> bool:
    supabase = get_supabase()
    if supabase:
        try:
            supabase.table("trips").delete().eq("id", trip_id).eq("user_id", user_id).execute()
            return True
        except Exception as e:
            print(f"Supabase delete_trip error: {e}. Falling back to SQLite.")

    db_trip = db.query(models.Trip).filter(models.Trip.id == trip_id, models.Trip.user_id == user_id).first()
    if db_trip:
        db.delete(db_trip)
        db.commit()
        return True
    return False

# NEW: Update saved itinerary (for user edits)
def update_trip_itinerary(db: Session, trip_id: str, new_itinerary: Dict[str, Any], user_id: str) -> Optional[Dict[str, Any]]:
    supabase = get_supabase()
    if supabase:
        try:
            response = supabase.table("trips").update({"itinerary": new_itinerary}).eq("id", trip_id).eq("user_id", user_id).execute()
            if response.data:
                return get_trip(db, trip_id, user_id)
        except Exception as e:
            print(f"Supabase update_trip_itinerary error: {e}. Falling back to SQLite.")

    db_trip = db.query(models.Trip).filter(models.Trip.id == trip_id, models.Trip.user_id == user_id).first()
    if db_trip:
        db_trip.itinerary = new_itinerary
        db.commit()
        db.refresh(db_trip)
        return get_trip(db, trip_id, user_id)
    return None

# EXPENSE OPERATIONS

def add_expense(db: Session, trip_id: str, expense_in: schemas.ExpenseCreate) -> Dict[str, Any]:
    supabase = get_supabase()
    if supabase:
        try:
            response = supabase.table("expenses").insert({
                "trip_id": trip_id,
                "title": expense_in.title,
                "amount": expense_in.amount,
                "category": expense_in.category,
                "date": expense_in.date
            }).execute()
            if response.data:
                return response.data[0]
        except Exception as e:
            print(f"Supabase add_expense error: {e}. Falling back to SQLite.")

    db_expense = models.Expense(
        trip_id=trip_id,
        title=expense_in.title,
        amount=expense_in.amount,
        category=expense_in.category,
        date=expense_in.date
    )
    db.add(db_expense)
    db.commit()
    db.refresh(db_expense)
    return {
        "id": db_expense.id,
        "trip_id": db_expense.trip_id,
        "title": db_expense.title,
        "amount": db_expense.amount,
        "category": db_expense.category,
        "date": db_expense.date,
        "created_at": db_expense.created_at
    }

def delete_expense(db: Session, expense_id: str) -> bool:
    supabase = get_supabase()
    if supabase:
        try:
            supabase.table("expenses").delete().eq("id", expense_id).execute()
            return True
        except Exception as e:
            print(f"Supabase delete_expense error: {e}. Falling back to SQLite.")

    db_expense = db.query(models.Expense).filter(models.Expense.id == expense_id).first()
    if db_expense:
        db.delete(db_expense)
        db.commit()
        return True
    return False
