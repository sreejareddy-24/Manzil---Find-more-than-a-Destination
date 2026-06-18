import httpx
from typing import List
import datetime
from app.schemas import WeatherDay

WEATHER_CODE_MAP = {
    0: "Sunny",
    1: "Partly Cloudy",
    2: "Partly Cloudy",
    3: "Cloudy",
    45: "Foggy",
    48: "Foggy",
    51: "Drizzle",
    53: "Drizzle",
    55: "Drizzle",
    61: "Rainy",
    63: "Rainy",
    65: "Rainy",
    71: "Snowy",
    73: "Snowy",
    75: "Snowy",
    80: "Showers",
    81: "Showers",
    82: "Showers",
    95: "Thunderstorm",
    96: "Thunderstorm",
    99: "Thunderstorm",
}

def get_weather_desc(code: int) -> str:
    return WEATHER_CODE_MAP.get(code, "Clear")

async def get_weather_forecast(destination: str, duration: int) -> List[WeatherDay]:
    # 1. Resolve coordinates using Open-Meteo Geocoding API
    lat, lon = None, None
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            geo_url = f"https://geocoding-api.open-meteo.com/v1/search?name={destination}&count=1&language=en&format=json"
            response = await client.get(geo_url)
            if response.status_code == 200:
                data = response.json()
                if data.get("results"):
                    result = data["results"][0]
                    lat = result.get("latitude")
                    lon = result.get("longitude")
    except Exception as e:
        print(f"Geocoding error for {destination}: {e}")

    # Fallback to simulated forecast if geocoding or API fails
    if lat is None or lon is None:
        return simulate_weather(duration)

    # 2. Get forecast using Open-Meteo Forecast API
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            forecast_url = f"https://api.open-meteo.com/v1/forecast?latitude={lat}&longitude={lon}&daily=temperature_2m_max,temperature_2m_min,weather_code&timezone=auto"
            response = await client.get(forecast_url)
            if response.status_code == 200:
                data = response.json()
                daily = data.get("daily", {})
                dates = daily.get("time", [])
                max_temps = daily.get("temperature_2m_max", [])
                min_temps = daily.get("temperature_2m_min", [])
                codes = daily.get("weather_code", [])

                forecast = []
                # Open-Meteo daily forecast provides 7 days by default. We limit to duration or what is returned.
                limit = min(duration, len(dates), 7)
                for i in range(limit):
                    forecast.append(WeatherDay(
                        date=dates[i],
                        temp_max=max_temps[i] if i < len(max_temps) else 25.0,
                        temp_min=min_temps[i] if i < len(min_temps) else 15.0,
                        condition=get_weather_desc(codes[i]) if i < len(codes) else "Clear"
                    ))
                
                # If trip duration is longer than 7 days, pad the remaining days with simulated weather
                if len(forecast) < duration:
                    base_date = datetime.datetime.strptime(dates[-1] if dates else datetime.date.today().strftime("%Y-%m-%d"), "%Y-%m-%d").date()
                    for i in range(len(forecast), duration):
                        current_date = base_date + datetime.timedelta(days=i - len(forecast) + 1)
                        last_day = forecast[-1] if forecast else None
                        forecast.append(WeatherDay(
                            date=current_date.strftime("%Y-%m-%d"),
                            temp_max=last_day.temp_max if last_day else 25.0,
                            temp_min=last_day.temp_min if last_day else 15.0,
                            condition=last_day.condition if last_day else "Clear"
                        ))
                return forecast
    except Exception as e:
        print(f"Weather forecast query error for {destination}: {e}")

    return simulate_weather(duration)

def simulate_weather(duration: int) -> List[WeatherDay]:
    forecast = []
    base_date = datetime.date.today()
    conditions = ["Sunny", "Partly Cloudy", "Sunny", "Cloudy", "Rainy", "Sunny", "Partly Cloudy"]
    for i in range(duration):
        current_date = base_date + datetime.timedelta(days=i)
        cond = conditions[i % len(conditions)]
        temp_max = 24.0 + (i % 3) - (i % 2)
        temp_min = 14.0 + (i % 2) - (i % 3)
        forecast.append(WeatherDay(
            date=current_date.strftime("%Y-%m-%d"),
            temp_max=round(temp_max, 1),
            temp_min=round(temp_min, 1),
            condition=cond
        ))
    return forecast
