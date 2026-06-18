from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from typing import List
from app.database import engine, Base, get_db
from app import schemas, models
from app.services import ai_planner, db_service, auth

# Create local SQLite tables if they do not exist
Base.metadata.create_all(bind=engine)

app = FastAPI(title="AI Travel Planner API", version="2.1.0")

# Setup CORS middleware to allow connection from React local dev frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)



security = HTTPBearer()

def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security), db: Session = Depends(get_db)):
    token = credentials.credentials
    payload = auth.decode_access_token(token)
    if not payload or "sub" not in payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )
    email = payload.get("sub")
    user = db_service.get_user_by_email(db, email)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found or credentials expired",
        )
    return user

# AUTHENTICATION ENDPOINTS

@app.post("/api/auth/register", response_model=schemas.TokenResponse)
def register(user_in: schemas.UserCreate, db: Session = Depends(get_db)):
    existing = db_service.get_user_by_email(db, user_in.email)
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered."
        )
    try:
        hashed = auth.hash_password(user_in.password)
        new_user = db_service.create_user(db, user_in.email, hashed)
        token = auth.create_access_token({"sub": new_user.email})
        return {
            "access_token": token,
            "token_type": "bearer",
            "user": new_user
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Registration failed: {str(e)}"
        )

@app.post("/api/auth/login", response_model=schemas.TokenResponse)
def login(user_in: schemas.UserLogin, db: Session = Depends(get_db)):
    user = db_service.get_user_by_email(db, user_in.email)
    if not user or not auth.verify_password(user_in.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password."
        )
    token = auth.create_access_token({"sub": user.email})
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": user
    }

@app.get("/api/auth/me", response_model=schemas.UserResponse)
def read_current_user(current_user: models.User = Depends(get_current_user)):
    return current_user

# TRIP & ITINERARY ENDPOINTS

@app.post("/api/trips/generate", response_model=schemas.ItineraryStructure)
async def generate_trip_itinerary(input_data: schemas.TripGenerateInput, current_user: models.User = Depends(get_current_user)):
    try:
        itinerary = await ai_planner.generate_itinerary(input_data)
        return itinerary
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Itinerary generation failed: {str(e)}"
        )

@app.post("/api/trips/regenerate-day", response_model=schemas.ItineraryDay)
async def regenerate_day(input_data: schemas.DayRegenerateInput, current_user: models.User = Depends(get_current_user)):
    try:
        day = await ai_planner.regenerate_single_day(input_data)
        return day
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Day regeneration failed: {str(e)}"
        )

@app.post("/api/trips/", response_model=schemas.TripResponse)
def save_trip(trip_in: schemas.TripCreate, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    try:
        new_trip = db_service.create_trip(db, trip_in, current_user.id)
        return new_trip
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Could not save trip to database: {str(e)}"
        )

@app.get("/api/trips/", response_model=List[schemas.TripResponse])
def get_all_trips(db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    try:
        return db_service.list_trips(db, current_user.id)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch saved trips: {str(e)}"
        )

@app.get("/api/trips/{trip_id}", response_model=schemas.TripResponse)
def get_trip_details(trip_id: str, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    trip = db_service.get_trip(db, trip_id, current_user.id)
    if not trip:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Trip with ID {trip_id} not found or access denied."
        )
    return trip

@app.put("/api/trips/{trip_id}/itinerary", response_model=schemas.TripResponse)
def update_trip_itinerary(trip_id: str, update_in: schemas.ItineraryUpdateInput, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    updated_trip = db_service.update_trip_itinerary(db, trip_id, update_in.itinerary, current_user.id)
    if not updated_trip:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Trip with ID {trip_id} not found or access denied."
        )
    return updated_trip

@app.delete("/api/trips/{trip_id}")
def delete_trip_record(trip_id: str, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    success = db_service.delete_trip(db, trip_id, current_user.id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Trip with ID {trip_id} not found or access denied."
        )
    return {"message": "Trip successfully deleted."}

# EXPENSE ENDPOINTS

@app.post("/api/trips/{trip_id}/expenses", response_model=schemas.ExpenseResponse)
def add_trip_expense(trip_id: str, expense_in: schemas.ExpenseCreate, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    trip = db_service.get_trip(db, trip_id, current_user.id)
    if not trip:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Trip with ID {trip_id} not found or access denied."
        )
    try:
        new_expense = db_service.add_expense(db, trip_id, expense_in)
        return new_expense
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Could not add expense to database: {str(e)}"
        )

@app.delete("/api/expenses/{expense_id}")
def delete_trip_expense(expense_id: str, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    # Verify the expense exists and belongs to a trip owned by the current user
    # First get the expense
    expense = db.query(models.Expense).filter(models.Expense.id == expense_id).first()
    if not expense:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Expense with ID {expense_id} not found."
        )
    trip = db_service.get_trip(db, expense.trip_id, current_user.id)
    if not trip:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied to this trip expense."
        )
    
    success = db_service.delete_expense(db, expense_id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Expense with ID {expense_id} not found."
        )
    return {"message": "Expense successfully deleted."}
