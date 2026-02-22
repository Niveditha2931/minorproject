"""
Data Scheduler Service
Periodic fetching of disaster data using APScheduler
Stores results in PostgreSQL
"""

import asyncio
import logging
import os
from datetime import datetime
from typing import Optional
from contextlib import asynccontextmanager

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.interval import IntervalTrigger
import asyncpg

from services.data_ingestion.weather_ingestion import fetch_weather_data
from services.data_ingestion.earthquake_ingestion import fetch_earthquake_data
from services.data_ingestion.fire_ingestion import fetch_fire_data

logger = logging.getLogger(__name__)

# PostgreSQL configuration
DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql://postgres:postgres@localhost:5432/crisis_response"
)

# Default monitoring locations (major Indian cities)
MONITORED_LOCATIONS = [
    {"name": "Delhi", "lat": 28.6139, "lon": 77.2090},
    {"name": "Mumbai", "lat": 19.0760, "lon": 72.8777},
    {"name": "Chennai", "lat": 13.0827, "lon": 80.2707},
    {"name": "Kolkata", "lat": 22.5726, "lon": 88.3639},
    {"name": "Bangalore", "lat": 12.9716, "lon": 77.5946},
    {"name": "Hyderabad", "lat": 17.3850, "lon": 78.4867},
]


class DataScheduler:
    """Manages scheduled data ingestion tasks"""
    
    def __init__(self):
        self.scheduler = AsyncIOScheduler()
        self.pool: Optional[asyncpg.Pool] = None
        self._is_running = False
    
    async def init_database(self):
        """Initialize PostgreSQL connection pool and create tables"""
        try:
            self.pool = await asyncpg.create_pool(
                DATABASE_URL,
                min_size=2,
                max_size=10
            )
            
            # Create tables if they don't exist
            async with self.pool.acquire() as conn:
                await conn.execute('''
                    CREATE TABLE IF NOT EXISTS weather_data (
                        id SERIAL PRIMARY KEY,
                        location_name VARCHAR(100),
                        latitude DOUBLE PRECISION,
                        longitude DOUBLE PRECISION,
                        temperature DOUBLE PRECISION,
                        humidity DOUBLE PRECISION,
                        wind_speed DOUBLE PRECISION,
                        rainfall_1h DOUBLE PRECISION,
                        weather_condition VARCHAR(50),
                        risk_level VARCHAR(20),
                        fetched_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                    )
                ''')
                
                await conn.execute('''
                    CREATE TABLE IF NOT EXISTS earthquake_data (
                        id SERIAL PRIMARY KEY,
                        earthquake_id VARCHAR(50) UNIQUE,
                        latitude DOUBLE PRECISION,
                        longitude DOUBLE PRECISION,
                        magnitude DOUBLE PRECISION,
                        depth_km DOUBLE PRECISION,
                        place VARCHAR(255),
                        occurred_at TIMESTAMP,
                        tsunami_warning BOOLEAN,
                        fetched_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                    )
                ''')
                
                await conn.execute('''
                    CREATE TABLE IF NOT EXISTS fire_data (
                        id SERIAL PRIMARY KEY,
                        latitude DOUBLE PRECISION,
                        longitude DOUBLE PRECISION,
                        brightness DOUBLE PRECISION,
                        confidence_level VARCHAR(20),
                        frp DOUBLE PRECISION,
                        satellite VARCHAR(50),
                        acquisition_date DATE,
                        fetched_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                    )
                ''')
                
                # Create indexes for faster queries
                await conn.execute('''
                    CREATE INDEX IF NOT EXISTS idx_weather_location 
                    ON weather_data(location_name, fetched_at DESC)
                ''')
                await conn.execute('''
                    CREATE INDEX IF NOT EXISTS idx_earthquake_magnitude 
                    ON earthquake_data(magnitude DESC, fetched_at DESC)
                ''')
                await conn.execute('''
                    CREATE INDEX IF NOT EXISTS idx_fire_confidence 
                    ON fire_data(confidence_level, fetched_at DESC)
                ''')
            
            logger.info("Database initialized successfully")
            
        except Exception as e:
            logger.error(f"Failed to initialize database: {e}")
            self.pool = None
    
    async def close_database(self):
        """Close database connection pool"""
        if self.pool:
            await self.pool.close()
            logger.info("Database connection closed")
    
    async def fetch_and_store_weather(self):
        """Fetch weather data for monitored locations and store in DB"""
        if not self.pool:
            logger.warning("Database not connected, skipping weather fetch")
            return
        
        logger.info("Starting scheduled weather data fetch...")
        
        for location in MONITORED_LOCATIONS:
            try:
                weather = await fetch_weather_data(location["lat"], location["lon"])
                
                # Determine risk level
                risk_level = "low"
                if weather.rainfall_mm_1h and weather.rainfall_mm_1h > 20:
                    risk_level = "high"
                elif weather.wind_speed_mps > 15:
                    risk_level = "high"
                elif weather.rainfall_mm_1h and weather.rainfall_mm_1h > 10:
                    risk_level = "moderate"
                
                async with self.pool.acquire() as conn:
                    await conn.execute('''
                        INSERT INTO weather_data 
                        (location_name, latitude, longitude, temperature, humidity, 
                         wind_speed, rainfall_1h, weather_condition, risk_level)
                        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
                    ''', 
                        location["name"],
                        weather.latitude,
                        weather.longitude,
                        weather.temperature_celsius,
                        weather.humidity_percent,
                        weather.wind_speed_mps,
                        weather.rainfall_mm_1h or 0,
                        weather.weather_condition,
                        risk_level
                    )
                
                logger.info(f"Weather data stored for {location['name']}")
                
            except Exception as e:
                logger.error(f"Error fetching weather for {location['name']}: {e}")
        
        logger.info("Weather data fetch completed")
    
    async def fetch_and_store_earthquakes(self):
        """Fetch earthquake data and store significant events"""
        if not self.pool:
            logger.warning("Database not connected, skipping earthquake fetch")
            return
        
        logger.info("Starting scheduled earthquake data fetch...")
        
        try:
            earthquakes = await fetch_earthquake_data(
                min_magnitude=3.0,
                days_back=1,
                min_lat=6.0, max_lat=37.0,
                min_lon=68.0, max_lon=98.0,
                limit=100
            )
            
            async with self.pool.acquire() as conn:
                for eq in earthquakes:
                    try:
                        await conn.execute('''
                            INSERT INTO earthquake_data 
                            (earthquake_id, latitude, longitude, magnitude, depth_km, 
                             place, occurred_at, tsunami_warning)
                            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                            ON CONFLICT (earthquake_id) DO NOTHING
                        ''',
                            eq.id,
                            eq.latitude,
                            eq.longitude,
                            eq.magnitude,
                            eq.depth_km,
                            eq.place,
                            eq.time,
                            eq.tsunami_warning
                        )
                    except Exception as e:
                        logger.warning(f"Error storing earthquake {eq.id}: {e}")
            
            logger.info(f"Stored {len(earthquakes)} earthquake records")
            
        except Exception as e:
            logger.error(f"Error fetching earthquakes: {e}")
    
    async def fetch_and_store_fires(self):
        """Fetch fire hotspot data and store in DB"""
        if not self.pool:
            logger.warning("Database not connected, skipping fire fetch")
            return
        
        logger.info("Starting scheduled fire data fetch...")
        
        try:
            hotspots = await fetch_fire_data(
                source="VIIRS_SNPP_NRT",
                region="IND",
                days=1,
                min_confidence="medium"
            )
            
            async with self.pool.acquire() as conn:
                # Clear old fire data (keep only last 24 hours of records per fetch)
                await conn.execute('''
                    DELETE FROM fire_data 
                    WHERE fetched_at < NOW() - INTERVAL '24 hours'
                ''')
                
                for fire in hotspots:
                    try:
                        await conn.execute('''
                            INSERT INTO fire_data 
                            (latitude, longitude, brightness, confidence_level, 
                             frp, satellite, acquisition_date)
                            VALUES ($1, $2, $3, $4, $5, $6, $7)
                        ''',
                            fire.latitude,
                            fire.longitude,
                            fire.brightness,
                            fire.confidence_level,
                            fire.frp or 0,
                            fire.satellite,
                            datetime.strptime(fire.acquisition_date, "%Y-%m-%d").date()
                        )
                    except Exception as e:
                        logger.warning(f"Error storing fire hotspot: {e}")
            
            logger.info(f"Stored {len(hotspots)} fire hotspot records")
            
        except Exception as e:
            logger.error(f"Error fetching fire data: {e}")
    
    def start(self):
        """Start the scheduler with configured jobs"""
        if self._is_running:
            logger.warning("Scheduler is already running")
            return
        
        # Weather data: every 2 minutes
        self.scheduler.add_job(
            self.fetch_and_store_weather,
            trigger=IntervalTrigger(minutes=2),
            id="weather_fetch",
            name="Fetch Weather Data",
            replace_existing=True
        )
        
        # Earthquake data: every 5 minutes
        self.scheduler.add_job(
            self.fetch_and_store_earthquakes,
            trigger=IntervalTrigger(minutes=5),
            id="earthquake_fetch",
            name="Fetch Earthquake Data",
            replace_existing=True
        )
        
        # Fire data: every 10 minutes
        self.scheduler.add_job(
            self.fetch_and_store_fires,
            trigger=IntervalTrigger(minutes=10),
            id="fire_fetch",
            name="Fetch Fire Data",
            replace_existing=True
        )
        
        self.scheduler.start()
        self._is_running = True
        logger.info("Data scheduler started with jobs: weather(2min), earthquake(5min), fire(10min)")
    
    def stop(self):
        """Stop the scheduler"""
        if self._is_running:
            self.scheduler.shutdown()
            self._is_running = False
            logger.info("Data scheduler stopped")
    
    def get_job_status(self) -> dict:
        """Get status of all scheduled jobs"""
        jobs = []
        for job in self.scheduler.get_jobs():
            jobs.append({
                "id": job.id,
                "name": job.name,
                "next_run": job.next_run_time.isoformat() if job.next_run_time else None,
                "trigger": str(job.trigger)
            })
        return {
            "is_running": self._is_running,
            "jobs": jobs
        }


# Global scheduler instance
data_scheduler = DataScheduler()


@asynccontextmanager
async def lifespan_scheduler():
    """Context manager for scheduler lifecycle in FastAPI"""
    await data_scheduler.init_database()
    data_scheduler.start()
    
    # Run initial fetch on startup
    asyncio.create_task(data_scheduler.fetch_and_store_weather())
    asyncio.create_task(data_scheduler.fetch_and_store_earthquakes())
    asyncio.create_task(data_scheduler.fetch_and_store_fires())
    
    yield
    
    data_scheduler.stop()
    await data_scheduler.close_database()
