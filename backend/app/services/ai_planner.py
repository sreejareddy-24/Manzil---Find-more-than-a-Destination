import json
import re
from typing import List, Dict, Any, Optional
import google.generativeai as genai
from app.config import settings
from app.schemas import TripGenerateInput, ItineraryStructure, ItineraryDay, ActivityDetail, WeatherDay, DayRegenerateInput
from app.services.weather import get_weather_forecast

# Procedural templates for offline travel generation
POPULAR_DESTINATIONS = {
    "tokyo": {
        "hotel": "Shinjuku Granbell Hotel",
        "restaurants": ["Ichiran Ramen Shibuya", "Sushi Dai at Toyosu Market", "Gyukatsu Motomura Shinjuku", "New York Grill at Park Hyatt"],
        "themes": ["Tech & Tradition", "Historic Temples & Quirky Streets", "Gardens & Neon Lights", "Mt. Fuji Day Trip", "Food & Shopping Extravaganza"],
        "activities": [
            [
                {"time": "09:00 AM", "name": "Meiji Jingu Shrine", "description": "Walk through the serene forest and visit Tokyo's most famous Shinto shrine.", "cost": 0.0},
                {"time": "02:00 PM", "name": "Harajuku & Takeshita Street", "description": "Explore the center of Japanese youth culture and extreme fashion styles.", "cost": 15.0},
                {"time": "07:00 PM", "name": "Shibuya Crossing & Dinner", "description": "Walk the busiest pedestrian crossing in the world and dine at an Izakaya.", "cost": 35.0}
            ],
            [
                {"time": "08:00 AM", "name": "Tsukiji Outer Market", "description": "Taste fresh street food, seafood, and authentic Japanese matcha.", "cost": 25.0},
                {"time": "01:00 PM", "name": "Senso-ji Temple (Asakusa)", "description": "Visit Tokyo's oldest temple, walk through Kaminarimon Gate, and shop at Nakamise.", "cost": 5.0},
                {"time": "06:00 PM", "name": "Akihabara Electric Town", "description": "Immerse yourself in anime, manga, and retro gaming culture.", "cost": 20.0}
            ],
            [
                {"time": "09:30 AM", "name": "Shinjuku Gyoen National Garden", "description": "Relax in one of Tokyo's largest and most beautiful parks.", "cost": 5.0},
                {"time": "02:00 PM", "name": "Tokyo Metropolitan Government Building", "description": "Enjoy panoramic views of the city from the 45th-floor observatory.", "cost": 0.0},
                {"time": "07:00 PM", "name": "Omoide Yokocho & Golden Gai", "description": "Stroll down narrow alleys filled with tiny bars and yakitori stalls.", "cost": 45.0}
            ],
            [
                {"time": "08:00 AM", "name": "Hakone Lake Ashi Excursion", "description": "Take a bullet train to Hakone, ride the sightseeing cruise, and view Mt. Fuji.", "cost": 85.0},
                {"time": "02:00 PM", "name": "Hakone Open-Air Museum", "description": "Discover outdoor sculptures set against beautiful green mountains.", "cost": 16.0},
                {"time": "08:00 PM", "name": "Return to Tokyo & Ramen Dinner", "description": "Head back to the city for a late-night comforting bowl of ramen.", "cost": 15.0}
            ],
            [
                {"time": "10:00 AM", "name": "teamLab Planets TOKYO", "description": "Interact with massive digital artwork installations in a body-immersive museum.", "cost": 28.0},
                {"time": "02:00 PM", "name": "Ginza Shopping District", "description": "Stroll around Tokyo's upscale shopping, dining, and entertainment district.", "cost": 10.0},
                {"time": "07:00 PM", "name": "Yakitori Under the Tracks (Yurakucho)", "description": "Enjoy a casual, lively dinner under the train tracks.", "cost": 30.0}
            ]
        ]
    },
    "paris": {
        "hotel": "Hotel Caron de Beaumarchais",
        "restaurants": ["Le Relais de l'Entrecôte", "Les Deux Magots", "L'As du Fallafel", "Angelina Paris (Hot Chocolate)", "Bistrot Paul Bert"],
        "themes": ["Iconic Landmarks", "Art & Bohemian Life", "Palaces & Gardens", "Hidden Passages & Marais", "River Seine Romance"],
        "activities": [
            [
                {"time": "09:00 AM", "name": "Eiffel Tower", "description": "Ascend to the summit of the Iron Lady for breathtaking views of the city.", "cost": 30.0},
                {"time": "02:00 PM", "name": "Arc de Triomphe & Champs-Élysées", "description": "Walk the historic avenue and view the city from the top of the monument.", "cost": 15.0},
                {"time": "07:00 PM", "name": "Seine River Dinner Cruise", "description": "Enjoy a romantic dinner on the water, viewing illuminated monuments.", "cost": 75.0}
            ],
            [
                {"time": "09:00 AM", "name": "The Louvre Museum", "description": "See the Mona Lisa, Winged Victory, and ancient relics in a former palace.", "cost": 22.0},
                {"time": "02:00 PM", "name": "Jardin des Tuileries & Place de la Concorde", "description": "Relax in the manicured gardens and walk through history.", "cost": 0.0},
                {"time": "06:00 PM", "name": "Montmartre & Sacré-Cœur", "description": "Climb up the bohemian hill, watch street artists, and see the Basilica.", "cost": 5.0}
            ],
            [
                {"time": "08:30 AM", "name": "Palace of Versailles Day Trip", "description": "Take the RER train to visit the Hall of Mirrors and grand royal gardens.", "cost": 25.0},
                {"time": "02:30 PM", "name": "Versailles Gardens & Grand Trianon", "description": "Explore the massive gardens, fountains, and Marie Antoinette's estate.", "cost": 12.0},
                {"time": "07:30 PM", "name": "Return to Paris & Classic Bistro Dinner", "description": "Savor duck confit and steak frites in a local neighborhood bistro.", "cost": 40.0}
            ],
            [
                {"time": "09:30 AM", "name": "Musée d'Orsay", "description": "Admire the world's largest collection of impressionist masterpieces in a train station.", "cost": 16.0},
                {"time": "01:30 PM", "name": "Latin Quarter & Notre-Dame", "description": "Walk the medieval streets, see the Shakespeare and Company bookstore, and Notre-Dame cathedral.", "cost": 0.0},
                {"time": "07:00 PM", "name": "Marais District Food Crawl", "description": "Sample falafels, French cheeses, pastries, and wines in a vibrant historic area.", "cost": 50.0}
            ],
            [
                {"time": "10:00 AM", "name": "Centre Pompidou", "description": "Explore the radical modern art museum and admire its inside-out pipes architecture.", "cost": 15.0},
                {"time": "02:00 PM", "name": "Jardin du Luxembourg", "description": "Relax by the fountains, watch model sailboats, and read like a Parisian.", "cost": 0.0},
                {"time": "07:00 PM", "name": "Farewell Dinner at Le Train Bleu", "description": "Dine in a spectacular Belle Époque dining room inside Gare de Lyon.", "cost": 90.0}
            ]
        ]
    },
    "new york": {
        "hotel": "Arlo NoMad",
        "restaurants": ["Katz's Delicatessen", "Joe's Pizza Greenwich Village", "Keens Steakhouse", "Chelsea Market Vendors", "Balthazar"],
        "themes": ["Manhattan Highlights", "Art, Parks & High Lines", "Brooklyn Vibe & Skyline", "Broadway & Neon Lights", "Museum Mile & Historic NY"],
        "activities": [
            [
                {"time": "09:00 AM", "name": "Empire State Building", "description": "Visit the 86th-floor observatory for iconic skyline views of the Big Apple.", "cost": 45.0},
                {"time": "01:00 PM", "name": "Fifth Avenue Walk & Rockefeller Center", "description": "Walk by luxury boutiques, see St. Patrick's Cathedral, and Rockefeller Plaza.", "cost": 0.0},
                {"time": "07:00 PM", "name": "Times Square & Broadway Show", "description": "See the bright lights and experience a world-class theater performance.", "cost": 120.0}
            ],
            [
                {"time": "09:00 AM", "name": "Statue of Liberty & Ellis Island", "description": "Take the ferry to see Lady Liberty up close and learn about immigration history.", "cost": 25.0},
                {"time": "02:00 PM", "name": "9/11 Memorial & Financial District", "description": "Pay respects at the reflecting pools, visit Oculus, and walk Wall Street.", "cost": 0.0},
                {"time": "06:30 PM", "name": "Brooklyn Bridge Walk at Sunset", "description": "Walk across the historic suspension bridge into DUMBO for skyline photos.", "cost": 0.0}
            ],
            [
                {"time": "09:30 AM", "name": "The High Line Park", "description": "Walk the elevated linear park built on a historic freight rail line.", "cost": 0.0},
                {"time": "11:30 AM", "name": "Chelsea Market Lunch", "description": "Explore a food hall filled with diverse, artisanal culinary options.", "cost": 20.0},
                {"time": "02:00 PM", "name": "Edge Observatory & Hudson Yards", "description": "Stand on the highest outdoor sky deck in the Western Hemisphere.", "cost": 38.0}
            ]
        ]
    }
}

# General Fallback Activity templates by Interest Tag
GENERIC_INTERESTS_ACTIVITIES = {
    "adventure": [
        {"time": "09:00 AM", "name": "Outdoor Adventure & Ziplining", "description": "Exhilarating zipline course through local canopy and forest.", "cost": 65.0},
        {"time": "02:00 PM", "name": "Kayaking / Off-Roading Trail", "description": "Guided trail navigation exploring local wilderness and natural features.", "cost": 45.0},
        {"time": "07:00 PM", "name": "Campfire & Stargazing Dinner", "description": "Open-air dining session featuring local grilled delicacies.", "cost": 35.0}
    ],
    "beach": [
        {"time": "09:00 AM", "name": "Morning Swim & Sunbathing", "description": "Relax on pristine white sands and swim in warm, clear waters.", "cost": 0.0},
        {"time": "02:00 PM", "name": "Snorkeling / Boat Excursion", "description": "Explore vibrant coral reefs and marine life with a professional guide.", "cost": 50.0},
        {"time": "06:30 PM", "name": "Sunset Beach Dinner", "description": "Dine at a beachside grill with seafood and cocktails.", "cost": 40.0}
    ],
    "nature": [
        {"time": "08:30 AM", "name": "Scenic Hiking Trail", "description": "Trek through national parks to discover scenic viewpoints and waterfalls.", "cost": 10.0},
        {"time": "02:00 PM", "name": "Botanical Gardens & Eco-Tour", "description": "Learn about native flora, conservation, and exotic plant species.", "cost": 15.0},
        {"time": "06:00 PM", "name": "Wildlife Sanctuary Visit", "description": "See protected wildlife in their natural habitat and capture photographs.", "cost": 25.0}
    ],
    "city": [
        {"time": "09:30 AM", "name": "Downtown Walking Tour", "description": "Explore city architecture, historic plazas, and neighborhood hubs.", "cost": 15.0},
        {"time": "02:00 PM", "name": "Local Museum or Gallery", "description": "Discover contemporary exhibitions illustrating regional heritage and arts.", "cost": 20.0},
        {"time": "07:00 PM", "name": "Rooftop Lounge & Panoramic Views", "description": "Sip cocktails and dine overlooking the glowing city skyline.", "cost": 50.0}
    ],
    "culture": [
        {"time": "09:00 AM", "name": "Historic Castle / Heritage Site", "description": "Take a guided audio tour of the historic stronghold and ruins.", "cost": 18.0},
        {"time": "02:00 PM", "name": "Traditional Craft Workshop", "description": "Hands-on class to learn local crafts, pottery, or weaving.", "cost": 30.0},
        {"time": "07:00 PM", "name": "Folklore Performance & Dinner", "description": "Experience music, dance, and a traditional banquet.", "cost": 60.0}
    ],
    "food": [
        {"time": "09:30 AM", "name": "Local Market & Pastry Crawl", "description": "Walk through traditional food markets, tasting local pastries and coffees.", "cost": 25.0},
        {"time": "02:00 PM", "name": "Hands-on Cooking Masterclass", "description": "Learn to cook three iconic regional dishes with a local chef.", "cost": 70.0},
        {"time": "07:30 PM", "name": "Gourmet Tasting Menu", "description": "Indulge in a curated multi-course dinner highlighting regional fusion.", "cost": 85.0}
    ]
}

def generate_offline_itinerary(input_data: TripGenerateInput, weather: List[WeatherDay]) -> ItineraryStructure:
    """Generates a highly structured, custom travel plan without requiring external LLM API keys."""
    dest_lower = input_data.destination.lower()
    
    # 1. Determine base matching parameters
    known_dest = None
    for key in POPULAR_DESTINATIONS:
        if key in dest_lower:
            known_dest = POPULAR_DESTINATIONS[key]
            break

    # 2. Allocate Budget
    total = input_data.budget
    # Base split percentages
    pct_travel = 0.25
    pct_hotel = 0.35
    pct_food = 0.20
    pct_activities = 0.20

    # Adjust split based on interests
    if "food" in input_data.interests:
        pct_food += 0.05
        pct_hotel -= 0.05
    if "shopping" in input_data.interests:
        pct_travel -= 0.05
        pct_activities += 0.05
    if "adventure" in input_data.interests or "nature" in input_data.interests:
        pct_activities += 0.05
        pct_hotel -= 0.05

    budget_alloc = {
        "travel": round(total * pct_travel, 2),
        "hotel": round(total * pct_hotel, 2),
        "food": round(total * pct_food, 2),
        "activities": round(total * pct_activities, 2)
    }

    # 3. Generate Day-by-Day Activities
    days = []
    
    # Select primary interests
    primary_interests = [i for i in input_data.interests if i in GENERIC_INTERESTS_ACTIVITIES]
    if not primary_interests:
        primary_interests = ["city"]

    for d in range(1, input_data.duration + 1):
        day_theme = ""
        activities = []
        hotel_rec = ""
        restaurant_recs = []

        if known_dest:
            # Pull from pre-made templates
            template_idx = (d - 1) % len(known_dest["activities"])
            activities_template = known_dest["activities"][template_idx]
            day_theme = known_dest["themes"][template_idx % len(known_dest["themes"])]
            
            # Map activities
            activities = [
                ActivityDetail(
                    time=act["time"],
                    name=act["name"],
                    description=act["description"],
                    cost=act["cost"]
                ) for act in activities_template
            ]
            hotel_rec = known_dest["hotel"]
            restaurant_recs = [
                known_dest["restaurants"][(d * 2 - 2) % len(known_dest["restaurants"])],
                known_dest["restaurants"][(d * 2 - 1) % len(known_dest["restaurants"])]
            ]
        else:
            # Procedural generation based on destination and interest tags
            interest = primary_interests[(d - 1) % len(primary_interests)]
            day_theme = f"Discover {interest.capitalize()} in {input_data.destination}"
            
            # Retrieve default templates for this interest
            template = GENERIC_INTERESTS_ACTIVITIES.get(interest, GENERIC_INTERESTS_ACTIVITIES["city"])
            
            activities = []
            for act in template:
                # Customise descriptions to include the actual destination
                desc = act["description"].replace("local", input_data.destination).replace("regional", input_data.destination)
                activities.append(ActivityDetail(
                    time=act["time"],
                    name=act["name"].replace("Local", input_data.destination),
                    description=desc,
                    cost=act["cost"]
                ))
            
            hotel_rec = f"The {input_data.destination} Grand Boutique Hotel"
            restaurant_recs = [
                f"{input_data.destination} Bistro & Grill",
                f"La Trattoria {input_data.destination}"
            ]

        # Calculate daily budget
        daily_cost = sum(act.cost for act in activities)
        
        days.append(ItineraryDay(
            day=d,
            theme=day_theme,
            activities=activities,
            hotel_recommendation=hotel_rec,
            restaurant_recommendation=restaurant_recs,
            daily_budget_estimate=round(daily_cost + 40.0, 2) # add food allowance
        ))

    # 4. Generate Packing Lists & Suggestions
    packing_list = ["Passport & Visa documents", "Adaptor & Chargers", "Comfortable walking shoes", "Basic first-aid kit"]
    if "beach" in input_data.interests:
        packing_list.extend(["Swimwear", "Sunscreen SPF 50+", "Beach towel & flip-flops"])
    if "adventure" in input_data.interests or "nature" in input_data.interests:
        packing_list.extend(["Hiking boots", "Rain jacket / Windbreaker", "Insect repellent", "Reusable water bottle"])
    if "culture" in input_data.interests:
        packing_list.extend(["Smart casual attire (for temples/fine dining)", "Scarf or shoulder cover-ups"])

    suggestions = [
        f"Get a local SIM card or eSIM at the arrival airport for easy maps navigation.",
        f"Purchase a metro/pass card on day 1 to save heavily on transport costs.",
        f"Make dining reservations at least 1-2 days in advance for popular spots.",
        f"Always carry a small amount of cash for local street food vendors and tipping."
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


async def generate_itinerary(input_data: TripGenerateInput) -> ItineraryStructure:
    """Main planning engine entry point. Connects to Gemini API or falls back on offline planning."""
    
    # 1. Fetch live weather forecasts from Open-Meteo
    weather = await get_weather_forecast(input_data.destination, input_data.duration)
    
    # 2. Check if Gemini API key is configured
    if not settings.GEMINI_API_KEY:
        print("GEMINI_API_KEY not found. Using offline procedural travel engine.")
        return generate_offline_itinerary(input_data, weather)
        
    try:
        # 3. Configure Gemini SDK
        genai.configure(api_key=settings.GEMINI_API_KEY)
        
        # We use gemini-2.5-flash as the latest standard model
        model = genai.GenerativeModel("gemini-2.5-flash")
        
        # Formulate prompt demanding strict JSON compliance
        prompt = f"""
        You are an expert AI Travel Planner. Generate a highly detailed, personalized travel itinerary from {input_data.source} to {input_data.destination} starting on {input_data.start_date}.
        
        Trip Details:
        - Source: {input_data.source}
        - Destination: {input_data.destination}
        - Start Date: {input_data.start_date}
        - Duration: {input_data.duration} days
        - Total Budget: ${input_data.budget}
        - Travel Interests: {', '.join(input_data.interests)}
        
        Requirements:
        1. Allocate the total budget (${input_data.budget}) into four categories: 'travel', 'hotel', 'food', and 'activities'. Ensure the sum of these four categories EXACTLY equals ${input_data.budget}.
        2. Create a day-by-day plan for exactly {input_data.duration} days.
        3. For each day, plan 2 to 3 detailed activities (morning, afternoon, evening) with specific times, locations, and estimated individual costs in USD.
        4. Recommend a hotel that matches the destination and the allocated hotel budget.
        5. Recommend 2 good local restaurants for lunch/dinner per day.
        6. List 5-8 highly relevant packing recommendations based on the destination and the interests.
        7. Provide 4 smart, destination-specific travel suggestions (e.g., transport hacks, local customs, money savers).
        
        Provide the response ONLY in a valid JSON format. Do not add markdown wrappers (like ```json ... ```).
        The JSON must follow this exact typescript structure:
        {{
            "destination": "{input_data.destination}",
            "duration": {input_data.duration},
            "budget_allocation": {{
                "travel": number,
                "hotel": number,
                "food": number,
                "activities": number
            }},
            "days": [
                {{
                    "day": number,
                    "theme": string,
                    "activities": [
                        {{
                            "time": string,
                            "name": string,
                            "description": string,
                            "cost": number
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
        
        # Invoke Gemini API
        response = model.generate_content(
            prompt,
            generation_config={"response_mime_type": "application/json"}
        )
        
        # 4. Parse response JSON
        clean_json_str = response.text.strip()
        # Clean potential markdown codeblock wrappers if model failed to respect mime_type config
        if clean_json_str.startswith("```"):
            clean_json_str = re.sub(r"^```(?:json)?\n", "", clean_json_str)
            clean_json_str = re.sub(r"\n```$", "", clean_json_str)
            clean_json_str = clean_json_str.strip()
            
        itinerary_dict = json.loads(clean_json_str)
        
        # Merge weather forecast
        itinerary_dict["weather_forecast"] = [w.dict() for w in weather]
        
        # Parse into our schema
        return ItineraryStructure(**itinerary_dict)
        
    except Exception as e:
        print(f"Failed to generate itinerary with Gemini API: {e}. Falling back to offline generator.")
        return generate_offline_itinerary(input_data, weather)


async def regenerate_single_day(input_data: DayRegenerateInput) -> ItineraryDay:
    """Regenerate activities for a single day of a trip, keeping the rest of the itinerary intact."""
    
    # Build a dummy TripGenerateInput to reuse the offline generator
    dummy_input = TripGenerateInput(
        source="",
        destination=input_data.destination,
        start_date=input_data.start_date,
        duration=input_data.duration,
        budget=input_data.budget,
        interests=input_data.interests
    )
    
    weather = await get_weather_forecast(input_data.destination, input_data.duration)
    
    # If Gemini is available, ask it for just one day
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
            
            Generate 3 activities (morning, afternoon, evening) with specific times, locations, descriptions, and estimated costs.
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
                        "cost": number
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
    
    # Offline fallback: generate a full itinerary and extract the target day
    full_itinerary = generate_offline_itinerary(dummy_input, weather)
    
    # Find the day or pick a cycled one
    target_idx = (input_data.day_number - 1) % len(full_itinerary.days)
    day = full_itinerary.days[target_idx]
    day.day = input_data.day_number
    return day
