"""
Weather Data Ingestion Module
Fetches real-time weather data from OpenWeatherMap API
"""

import httpx
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel
from typing import Optional
from datetime import datetime
import os
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/weather", tags=["Weather Data"])

# OpenWeatherMap API configuration
OPENWEATHER_API_KEY = os.getenv("OPENWEATHER_API_KEY", "")
OPENWEATHER_BASE_URL = "https://api.openweathermap.org/data/2.5/weather"


class WeatherData(BaseModel):
    """Structured weather data response"""
    latitude: float
    longitude: float
    location_name: Optional[str] = None
    country: Optional[str] = None
    temperature_celsius: float
    feels_like_celsius: float
    humidity_percent: float
    pressure_hpa: float
    wind_speed_mps: float
    wind_direction_deg: Optional[float] = None
    rainfall_mm_1h: Optional[float] = 0.0
    rainfall_mm_3h: Optional[float] = 0.0
    cloudiness_percent: float
    visibility_m: Optional[int] = None
    weather_condition: str
    weather_description: str
    timestamp: datetime
    sunrise: Optional[datetime] = None
    sunset: Optional[datetime] = None


class WeatherResponse(BaseModel):
    """API response wrapper"""
    success: bool
    data: Optional[WeatherData] = None
    error: Optional[str] = None


async def fetch_weather_data(lat: float, lon: float) -> WeatherData:
    """
    Fetch real-time weather data from OpenWeatherMap API
    
    Args:
        lat: Latitude of the location
        lon: Longitude of the location
    
    Returns:
        WeatherData: Structured weather information
    """
    if not OPENWEATHER_API_KEY:
        raise HTTPException(
            status_code=500, 
            detail="OpenWeatherMap API key not configured"
        )
    
    params = {
        "lat": lat,
        "lon": lon,
        "appid": OPENWEATHER_API_KEY,
        "units": "metric"  # Use metric units (Celsius, m/s)
    }
    
    async with httpx.AsyncClient(timeout=30.0) as client:
        try:
            response = await client.get(OPENWEATHER_BASE_URL, params=params)
            response.raise_for_status()
            data = response.json()
            
            # Extract rainfall data (may not always be present)
            rain_1h = data.get("rain", {}).get("1h", 0.0)
            rain_3h = data.get("rain", {}).get("3h", 0.0)
            
            weather_data = WeatherData(
                latitude=data["coord"]["lat"],
                longitude=data["coord"]["lon"],
                location_name=data.get("name"),
                country=data.get("sys", {}).get("country"),
                temperature_celsius=data["main"]["temp"],
                feels_like_celsius=data["main"]["feels_like"],
                humidity_percent=data["main"]["humidity"],
                pressure_hpa=data["main"]["pressure"],
                wind_speed_mps=data["wind"]["speed"],
                wind_direction_deg=data["wind"].get("deg"),
                rainfall_mm_1h=rain_1h,
                rainfall_mm_3h=rain_3h,
                cloudiness_percent=data["clouds"]["all"],
                visibility_m=data.get("visibility"),
                weather_condition=data["weather"][0]["main"],
                weather_description=data["weather"][0]["description"],
                timestamp=datetime.utcfromtimestamp(data["dt"]),
                sunrise=datetime.utcfromtimestamp(data["sys"]["sunrise"]) if "sunrise" in data.get("sys", {}) else None,
                sunset=datetime.utcfromtimestamp(data["sys"]["sunset"]) if "sunset" in data.get("sys", {}) else None
            )
            
            logger.info(f"Weather data fetched for ({lat}, {lon}): {weather_data.weather_condition}")
            return weather_data
            
        except httpx.HTTPStatusError as e:
            logger.error(f"HTTP error fetching weather data: {e}")
            raise HTTPException(status_code=e.response.status_code, detail=str(e))
        except httpx.RequestError as e:
            logger.error(f"Request error fetching weather data: {e}")
            raise HTTPException(status_code=503, detail="Weather service unavailable")
        except KeyError as e:
            logger.error(f"Error parsing weather response: {e}")
            raise HTTPException(status_code=500, detail="Invalid response from weather service")


@router.get("/current", response_model=WeatherResponse)
async def get_current_weather(
    lat: float = Query(..., ge=-90, le=90, description="Latitude"),
    lon: float = Query(..., ge=-180, le=180, description="Longitude")
):
    """
    Get current weather data for a specific location
    
    - **lat**: Latitude (-90 to 90)
    - **lon**: Longitude (-180 to 180)
    """
    try:
        weather_data = await fetch_weather_data(lat, lon)
        return WeatherResponse(success=True, data=weather_data)
    except HTTPException as e:
        return WeatherResponse(success=False, error=e.detail)


@router.get("/alerts", response_model=dict)
async def get_weather_alerts(
    lat: float = Query(..., ge=-90, le=90),
    lon: float = Query(..., ge=-180, le=180)
):
    """
    Check for severe weather conditions that may indicate disaster risk
    """
    try:
        weather = await fetch_weather_data(lat, lon)
        
        alerts = []
        risk_level = "low"
        
        # Check for heavy rainfall (flood risk)
        if weather.rainfall_mm_1h and weather.rainfall_mm_1h > 10:
            alerts.append({
                "type": "heavy_rainfall",
                "severity": "high" if weather.rainfall_mm_1h > 30 else "moderate",
                "message": f"Heavy rainfall detected: {weather.rainfall_mm_1h}mm/h"
            })
            risk_level = "high" if weather.rainfall_mm_1h > 30 else "moderate"
        
        # Check for high winds (cyclone/storm risk)
        if weather.wind_speed_mps > 15:
            severity = "critical" if weather.wind_speed_mps > 25 else "high"
            alerts.append({
                "type": "high_wind",
                "severity": severity,
                "message": f"High wind speed detected: {weather.wind_speed_mps}m/s"
            })
            risk_level = severity
        
        # Check for extreme temperatures
        if weather.temperature_celsius > 45 or weather.temperature_celsius < -10:
            alerts.append({
                "type": "extreme_temperature",
                "severity": "high",
                "message": f"Extreme temperature: {weather.temperature_celsius}°C"
            })
            if risk_level == "low":
                risk_level = "moderate"
        
        # Check for low visibility (fog/dust storm)
        if weather.visibility_m and weather.visibility_m < 500:
            alerts.append({
                "type": "low_visibility",
                "severity": "moderate",
                "message": f"Very low visibility: {weather.visibility_m}m"
            })
        
        return {
            "location": {"lat": lat, "lon": lon},
            "risk_level": risk_level,
            "alerts": alerts,
            "current_conditions": {
                "temperature": weather.temperature_celsius,
                "humidity": weather.humidity_percent,
                "wind_speed": weather.wind_speed_mps,
                "rainfall_1h": weather.rainfall_mm_1h
            },
            "timestamp": datetime.utcnow().isoformat()
        }
        
    except HTTPException as e:
        raise e
