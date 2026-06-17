# AI Travel Planner

A premium, full-stack AI-powered travel planner that generates personalized day-wise itineraries, optimizes budget allocations, and tracks travel expenses.

## Features

- **Personalized Day-Wise Itineraries**: AI generates schedules, attractions, hotels, and restaurant recommendations matching your preferences.
- **Budget Optimization**: Computes recommended spend breakdowns for Flights, Hotels, Food, and Activities.
- **Smart Expense Tracking**: Log expenses on the go, track overall & category budget progress, and view live warnings if limits are exceeded.
- **Weather Integration**: Feeds actual 7-day weather forecasts for the destination (powered by the free Open-Meteo API).
- **Packing Suggestions**: Generates customized gear checklists based on interests and location.
- **Saved Vault**: Store, review, and delete planned itineraries.
- **PDF Export**: Download pristine vector itineraries matching print layouts directly from the browser.

---

## Tech Stack

- **Frontend**: React (TypeScript), Vite, Vanilla CSS (Custom Glassmorphic Aesthetics, custom dark mode, micro-animations, fully responsive).
- **Backend**: FastAPI (Python), Uvicorn.
- **AI Planning Engine**: Google Gemini API (`gemini-2.5-flash` model, with a smart offline procedural planner fallback).
- **External APIs**: Open-Meteo API (Free Geocoding & Weather Forecast, no key required).
- **Database**: Supabase PostgreSQL client (with SQLAlchemy SQLite local database fallback for instant local testing).

---

## Getting Started

### 1. Database Setup (Supabase)

If you are using Supabase for persistence:
1. Go to your Supabase project dashboard.
2. Open the **SQL Editor**.
3. Create a new query, then copy and paste the contents of `backend/schema.sql`.
4. Click **Run** to generate the `trips` and `expenses` tables, along with developer public access policies.
5. Retrieve your **Project URL** and **Anon Key** from Project Settings -> API.

*If you do not set up Supabase, the backend automatically creates and uses a local SQLite database (`backend/travel_planner.db`) at startup so the app is instantly functional.*

### 2. Backend Setup (FastAPI)

1. Open your terminal in the `backend` folder.
2. Create and activate a python virtual environment:
   ```bash
   python -m venv venv
   # On Windows:
   .\venv\Scripts\activate
   # On macOS/Linux:
   source venv/bin/activate
   ```
3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
4. Copy the environment template:
   ```bash
   cp .env.example .env
   ```
5. *(Optional)* Edit `.env` to include your Supabase and Gemini credentials:
   ```env
   # Add your Google Gemini API key to activate live LLM planning
   GEMINI_API_KEY=your_gemini_api_key_here

   # Add your Supabase project keys to switch storage from SQLite to Supabase Cloud
   SUPABASE_URL=your_supabase_url_here
   SUPABASE_KEY=your_supabase_anon_key_here
   ```
6. Run the backend server:
   ```bash
   uvicorn app.main:app --reload --port 8000
   ```
   *The Swagger API docs will be active at http://localhost:8000/docs*

### 3. Frontend Setup (React)

1. Open your terminal in the `frontend` folder.
2. Install dependencies:
   ```bash
   npm install
   ```
3. Run the development server:
   ```bash
   npm run dev
   ```
4. Open your browser to the URL shown in your terminal (usually `http://localhost:5173`).

---

## File Structure

```
ai-travel-planner/
├── backend/
│   ├── app/
│   │   ├── __init__.py
│   │   ├── main.py            # API routes and CORS config
│   │   ├── config.py          # Pydantic environment configurations
│   │   ├── database.py        # SQLite SQLAlchemy engine configuration
│   │   ├── models.py          # SQLAlchemy tables for Trip & Expense
│   │   ├── schemas.py         # Pydantic validators & response schemas
│   │   └── services/
│   │       ├── __init__.py
│   │       ├── ai_planner.py  # Gemini connector + Offline Procedural Planner
│   │       ├── weather.py     # Open-Meteo Weather API integration
│   │       └── db_service.py  # Unified DB service routing SQLite & Supabase
│   ├── requirements.txt       # Python packages
│   ├── schema.sql             # SQL table declarations for Supabase
│   └── .env                   # Local settings configurations
└── frontend/
    ├── src/
    │   ├── App.tsx            # Main application router and state manager
    │   ├── index.css          # Design system & print rules (Glassmorphism)
    │   ├── types.ts           # Typescript data declarations
    │   ├── components/        # Isolated visual widgets
    │   │   ├── Navbar.tsx
    │   │   ├── TripForm.tsx
    │   │   ├── ItineraryDetails.tsx
    │   │   ├── BudgetBreakdown.tsx
    │   │   ├── ExpenseTracker.tsx
    │   │   └── WeatherCard.tsx
    │   └── services/
    │       └── api.ts         # Client communication wrapper
    ├── index.html
    └── package.json
```
