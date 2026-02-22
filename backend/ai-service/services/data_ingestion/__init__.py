"""
Data Ingestion Services
Real-time data collection from external APIs
"""

from .weather_ingestion import router as weather_router, fetch_weather_data
from .earthquake_ingestion import router as earthquake_router, fetch_earthquake_data
from .fire_ingestion import router as fire_router, fetch_fire_data

__all__ = [
    "weather_router",
    "earthquake_router", 
    "fire_router",
    "fetch_weather_data",
    "fetch_earthquake_data",
    "fetch_fire_data"
]
