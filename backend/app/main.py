from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.routers import itinerary, chat

app = FastAPI(title="Manzil Travel Planner API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.FRONTEND_ORIGIN],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(itinerary.router)
app.include_router(chat.router)


@app.get("/health")
async def health():
    return {"status": "ok"}
