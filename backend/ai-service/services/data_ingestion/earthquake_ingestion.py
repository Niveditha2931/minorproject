"""
Earthquake Data Ingestion Module
Fetches real-time earthquake data from USGS API (no API key required)
"""

import httpx
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime, timedelta
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/earthquakes", tags=["Earthquake Data"])

# USGS Earthquake API endpoints
USGS_BASE_URL = "https://earthquake.usgs.gov/fdsnws/event/1/query"


class EarthquakeData(BaseModel):
    """Structured earthquake data"""
    id: str
    latitude: float
    longitude: float
    depth_km: float
    magnitude: float
    magnitude_type: str
    place: str
    time: datetime
    updated: Optional[datetime] = None
    tsunami_warning: bool
    alert_level: Optional[str] = None
    significance: int
    felt_reports: Optional[int] = None
    url: str


class EarthquakeResponse(BaseModel):
    """API response wrapper"""
    success: bool
    count: int
    data: List[EarthquakeData]
    metadata: dict
    error: Optional[str] = None


async def fetch_earthquake_data(
    min_magnitude: float = 3.0,
    days_back: int = 1,
    min_lat: Optional[float] = None,
    max_lat: Optional[float] = None,
    min_lon: Optional[float] = None,
    max_lon: Optional[float] = None,
    limit: int = 100
) -> List[EarthquakeData]:
    """
    Fetch real-time earthquake data from USGS API
    
    Args:
        min_magnitude: Minimum magnitude to filter (default: 3.0)
        days_back: Number of days to look back (default: 1)
        min_lat, max_lat, min_lon, max_lon: Bounding box for region filter
        limit: Maximum number of results
    
    Returns:
        List of EarthquakeData objects
    """
    end_time = datetime.utcnow()
    start_time = end_time - timedelta(days=days_back)
    
    params = {
        "format": "geojson",
        "starttime": start_time.strftime("%Y-%m-%dT%H:%M:%S"),
        "endtime": end_time.strftime("%Y-%m-%dT%H:%M:%S"),
        "minmagnitude": min_magnitude,
        "limit": limit,
        "orderby": "time"
    }
    
    # Add bounding box if specified
    if all([min_lat, max_lat, min_lon, max_lon]):
        params.update({
            "minlatitude": min_lat,
            "maxlatitude": max_lat,
            "minlongitude": min_lon,
            "maxlongitude": max_lon
        })
    
    async with httpx.AsyncClient(timeout=30.0) as client:
        try:
            response = await client.get(USGS_BASE_URL, params=params)
            response.raise_for_status()
            data = response.json()
            
            earthquakes = []
            for feature in data.get("features", []):
                props = feature["properties"]
                coords = feature["geometry"]["coordinates"]
                
                earthquake = EarthquakeData(
                    id=feature["id"],
                    latitude=coords[1],
                    longitude=coords[0],
                    depth_km=coords[2],
                    magnitude=props["mag"],
                    magnitude_type=props.get("magType", "unknown"),
                    place=props["place"] or "Unknown location",
                    time=datetime.utcfromtimestamp(props["time"] / 1000),
                    updated=datetime.utcfromtimestamp(props["updated"] / 1000) if props.get("updated") else None,
                    tsunami_warning=bool(props.get("tsunami", 0)),
                    alert_level=props.get("alert"),
                    significance=props.get("sig", 0),
                    felt_reports=props.get("felt"),
                    url=props.get("url", "")
                )
                earthquakes.append(earthquake)
            
            logger.info(f"Fetched {len(earthquakes)} earthquakes with magnitude >= {min_magnitude}")
            return earthquakes
            
        except httpx.HTTPStatusError as e:
            logger.error(f"HTTP error fetching earthquake data: {e}")
            raise HTTPException(status_code=e.response.status_code, detail=str(e))
        except httpx.RequestError as e:
            logger.error(f"Request error fetching earthquake data: {e}")
            raise HTTPException(status_code=503, detail="USGS earthquake service unavailable")


@router.get("/recent", response_model=EarthquakeResponse)
async def get_recent_earthquakes(
    min_magnitude: float = Query(3.0, ge=0, le=10, description="Minimum magnitude"),
    days: int = Query(1, ge=1, le=30, description="Days to look back"),
    limit: int = Query(50, ge=1, le=500, description="Maximum results")
):
    """
    Get recent earthquakes worldwide filtered by magnitude
    
    - **min_magnitude**: Minimum earthquake magnitude (0-10, default: 3.0)
    - **days**: Number of days to look back (1-30, default: 1)
    - **limit**: Maximum number of results (1-500, default: 50)
    """
    try:
        earthquakes = await fetch_earthquake_data(
            min_magnitude=min_magnitude,
            days_back=days,
            limit=limit
        )
        return EarthquakeResponse(
            success=True,
            count=len(earthquakes),
            data=earthquakes,
            metadata={
                "min_magnitude": min_magnitude,
                "time_range_days": days,
                "source": "USGS"
            }
        )
    except HTTPException as e:
        return EarthquakeResponse(
            success=False, count=0, data=[], 
            metadata={}, error=e.detail
        )


@router.get("/india", response_model=EarthquakeResponse)
async def get_india_earthquakes(
    min_magnitude: float = Query(3.0, ge=0, le=10),
    days: int = Query(7, ge=1, le=30)
):
    """
    Get recent earthquakes in and around India region
    
    Covers: India, Nepal, Bangladesh, Pakistan, Sri Lanka
    """
    try:
        # India region bounding box (approximate)
        earthquakes = await fetch_earthquake_data(
            min_magnitude=min_magnitude,
            days_back=days,
            min_lat=6.0,    # Southern tip of India
            max_lat=37.0,   # Northern Kashmir
            min_lon=68.0,   # Western border
            max_lon=98.0,   # Eastern border (includes Northeast)
            limit=200
        )
        return EarthquakeResponse(
            success=True,
            count=len(earthquakes),
            data=earthquakes,
            metadata={
                "region": "India and surrounding areas",
                "min_magnitude": min_magnitude,
                "time_range_days": days,
                "source": "USGS"
            }
        )
    except HTTPException as e:
        return EarthquakeResponse(
            success=False, count=0, data=[], 
            metadata={}, error=e.detail
        )


@router.get("/by-region", response_model=EarthquakeResponse)
async def get_earthquakes_by_region(
    min_lat: float = Query(..., ge=-90, le=90),
    max_lat: float = Query(..., ge=-90, le=90),
    min_lon: float = Query(..., ge=-180, le=180),
    max_lon: float = Query(..., ge=-180, le=180),
    min_magnitude: float = Query(3.0, ge=0, le=10),
    days: int = Query(7, ge=1, le=30)
):
    """
    Get earthquakes within a custom bounding box
    """
    try:
        earthquakes = await fetch_earthquake_data(
            min_magnitude=min_magnitude,
            days_back=days,
            min_lat=min_lat,
            max_lat=max_lat,
            min_lon=min_lon,
            max_lon=max_lon,
            limit=200
        )
        return EarthquakeResponse(
            success=True,
            count=len(earthquakes),
            data=earthquakes,
            metadata={
                "bounding_box": {
                    "min_lat": min_lat, "max_lat": max_lat,
                    "min_lon": min_lon, "max_lon": max_lon
                },
                "min_magnitude": min_magnitude,
                "time_range_days": days,
                "source": "USGS"
            }
        )
    except HTTPException as e:
        return EarthquakeResponse(
            success=False, count=0, data=[], 
            metadata={}, error=e.detail
        )


@router.get("/significant", response_model=dict)
async def get_significant_earthquakes():
    """
    Get significant earthquakes from the past 24 hours
    (magnitude >= 5.0 or high significance score)
    """
    try:
        earthquakes = await fetch_earthquake_data(
            min_magnitude=5.0,
            days_back=1,
            limit=50
        )
        
        # Categorize by severity
        critical = [e for e in earthquakes if e.magnitude >= 7.0]
        severe = [e for e in earthquakes if 6.0 <= e.magnitude < 7.0]
        moderate = [e for e in earthquakes if 5.0 <= e.magnitude < 6.0]
        
        return {
            "success": True,
            "summary": {
                "total": len(earthquakes),
                "critical_count": len(critical),
                "severe_count": len(severe),
                "moderate_count": len(moderate)
            },
            "critical": [e.model_dump() for e in critical],
            "severe": [e.model_dump() for e in severe],
            "moderate": [e.model_dump() for e in moderate],
            "timestamp": datetime.utcnow().isoformat()
        }
    except HTTPException as e:
        return {"success": False, "error": e.detail}
