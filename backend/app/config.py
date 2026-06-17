import os
from pydantic_settings import BaseSettings
from dotenv import load_dotenv

# Load .env file manually in case it is not automatically loaded
load_dotenv(dotenv_path=os.path.join(os.path.dirname(os.path.dirname(__file__)), ".env"))

class Settings(BaseSettings):
    PORT: int = 8000
    GEMINI_API_KEY: str | None = None
    SUPABASE_URL: str | None = None
    SUPABASE_KEY: str | None = None
    DATABASE_URL: str = "sqlite:///./travel_planner.db"

    class Config:
        env_file = ".env"
        extra = "ignore"

settings = Settings()
