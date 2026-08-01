# Manzil — AI Travel Planner

Manzil (منزل — "destination") is a full-stack AI travel planning app. Tell it where you're going, for how long, and what you're into — it generates a real, day-by-day itinerary with named attractions, restaurants, and activities, then helps you track budget, map your route, save favorites, and ask a trip-aware AI assistant follow-up questions.

Built with **React + Vite** on the frontend, **FastAPI** on the backend, **Groq** for LLM inference, and **Supabase** for auth and data storage.

---

## Features

- **AI Itinerary Generator** — Generates a complete multi-day itinerary (Morning/Afternoon/Evening/Night activities) using only real, named places — no "Local Museum" placeholders. Adapts to:
  - **Budget tier** (budget / mid-range / premium), which changes per-activity cost ceilings and the kind of stays and transport suggested
  - **Trip duration**, shifting from "must-see highlights" on short trips to neighbourhood-level, off-the-beaten-path exploration on longer ones
  - **Interests** — 18 supported themes (food, adventure, culture, nightlife, wellness, luxury, solo, family, etc.), each with its own generation rules
- **AI Travel Assistant** — A chat assistant that stays aware of your active trip (destination, budget, itinerary so far) and can surface structured, card-style recommendations (hotels, restaurants, activities, destinations) inline in the conversation.
- **Interactive Route Map** — Visualizes itinerary stops and routes on a Leaflet map.
- **Budget Tracker** — Log and categorize expenses against your trip.
- **Favorites** — Save destinations, hotels, restaurants, and activities for later.
- **Drag-and-drop itinerary editing** — Reorder or tweak generated days and activities.
- **Auth & per-user data** — Supabase Auth with Row Level Security, so every user only ever sees their own trips, expenses, favorites, and chat history.

---

## Tech Stack

| Layer      | Tech |
|------------|------|
| Frontend   | React 19, Vite, React Router, GSAP, Recharts, Leaflet, `@hello-pangea/dnd` |
| Backend    | FastAPI, Pydantic, Uvicorn |
| AI         | Groq API (`llama-3.3-70b-versatile`) |
| Database & Auth | Supabase (Postgres, Auth, Row Level Security) |

---

## Project Structure

```
Manzil/
├── backend/
│   ├── app/
│   │   ├── main.py              # FastAPI app entrypoint
│   │   ├── config.py            # Settings (env vars)
│   │   ├── dependencies.py      # Supabase client + auth dependency
│   │   ├── models/schemas.py    # Pydantic request/response models
│   │   ├── routers/             # itinerary, chat, profile endpoints
│   │   └── services/            # groq_service, chat_service, supabase_service
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── pages/                # Dashboard, Itinerary, ChatAssistant, Budget, RouteMap, Favorites, Profile, Settings, Login, Signup
│   │   ├── components/           # Sidebar, ProtectedRoute
│   │   ├── context/AuthContext.jsx
│   │   └── lib/                  # api.js, supabaseClient.js, currency.js, expenses.js, favorites.js
│   └── package.json
├── database/
│   ├── SETUP.sql                 # Full schema — run this one for a fresh setup
│   ├── schema.sql                # Trips & itinerary_days
│   ├── chat_schema.sql           # chat_messages
│   ├── expenses_schema.sql       # expenses
│   └── favorites_schema.sql      # favorites
└── README.md
```

---

## How It Works

1. **User submits a trip request** (source, destination, days, budget, interests) from the Dashboard.
2. **FastAPI** (`/api/itinerary/generate`) builds a structured prompt — budget tier rules, duration strategy, and per-interest directives are all composed dynamically — and sends it to **Groq**.
3. Groq returns strict JSON (real place names, mandatory time-of-day coverage, cost ceilings respected). The backend validates required fields, sorts activities by time period, and computes total cost.
4. The itinerary is saved to **Supabase** (`trips` + `itinerary_days`, RLS-scoped to the user) and returned to the frontend for display, editing, and mapping.
5. The **Chat Assistant** (`/api/chat/send`) keeps the last 20 turns plus the user's active trip as context on every message, so it can answer trip-specific questions and emit recommendation cards the UI renders inline.
6. **Budget** and **Favorites** pages read/write directly to Supabase from the frontend, protected by RLS policies — no backend round-trip needed for those.

---

## Getting Started

### Prerequisites
- Node.js 18+
- Python 3.11+
- A [Supabase](https://supabase.com) project
- A [Groq](https://console.groq.com) API key

### 1. Database setup
In your Supabase project → SQL Editor, run `database/SETUP.sql` (creates all tables: `trips`, `itinerary_days`, `chat_messages`, `expenses`, `favorites`, with RLS policies).

### 2. Backend setup
```bash
cd backend
python -m venv venv
source venv/bin/activate      # Windows: venv\Scripts\activate
pip install -r requirements.txt
```

Create a `.env` file in `backend/`:
```env
GROQ_API_KEY=your_groq_api_key
GROQ_MODEL=llama-3.3-70b-versatile
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your_supabase_service_role_key
FRONTEND_ORIGIN=http://localhost:5173
```

Run the API:
```bash
uvicorn app.main:app --reload --port 8000
```

### 3. Frontend setup
```bash
cd frontend
npm install
```

Create a `.env` file in `frontend/`:
```env
VITE_API_BASE_URL=http://localhost:8000
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

Run the dev server:
```bash
npm run dev
```

The app will be available at `http://localhost:5173`.

---

## API Overview

| Endpoint | Method | Description |
|---|---|---|
| `/api/itinerary/generate` | POST | Generate and save a new itinerary |
| `/api/itinerary/latest` | GET | Fetch the user's most recent trip |
| `/api/itinerary/list` | GET | List all trips for the user |
| `/api/itinerary/{trip_id}` | PUT | Update an itinerary's days/activities |
| `/api/itinerary/{trip_id}` | DELETE | Delete a trip |
| `/api/chat/send` | POST | Send a message to the AI assistant |
| `/api/chat/history` | GET | Fetch chat history |
| `/api/profile/stats` | GET | Fetch profile/trip statistics |
| `/health` | GET | Health check |

All endpoints except `/health` require a Supabase-issued JWT via `Authorization: Bearer <token>`.

---

## Notes

- Users can optionally supply their own Groq API key from the frontend (sent as an `X-Groq-Key` header), bypassing the server's default key.
- `FRONTEND_ORIGIN` / CORS currently defaults to `*` for ease of local development — lock this down before any public deployment.
