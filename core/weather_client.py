import os
import random
from datetime import datetime

import requests
from dotenv import load_dotenv

load_dotenv()


class WeatherClient:
    def __init__(self):
        self.api_key = os.getenv("OPENWEATHER_API_KEY", "")
        self.city = os.getenv("WEATHER_CITY", "Chennai")
        self.country = os.getenv("WEATHER_COUNTRY", "IN")
        self.base_url = "https://api.openweathermap.org/data/2.5/weather"
        self.last_fetch = None
        self.cached_data = None
        self.cache_duration_seconds = 900

    def fetch_live_weather(self):
        if not self.api_key or self.api_key == "your_openweather_key_here":
            return self.get_simulated_weather()

        try:
            params = {
                "q": f"{self.city},{self.country}",
                "appid": self.api_key,
                "units": "metric",
            }
            response = requests.get(self.base_url, params=params, timeout=10)
            response.raise_for_status()
            data = response.json()

            rainfall_mm_hr = 0.0
            if "rain" in data:
                rainfall_mm_hr = data["rain"].get("1h", data["rain"].get("3h", 0.0))
                if "3h" in data.get("rain", {}):
                    rainfall_mm_hr = data["rain"]["3h"] / 3.0

            wind_speed_kmh = data.get("wind", {}).get("speed", 0) * 3.6
            cloud_cover = data.get("clouds", {}).get("all", 0)
            weather_condition = data.get("weather", [{}])[0].get("main", "Clear")

            return {
                "temperature_c": float(data["main"]["temp"]),
                "humidity_percent": float(data["main"]["humidity"]),
                "rainfall_mm_hr": float(rainfall_mm_hr),
                "wind_speed_kmh": float(wind_speed_kmh),
                "cloud_cover_percent": float(cloud_cover),
                "weather_condition": weather_condition,
                "uv_index": 6.0,
                "timestamp": datetime.now().isoformat(),
            }
        except Exception:
            return self.get_simulated_weather()

    def get_simulated_weather(self):
        rainfall_mm_hr = 2.5 if random.random() < 0.2 else 0.0
        return {
            "temperature_c": round(random.uniform(28, 34), 2),
            "humidity_percent": round(random.uniform(65, 90), 2),
            "rainfall_mm_hr": rainfall_mm_hr,
            "wind_speed_kmh": round(random.uniform(8, 25), 2),
            "cloud_cover_percent": round(random.uniform(20, 80), 2),
            "weather_condition": "Clouds",
            "uv_index": round(random.uniform(5, 9), 2),
            "timestamp": datetime.now().isoformat(),
        }

    def get_weather(self):
        now = datetime.now()
        if self.cached_data and self.last_fetch:
            elapsed = (now - self.last_fetch).total_seconds()
            if elapsed < self.cache_duration_seconds:
                return self.cached_data

        weather = self.fetch_live_weather()
        self.cached_data = weather
        self.last_fetch = now
        return weather

    def get_pond_impact_features(self):
        weather = self.get_weather()
        rainfall = weather["rainfall_mm_hr"]

        if rainfall == 0:
            rain_impact_level = "NONE"
        elif rainfall < 5:
            rain_impact_level = "LIGHT"
        elif rainfall < 15:
            rain_impact_level = "MODERATE"
        else:
            rain_impact_level = "HEAVY"

        wind_factor = min(1.0, max(0.0, weather["wind_speed_kmh"] / 25.0))
        uv_risk = min(1.0, max(0.0, weather["uv_index"] / 11.0))

        return {
            "rain_intensity": float(weather["rainfall_mm_hr"]),
            "air_temp_delta": float(weather["temperature_c"] - 28),
            "wind_turbidity_factor": float(wind_factor),
            "humidity_concentration_factor": float(weather["humidity_percent"] / 100.0),
            "cloud_o2_suppression": float(weather["cloud_cover_percent"] / 100.0),
            "uv_algae_risk": float(uv_risk),
            "is_raining": bool(weather["rainfall_mm_hr"] > 1.0),
            "rain_impact_level": rain_impact_level,
        }


weather_client = WeatherClient()
