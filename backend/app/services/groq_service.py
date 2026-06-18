import json
from typing import List, Optional

from groq import Groq

from app.config import settings

_client = Groq(api_key=settings.GROQ_API_KEY)

SYSTEM_PROMPT = (
    "You are an expert travel planner who designs realistic, budget-aware day-by-day "
    "itineraries. You respond with a single valid JSON object only — no markdown, "
    "no code fences, no commentary before or after it."
)


def _build_user_prompt(
    source: Optional[str], destination: str, days: int, budget: Optional[float], interests: List[str]
) -> str:
    interest_text = ", ".join(interests) if interests else "general sightseeing"
    source_text = f" The traveler is departing from {source}." if source else ""
    budget_text = f" The traveler's target budget is {budget} INR. " if budget else " The traveler has no specific budget; estimate realistic real-world costs. "

    return (
        f"Plan a {days}-day trip to {destination}.{source_text}"
        f"{budget_text}"
        f"CRITICAL INSTRUCTION: Use actual, highly realistic real-world prices in INR for the estimates. "
        f"Include the proportional daily cost of accommodation, meals, transport, and activities in each day's 'estimated_cost'. "
        f"Prioritize realistic real-world pricing over strictly fitting the budget. If the realistic cost exceeds the budget, that is completely fine. "
        f"Auto-generate 3 to 5 travel categories/interests that best fit this itinerary for {destination} (e.g., 'Adventure', 'Beach', 'Culture'). "
        "Return ONLY a JSON object with exactly this shape:\n"
        "{\n"
        '  "categories": ["Category 1", "Category 2"],\n'
        '  "itinerary": [\n'
        "    {\n"
        '      "day": 1,\n'
        '      "title": "short title for the day",\n'
        '      "location": "comma-separated place names visited that day",\n'
        '      "description": "2-3 sentence summary of what happens that day",\n'
        '      "start_time": "e.g. 9:00 AM",\n'
        '      "estimated_cost": 1500\n'
        "    }\n"
        "  ]\n"
        "}\n"
        f"The \"itinerary\" array must contain exactly {days} entries, ordered by day, "
        "starting at day 1. estimated_cost must be a plain number (no currency symbols)."
    )


def generate_itinerary(
    source: Optional[str],
    destination: str,
    days: int,
    budget: Optional[float],
    interests: List[str],
) -> List[dict]:
    """
    Calls Groq's chat completions API in JSON mode and returns the parsed
    list of day-plan dicts. Raises ValueError if the model output can't be
    parsed into the expected shape.
    """
    completion = _client.chat.completions.create(
        model=settings.GROQ_MODEL,
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {
                "role": "user",
                "content": _build_user_prompt(source, destination, days, budget, interests),
            },
        ],
        temperature=0.7,
        max_tokens=3000,
        response_format={"type": "json_object"},
    )

    raw = completion.choices[0].message.content

    try:
        parsed = json.loads(raw)
    except json.JSONDecodeError as exc:
        raise ValueError(f"Groq returned a response that wasn't valid JSON: {exc}") from exc

    itinerary = parsed.get("itinerary")
    if not isinstance(itinerary, list) or len(itinerary) == 0:
        raise ValueError("Groq response was missing a non-empty 'itinerary' array")

    required_keys = {"day", "title", "location", "description", "start_time", "estimated_cost"}
    for entry in itinerary:
        if not required_keys.issubset(entry.keys()):
            raise ValueError(f"Groq itinerary entry missing required fields: {entry}")

    return itinerary
