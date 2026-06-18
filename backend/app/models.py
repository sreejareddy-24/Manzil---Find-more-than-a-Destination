import uuid
from sqlalchemy import Column, String, Integer, Float, DateTime, ForeignKey, JSON
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    email = Column(String, unique=True, nullable=False, index=True)
    hashed_password = Column(String, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    trips = relationship("Trip", back_populates="user", cascade="all, delete-orphan")

class Trip(Base):
    __tablename__ = "trips"

    # Using string representation of UUID for SQLite and Supabase compatibility
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=True)
    source = Column(String, nullable=False)
    destination = Column(String, nullable=False)
    start_date = Column(String, nullable=False) # YYYY-MM-DD
    duration = Column(Integer, nullable=False)
    budget = Column(Float, nullable=False)
    interests = Column(JSON, nullable=False)     # E.g. ["adventure", "culture", "food"]
    itinerary = Column(JSON, nullable=False)     # Full generated itinerary details
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User", back_populates="trips")
    expenses = relationship("Expense", back_populates="trip", cascade="all, delete-orphan")

class Expense(Base):
    __tablename__ = "expenses"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    trip_id = Column(String, ForeignKey("trips.id", ondelete="CASCADE"), nullable=False)
    title = Column(String, nullable=False)
    amount = Column(Float, nullable=False)
    category = Column(String, nullable=False)   # E.g. "travel", "food", "hotel", "activity"
    date = Column(String, nullable=False)       # YYYY-MM-DD
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    trip = relationship("Trip", back_populates="expenses")

