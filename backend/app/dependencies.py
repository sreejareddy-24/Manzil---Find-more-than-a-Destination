from fastapi import Header, HTTPException, status
from supabase import create_client, Client

from app.config import settings

# Service-role client: bypasses RLS, used for both verifying user tokens
# and writing trip data on the user's behalf. Server-side only.
supabase_admin = None
if settings.SUPABASE_URL and settings.SUPABASE_SERVICE_ROLE_KEY:
    try:
        supabase_admin = create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_ROLE_KEY)
    except Exception as e:
        print(f"Failed to initialize Supabase client: {e}")


async def get_current_user(authorization: str = Header(default=None)):
    """
    Expects `Authorization: Bearer <supabase_access_token>` (the token the
    frontend gets from `supabase.auth.getSession()`). Validates it against
    Supabase Auth and returns the authenticated user object, or raises 401.
    """
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing or malformed Authorization header",
        )

    if supabase_admin is None:
        # Fallback for demo: return a dummy user if not configured
        # Or check if we can simulate user. In real flow, we need supabase admin.
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Backend not connected to Supabase database. Add credentials to backend/.env",
        )

    token = authorization.split(" ", 1)[1]

    try:
        result = supabase_admin.auth.get_user(token)
    except Exception as exc:  # invalid/expired token, network error, etc.
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired session",
        ) from exc

    user = getattr(result, "user", None)
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired session",
        )

    return user


def get_supabase_admin() -> Client:
    if supabase_admin is None:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Backend not connected to Supabase database. Add credentials to backend/.env",
        )
    return supabase_admin

