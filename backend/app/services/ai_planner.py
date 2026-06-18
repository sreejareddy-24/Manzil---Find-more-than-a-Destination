import json
import re
import random
import asyncio
from typing import List, Dict, Any, Optional
import google.generativeai as genai
from app.config import settings
from app.schemas import TripGenerateInput, ItineraryStructure, ItineraryDay, ActivityDetail, WeatherDay, DayRegenerateInput, TransitDetail
from app.services.weather import get_weather_forecast

# Procedural coordinates for preset major locations
POPULAR_COORDINATES = {
    "tokyo": (35.6762, 139.6503),
    "paris": (48.8566, 2.3522),
    "new york": (40.7128, -74.0060),
    "london": (51.5074, -0.1278),
    "dubai": (25.2048, 55.2708),
    "singapore": (1.3521, 103.8198),
    "rome": (41.9028, 12.4964),
    "mumbai": (18.9750, 72.8258),
    "delhi": (28.6139, 77.2090),
    "hyderabad": (17.3850, 78.4867),
    "visakhapatnam": (17.6868, 83.2185),
    "vizag": (17.6868, 83.2185)
}

# Procedural templates for offline travel generation
POPULAR_DESTINATIONS = {
    "tokyo": {
        "budget_hotels": {
            "economy": ["Shinjuku Capsule Hostel", "Tokyo Youth Hostel", "Akihabara Dormitory"],
            "mid-range": ["Hotel Gracery Shinjuku", "Shibuya Stream Excel", "Ueno Station Hotel"],
            "luxury": ["Aman Tokyo Resort", "The Ritz-Carlton Tokyo", "Park Hyatt Tokyo"]
        },
        "restaurants": ["Ichiran Ramen Shibuya", "Sushi Dai at Toyosu Market", "Gyukatsu Motomura Shinjuku", "New York Grill at Park Hyatt"],
        "themes": ["Tech & Tradition", "Historic Temples & Quirky Streets", "Gardens & Neon Lights", "Mt. Fuji Day Trip", "Food & Shopping Extravaganza"],
        "activities": [
            [
                {"time": "09:00 AM", "name": "Meiji Jingu Shrine", "description": "Walk through the serene forest and visit Tokyo's most famous Shinto shrine.", "cost": 0.0, "lat_off": 0.023, "lng_off": 0.049},
                {"time": "02:00 PM", "name": "Harajuku & Takeshita Street", "description": "Explore the center of Japanese youth culture and extreme fashion styles.", "cost": 15.0, "lat_off": 0.017, "lng_off": 0.052},
                {"time": "07:00 PM", "name": "Shibuya Crossing & Dinner", "description": "Walk the busiest pedestrian crossing in the world and dine at an Izakaya.", "cost": 35.0, "lat_off": 0.005, "lng_off": 0.051}
            ],
            [
                {"time": "08:00 AM", "name": "Tsukiji Outer Market", "description": "Taste fresh street food, seafood, and authentic Japanese matcha.", "cost": 25.0, "lat_off": -0.011, "lng_off": 0.091},
                {"time": "01:00 PM", "name": "Senso-ji Temple (Asakusa)", "description": "Visit Tokyo's oldest temple, walk through Kaminarimon Gate, and shop at Nakamise.", "cost": 5.0, "lat_off": 0.038, "lng_off": 0.098},
                {"time": "06:00 PM", "name": "Akihabara Electric Town", "description": "Immerse yourself in anime, manga, and retro gaming culture.", "cost": 20.0, "lat_off": 0.021, "lng_off": 0.077}
            ]
        ]
    },
    "paris": {
        "budget_hotels": {
            "economy": ["Generator Hostel Paris", "Les Piaules Nation", "St Christopher's Canal"],
            "mid-range": ["Hotel Caron de Beaumarchais", "Hotel de Notre-Dame", "Hotel Marais Bastille"],
            "luxury": ["The Ritz Paris", "Le Meurice", "Four Seasons George V"]
        },
        "restaurants": ["Le Relais de l'Entrecôte", "Les Deux Magots", "L'As du Fallafel", "Angelina Paris (Hot Chocolate)", "Bistrot Paul Bert"],
        "themes": ["Iconic Landmarks", "Art & Bohemian Life", "Palaces & Gardens", "Hidden Passages & Marais", "River Seine Romance"],
        "activities": [
            [
                {"time": "09:00 AM", "name": "Eiffel Tower", "description": "Ascend to the summit of the Iron Lady for breathtaking views of the city.", "cost": 30.0, "lat_off": 0.0018, "lng_off": -0.057},
                {"time": "02:00 PM", "name": "Arc de Triomphe & Champs-Élysées", "description": "Walk the historic avenue and view the city from the top of the monument.", "cost": 15.0, "lat_off": 0.0172, "lng_off": -0.057},
                {"time": "07:00 PM", "name": "Seine River Dinner Cruise", "description": "Enjoy a romantic dinner on the water, viewing illuminated monuments.", "cost": 75.0, "lat_off": 0.000, "lng_off": -0.01}
            ]
        ]
    },
    "new york": {
        "budget_hotels": {
            "economy": ["Freehand NYC", "HI New York City Hostel", "The Jane Hotel"],
            "mid-range": ["Arlo NoMad", "CitizenM Bowery", "The Standard High Line"],
            "luxury": ["The Plaza Hotel", "The St. Regis New York", "Baccarat Hotel"]
        },
        "restaurants": ["Katz's Delicatessen", "Joe's Pizza Greenwich Village", "Keens Steakhouse", "Chelsea Market Vendors", "Balthazar"],
        "themes": ["Manhattan Highlights", "Art, Parks & High Lines", "Brooklyn Vibe & Skyline"],
        "activities": [
            [
                {"time": "09:00 AM", "name": "Empire State Building", "description": "Visit the 86th-floor observatory for iconic skyline views of the Big Apple.", "cost": 45.0, "lat_off": 0.035, "lng_off": 0.020},
                {"time": "01:00 PM", "name": "Fifth Avenue Walk & Rockefeller Center", "description": "Walk by luxury boutiques, see St. Patrick's Cathedral, and Rockefeller Plaza.", "cost": 0.0, "lat_off": 0.045, "lng_off": 0.027},
                {"time": "07:00 PM", "name": "Times Square & Broadway Show", "description": "See the bright lights and experience a world-class theater performance.", "cost": 120.0, "lat_off": 0.046, "lng_off": 0.020}
            ]
        ]
    }
}

GENERIC_INTERESTS_ACTIVITIES = {
    "adventure": [
        {"time": "09:00 AM", "name": "Outdoor Adventure & Ziplining", "description": "Exhilarating zipline course through local canopy and forest.", "cost": 65.0, "lat_off": 0.045, "lng_off": 0.035},
        {"time": "02:00 PM", "name": "Kayaking / Off-Roading Trail", "description": "Guided trail navigation exploring local wilderness and natural features.", "cost": 45.0, "lat_off": 0.052, "lng_off": 0.048},
        {"time": "07:00 PM", "name": "Campfire & Stargazing Dinner", "description": "Open-air dining session featuring local grilled delicacies.", "cost": 35.0, "lat_off": 0.031, "lng_off": 0.029}
    ],
    "city": [
        {"time": "09:30 AM", "name": "Downtown Walking Tour", "description": "Explore city architecture, historic plazas, and neighborhood hubs.", "cost": 15.0, "lat_off": -0.005, "lng_off": 0.005},
        {"time": "02:00 PM", "name": "Local Museum or Gallery", "description": "Discover contemporary exhibitions illustrating regional heritage and arts.", "cost": 20.0, "lat_off": 0.008, "lng_off": -0.012},
        {"time": "07:00 PM", "name": "Rooftop Lounge & Panoramic Views", "description": "Sip cocktails and dine overlooking the glowing city skyline.", "cost": 50.0, "lat_off": -0.015, "lng_off": 0.002}
    ],
    "nature": [
        {"time": "08:30 AM", "name": "Scenic Hiking Trail", "description": "Trek through national parks to discover scenic viewpoints and waterfalls.", "cost": 10.0, "lat_off": -0.045, "lng_off": -0.035},
        {"time": "02:00 PM", "name": "Botanical Gardens & Eco-Tour", "description": "Learn about native flora, conservation, and exotic plant species.", "cost": 15.0, "lat_off": -0.032, "lng_off": -0.028},
        {"time": "06:00 PM", "name": "Wildlife Sanctuary Visit", "description": "See protected wildlife in their natural habitat and capture photographs.", "cost": 25.0, "lat_off": -0.051, "lng_off": -0.042}
    ]
}

def determine_budget_tier(budget: float, duration: int) -> str:
    daily_rate = budget / max(1, duration)
    if daily_rate < 120.0:
        return "economy"
    elif daily_rate <= 350.0:
        return "mid-range"
    else:
        return "luxury"

def get_procedural_hotel(destination: str, tier: str, day: int) -> str:
    cleaned = destination.title()
    if tier == "economy":
        hotels = ["Comfort Backpackers Lodge", "Express Budget Stay", "City Center Hostel"]
        return f"{cleaned} {hotels[day % len(hotels)]}"
    elif tier == "luxury":
        hotels = ["Grand Palace Resort & Spa", "Royal Horizon Suites", "The Plaza Sands Hotel"]
        return f"The {cleaned} {hotels[day % len(hotels)]}"
    else:
        hotels = ["Central Boutique Hotel", "Heritage Suites", "Regency Comfort Inn"]
        return f"{cleaned} {hotels[day % len(hotels)]}"

def get_procedural_restaurants(destination: str, day: int) -> List[str]:
    cleaned = destination.title()
    options = [
        f"The {cleaned} Local Bistro & Tavern",
        f"Trattoria Rustica {cleaned}",
        f"Saffron Indian Spice {cleaned}",
        f"Chef's Culinary Kitchen {cleaned}",
        f"The Ocean Pearl Seafood Grill",
        f"Royal Dine Fine Dining {cleaned}"
    ]
    return [options[(day * 2 - 2) % len(options)], options[(day * 2 - 1) % len(options)]]

def generate_offline_itinerary(input_data: TripGenerateInput, weather: List[WeatherDay]) -> ItineraryStructure:
    """Generates a highly structured, custom travel plan without requiring external LLM API keys."""
    dest_lower = input_data.destination.lower()
    
    # 1. Determine base matching parameters & coordinates
    known_dest = None
    center_lat, center_lng = 40.7128, -74.0060 # Default NY
    
    for key in POPULAR_COORDINATES:
        if key in dest_lower:
            center_lat, center_lng = POPULAR_COORDINATES[key]
            break
            
    for key in POPULAR_DESTINATIONS:
        if key in dest_lower:
            known_dest = POPULAR_DESTINATIONS[key]
            break

    # 2. Allocate Budget
    total = input_data.budget
    pct_travel, pct_hotel, pct_food, pct_activities = 0.25, 0.35, 0.20, 0.20

    if "food" in input_data.interests:
        pct_food += 0.05
        pct_hotel -= 0.05
    if "adventure" in input_data.interests or "nature" in input_data.interests:
        pct_activities += 0.05
        pct_hotel -= 0.05

    budget_alloc = {
        "travel": round(total * pct_travel, 2),
        "hotel": round(total * pct_hotel, 2),
        "food": round(total * pct_food, 2),
        "activities": round(total * pct_activities, 2)
    }

    tier = determine_budget_tier(input_data.budget, input_data.duration)

    # 3. Generate Day-by-Day Activities
    days = []
    primary_interests = [i for i in input_data.interests if i in GENERIC_INTERESTS_ACTIVITIES]
    if not primary_interests:
        primary_interests = ["city"]

    transit_modes = ["Walk", "Metro", "Taxi"]
    transit_durations = [8, 12, 20]

    for d in range(1, input_data.duration + 1):
        activities = []
        restaurant_recs = []

        # Recommending hotels day-wise to support event/activity proximity
        if known_dest:
            hotel_list = known_dest["budget_hotels"].get(tier, known_dest["budget_hotels"]["mid-range"])
            hotel_rec = hotel_list[(d - 1) % len(hotel_list)]
        else:
            hotel_rec = get_procedural_hotel(input_data.destination, tier, d)

        if known_dest:
            template_idx = (d - 1) % len(known_dest["activities"])
            activities_template = known_dest["activities"][template_idx]
            day_theme = known_dest["themes"][template_idx % len(known_dest["themes"])]
            
            for act in activities_template:
                activities.append(ActivityDetail(
                    time=act["time"],
                    name=act["name"],
                    description=act["description"],
                    cost=act["cost"],
                    latitude=center_lat + act.get("lat_off", 0.0),
                    longitude=center_lng + act.get("lng_off", 0.0)
                ))
            restaurant_recs = [
                known_dest["restaurants"][(d * 2 - 2) % len(known_dest["restaurants"])],
                known_dest["restaurants"][(d * 2 - 1) % len(known_dest["restaurants"])]
            ]
        else:
            interest = primary_interests[(d - 1) % len(primary_interests)]
            day_theme = f"Discover {interest.capitalize()} in {input_data.destination.title()}"
            template = GENERIC_INTERESTS_ACTIVITIES.get(interest, GENERIC_INTERESTS_ACTIVITIES["city"])
            
            for idx, act in enumerate(template):
                desc = act["description"].replace("local", input_data.destination).replace("regional", input_data.destination)
                
                # Add pseudo-random offsets for coordinates
                lat_off = act["lat_off"] + (d * 0.002)
                lng_off = act["lng_off"] + (d * -0.003)
                
                activities.append(ActivityDetail(
                    time=act["time"],
                    name=act["name"].replace("Local", input_data.destination.title()),
                    description=desc,
                    cost=act["cost"],
                    latitude=center_lat + lat_off,
                    longitude=center_lng + lng_off
                ))
            restaurant_recs = get_procedural_restaurants(input_data.destination, d)

        # Map transit estimates between activities
        for idx in range(len(activities) - 1):
            activities[idx].transit_to_next = TransitDetail(
                mode=transit_modes[idx % len(transit_modes)],
                duration=transit_durations[(idx + d) % len(transit_durations)]
            )

        daily_cost = sum(act.cost for act in activities)
        days.append(ItineraryDay(
            day=d,
            theme=day_theme,
            activities=activities,
            hotel_recommendation=hotel_rec,

            restaurant_recommendation=restaurant_recs,
            daily_budget_estimate=round(daily_cost + 40.0, 2)
        ))

    # 4. Generate Packing Lists & Suggestions
    packing_list = ["Passport & Visa documents", "Adaptor & Chargers", "Comfortable walking shoes"]
    if "beach" in input_data.interests:
        packing_list.extend(["Swimwear", "Sunscreen SPF 50+"])
    if "adventure" in input_data.interests or "nature" in input_data.interests:
        packing_list.extend(["Hiking boots", "Reusable water bottle"])

    suggestions = [
        f"Get a local SIM card or eSIM at the arrival airport for maps navigation.",
        f"Check the interactive map on the dashboard for optimized transit routes."
    ]

    return ItineraryStructure(
        destination=input_data.destination,
        duration=input_data.duration,
        budget_allocation=budget_alloc,
        days=days,
        packing_recommendations=packing_list,
        smart_suggestions=suggestions,
        weather_forecast=weather
    )


def allocate_budget_procedurally(budget: float, interests: List[str]) -> Dict[str, float]:
    pct_travel, pct_hotel, pct_food, pct_activities = 0.25, 0.35, 0.20, 0.20
    if "food" in interests:
        pct_food += 0.05
        pct_hotel -= 0.05
    if "adventure" in interests or "nature" in interests:
        pct_activities += 0.05
        pct_hotel -= 0.05
    return {
        "travel": round(budget * pct_travel, 2),
        "hotel": round(budget * pct_hotel, 2),
        "food": round(budget * pct_food, 2),
        "activities": round(budget * pct_activities, 2)
    }

async def generate_itinerary(input_data: TripGenerateInput) -> ItineraryStructure:
    """Main planning engine entry point. Connects to Gemini API or falls back on offline planning."""
    
    # Start weather fetch task concurrently to reduce planning latency
    weather_task = get_weather_forecast(input_data.destination, input_data.duration)
    
    if not settings.GEMINI_API_KEY:
        print("GEMINI_API_KEY not found. Using offline procedural travel engine.")
        weather = await weather_task
        return generate_offline_itinerary(input_data, weather)
        
    try:
        genai.configure(api_key=settings.GEMINI_API_KEY)
        model = genai.GenerativeModel("gemini-2.5-flash")
        
        budget_tier = determine_budget_tier(input_data.budget, input_data.duration)
        budget_alloc = allocate_budget_procedurally(input_data.budget, input_data.interests)
        
        # Split itinerary into parallel chunks of 3 days max (for optimal LLM generation speed)
        chunk_size = 3
        ranges = []
        for i in range(1, input_data.duration + 1, chunk_size):
            end = min(i + chunk_size - 1, input_data.duration)
            ranges.append((i, end))

        gemini_tasks = []
        for start_day, end_day in ranges:
            prompt = f"""
            You are an expert AI Travel Planner. Generate a detailed, personalized travel itinerary chunk for Days {start_day} to {end_day} of a {input_data.duration}-day trip from {input_data.source} to {input_data.destination} starting on {input_data.start_date}.
            
            Trip Details:
            - Source: {input_data.source}
            - Destination: {input_data.destination}
            - Start Date: {input_data.start_date}
            - Duration: {input_data.duration} days (Generating chunk: Days {start_day} to {end_day})
            - Budget Tier: {budget_tier.upper()} (Assign real hotels matching this tier)
            - Allocated Hotel Budget: ${budget_alloc["hotel"]} (approx. ${round(budget_alloc["hotel"] / input_data.duration, 2)} per night)
            - Allocated Activities Budget: ${budget_alloc["activities"]}
            - Travel Interests: {', '.join(input_data.interests)}
            
            Requirements:
            1. Create a day-by-day plan for exactly the requested days: Days {start_day} to {end_day}.
            2. Recommend a real-world hotel for each day. The hotel should match the budget tier and change day-wise, selecting a lodging option close to that specific day's events or activities.
            3. For each day, plan 2 to 3 detailed activities (morning, afternoon, evening) with specific times, locations, and individual costs in USD.
            4. For each activity, specify realistic latitude and longitude coordinates.
            5. For consecutive activities, provide estimated transit details ('transit_to_next': {{'mode': string, 'duration': number in minutes}}). The last activity of each day should have 'transit_to_next' as null.
            6. Recommend 2 good local restaurants for lunch/dinner per day.
            7. List 3 highly relevant packing recommendations.
            8. Provide 2 smart, destination-specific travel suggestions.
            
            Provide the response ONLY in a valid JSON format. Do not add markdown wrappers (like ```json ... ```).
            The JSON must follow this exact typescript structure:
            {{
                "days": [
                    {{
                        "day": number,
                        "theme": string,
                        "activities": [
                            {{
                                "time": string,
                                "name": string,
                                "description": string,
                                "cost": number,
                                "latitude": number,
                                "longitude": number,
                                "transit_to_next": {{
                                    "mode": string,
                                    "duration": number
                                }} or null
                            }}
                        ],
                        "hotel_recommendation": string,
                        "restaurant_recommendation": [string],
                        "daily_budget_estimate": number
                    }}
                ],
                "packing_recommendations": [string],
                "smart_suggestions": [string]
            }}
            """
            
            gemini_tasks.append(model.generate_content_async(
                prompt,
                generation_config={"response_mime_type": "application/json"}
            ))

        # Await all parallel API calls and weather query concurrently
        results = await asyncio.gather(weather_task, *gemini_tasks)
        weather = results[0]
        gemini_responses = results[1:]

        # Merge results from all chunks
        all_days = []
        all_packing = []
        all_suggestions = []

        for response in gemini_responses:
            clean_json_str = response.text.strip()
            if clean_json_str.startswith("```"):
                clean_json_str = re.sub(r"^```(?:json)?\n", "", clean_json_str)
                clean_json_str = re.sub(r"\n```$", "", clean_json_str)
                clean_json_str = clean_json_str.strip()
                
            chunk_data = json.loads(clean_json_str)
            all_days.extend(chunk_data.get("days", []))
            all_packing.extend(chunk_data.get("packing_recommendations", []))
            all_suggestions.extend(chunk_data.get("smart_suggestions", []))

        # Sort days chronologically
        all_days.sort(key=lambda x: x.get("day", 1))

        # Remove duplicate packing lists & travel tips
        unique_packing = list(dict.fromkeys(all_packing))
        unique_suggestions = list(dict.fromkeys(all_suggestions))

        itinerary_dict = {
            "destination": input_data.destination,
            "duration": input_data.duration,
            "budget_allocation": budget_alloc,
            "days": all_days,
            "packing_recommendations": unique_packing,
            "smart_suggestions": unique_suggestions,
            "weather_forecast": [w.dict() for w in weather]
        }
        
        return ItineraryStructure(**itinerary_dict)
        
    except Exception as e:
        print(f"Failed to generate itinerary with Gemini API: {e}. Falling back to offline generator.")
        weather = await weather_task
        return generate_offline_itinerary(input_data, weather)




async def regenerate_single_day(input_data: DayRegenerateInput) -> ItineraryDay:
    """Regenerate activities for a single day of a trip, keeping the rest of the itinerary intact."""
    dummy_input = TripGenerateInput(
        source="",
        destination=input_data.destination,
        start_date=input_data.start_date,
        duration=input_data.duration,
        budget=input_data.budget,
        interests=input_data.interests
    )
    
    weather = await get_weather_forecast(input_data.destination, input_data.duration)
    
    if settings.GEMINI_API_KEY:
        try:
            genai.configure(api_key=settings.GEMINI_API_KEY)
            model = genai.GenerativeModel("gemini-2.5-flash")
            
            prompt = f"""
            You are an expert AI Travel Planner. Generate a SINGLE day itinerary for Day {input_data.day_number} 
            of a {input_data.duration}-day trip to {input_data.destination}.
            
            Trip Details:
            - Destination: {input_data.destination}
            - Day Number: {input_data.day_number} of {input_data.duration}
            - Daily Budget: ${round(input_data.budget / input_data.duration, 2)}
            - Travel Interests: {', '.join(input_data.interests)}
            
            Generate 3 activities (morning, afternoon, evening) with specific times, locations, descriptions, estimated costs, and realistic latitude/longitude coordinates.
            Include estimated transit details ('transit_to_next': {{'mode': string, 'duration': number in minutes}}) between consecutive activities.
            Include a hotel recommendation and 2 restaurant recommendations.
            
            Return ONLY valid JSON (no markdown wrappers) in this format:
            {{
                "day": {input_data.day_number},
                "theme": string,
                "activities": [
                    {{
                        "time": string,
                        "name": string,
                        "description": string,
                        "cost": number,
                        "latitude": number,
                        "longitude": number,
                        "transit_to_next": {{
                            "mode": string,
                            "duration": number
                        }} or null
                    }}
                ],
                "hotel_recommendation": string,
                "restaurant_recommendation": [string],
                "daily_budget_estimate": number
            }}
            """
            
            response = model.generate_content(
                prompt,
                generation_config={"response_mime_type": "application/json"}
            )
            
            clean_json = response.text.strip()
            if clean_json.startswith("```"):
                clean_json = re.sub(r"^```(?:json)?\n", "", clean_json)
                clean_json = re.sub(r"\n```$", "", clean_json)
                clean_json = clean_json.strip()
            
            day_dict = json.loads(clean_json)
            return ItineraryDay(**day_dict)
            
        except Exception as e:
            print(f"Gemini single-day regen failed: {e}. Using offline generator.")
    
    full_itinerary = generate_offline_itinerary(dummy_input, weather)
    target_idx = (input_data.day_number - 1) % len(full_itinerary.days)
    day = full_itinerary.days[target_idx]
    day.day = input_data.day_number
    return day
