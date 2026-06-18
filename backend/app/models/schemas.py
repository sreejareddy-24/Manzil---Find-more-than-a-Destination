from typing import List, Optional
from pydantic import BaseModel, Field


class ItineraryRequest(BaseModel):
    """Payload sent from the Dashboard's trip-planning form."""

    source: Optional[str] = Field(default=None, description="Departure city")
    destination: str = Field(..., min_length=1, description="Trip destination")
    days: int = Field(..., ge=1, le=30, description="Trip length in days")
    budget: Optional[float] = Field(default=None, description="Total trip budget")
    interests: List[str] = Field(default_factory=list, description="Selected interest tags")


class ItineraryDay(BaseModel):
    """A single day's plan — matches the shape the Itinerary timeline UI expects."""

    day: int
    title: str
    location: str
    description: str
    start_time: str
    estimated_cost: float


class ItineraryResponse(BaseModel):
    """What the frontend receives back after a successful generation + save."""

    trip_id: str
    source: Optional[str] = None
    destination: str
    days: int
    budget: Optional[float] = None
    total_estimated_cost: float
    interests: List[str]
    itinerary: List[ItineraryDay]


class ChatMessageOut(BaseModel):
    """A single saved chat turn, as returned to the frontend."""

    id: str
    role: str  # "user" | "assistant"
    content: str
    created_at: str


class ChatRequest(BaseModel):
    """Payload sent each time the user submits a message in the chat UI."""

    message: str = Field(..., min_length=1, max_length=4000)


class ChatResponse(BaseModel):
    """The assistant's reply to a single ChatRequest."""

    reply: ChatMessageOut
