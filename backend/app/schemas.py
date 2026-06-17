from pydantic import BaseModel, Field
from datetime import datetime
from typing import List, Dict, Any, Optional

# Expense Schemas
class ExpenseBase(BaseModel):
    title: str
    amount: float
    category: str      # e.g., "travel", "hotel", "food", "activity", "other"
    date: str          # YYYY-MM-DD

class ExpenseCreate(ExpenseBase):
    pass

class ExpenseResponse(ExpenseBase):
    id: str
    trip_id: str
    created_at: datetime

    class Config:
        from_attributes = True

# Weather Structure (returned by weather service / merged in itinerary)
class WeatherDay(BaseModel):
    date: str          # YYYY-MM-DD
    temp_max: float
    temp_min: float
    condition: str

# Activity Structure inside Itinerary
class ActivityDetail(BaseModel):
    time: str          # e.g., "09:00 AM"
    name: str
    description: str
    cost: float
    completed: bool = False   # NEW: user can mark as done
    rating: Optional[int] = None  # NEW: 1-5 star rating

# Day Itinerary structure
class ItineraryDay(BaseModel):
    day: int
    theme: str
    activities: List[ActivityDetail]
    hotel_recommendation: Optional[str] = None
    restaurant_recommendation: List[str] = []
    daily_budget_estimate: float
    notes: Optional[str] = None   # NEW: user personal notes per day

# Full Planning schema
class ItineraryStructure(BaseModel):
    destination: str
    duration: int
    budget_allocation: Dict[str, float]
    days: List[ItineraryDay]
    packing_recommendations: List[str]
    smart_suggestions: List[str]
    weather_forecast: List[WeatherDay] = []

# Input Schema for generating a trip
class TripGenerateInput(BaseModel):
    source: str
    destination: str
    start_date: str    # YYYY-MM-DD
    duration: int = Field(..., ge=1, le=14)
    budget: float = Field(..., gt=0)
    interests: List[str]

# NEW: Input for regenerating a single day
class DayRegenerateInput(BaseModel):
    destination: str
    day_number: int
    duration: int
    budget: float
    interests: List[str]
    start_date: str

# NEW: Input for updating an entire saved itinerary
class ItineraryUpdateInput(BaseModel):
    itinerary: Dict[str, Any]

# Database Trip schemas
class TripBase(BaseModel):
    source: str
    destination: str
    start_date: str
    duration: int
    budget: float
    interests: List[str]

class TripCreate(TripBase):
    itinerary: Dict[str, Any]

class TripResponse(TripBase):
    id: str
    user_id: Optional[str] = None
    itinerary: Dict[str, Any]
    created_at: datetime
    expenses: List[ExpenseResponse] = []

    class Config:
        from_attributes = True

# Authentication & User Schemas
class UserCreate(BaseModel):
    email: str
    password: str

class UserLogin(BaseModel):
    email: str
    password: str

class UserResponse(BaseModel):
    id: str
    email: str
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class TokenResponse(BaseModel):
    access_token: str
    token_type: str
    user: UserResponse

