"""
Fire Hotspot Data Ingestion Module
Fetches fire data from NASA FIRMS (Fire Information for Resource Management System)
"""

import httpx
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime, timedelta
import os
import logging
import csv
from io import StringIO

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/fires", tags=["Fire Data"])

# NASA FIRMS API configuration
# Get API key from: https://firms.modaps.eosdis.nasa.gov/api/area/
NASA_FIRMS_API_KEY = os.getenv("NASA_FIRMS_API_KEY", "")
NASA_FIRMS_BASE_URL = "https://firms.modaps.eosdis.nasa.gov/api/area/csv"


class FireHotspot(BaseModel):
    """Structured fire hotspot data"""
    latitude: float
    longitude: float
    brightness: float
    scan: float
    track: float
    acquisition_date: str
    acquisition_time: str
    satellite: str
    instrument: str
    confidence: str  # 'low', 'nominal', 'high' for VIIRS; 0-100 for MODIS
    confidence_level: str  # Normalized: 'low', 'medium', 'high'
    version: Optional[str] = None
    bright_t31: Optional[float] = None
    frp: Optional[float] = None  # Fire Radiative Power
    daynight: str


class FireResponse(BaseModel):
    """API response wrapper"""
    success: bool
    count: int
    data: List[FireHotspot]
    metadata: dict
    error: Optional[str] = None


def normalize_confidence(confidence: str, instrument: str) -> str:
    """Normalize confidence levels across different satellite instruments"""
    if instrument == "VIIRS":
        # VIIRS uses 'low', 'nominal', 'high'
        mapping = {"l": "low", "n": "medium", "h": "high"}
        return mapping.get(confidence.lower()[0] if confidence else "l", "medium")
    else:
        # MODIS uses 0-100
        try:
            conf_val = int(confidence)
            if conf_val < 30:
                return "low"
            elif conf_val < 70:
                return "medium"
            else:
                return "high"
        except (ValueError, TypeError):
            return "medium"


async def fetch_fire_data(
    source: str = "VIIRS_SNPP_NRT",
    region: str = "IND",
    days: int = 1,
    min_confidence: Optional[str] = None
) -> List[FireHotspot]:
    """
    Fetch fire hotspot data from NASA FIRMS API
    
    Args:
        source: Satellite source (VIIRS_SNPP_NRT, VIIRS_NOAA20_NRT, MODIS_NRT)
        region: Region code (IND for India, world for global)
        days: Number of days (1-10)
        min_confidence: Minimum confidence filter ('low', 'medium', 'high')
    
    Returns:
        List of FireHotspot objects
    """
    if not NASA_FIRMS_API_KEY:
        raise HTTPException(
            status_code=500,
            detail="NASA FIRMS API key not configured. Get one at: https://firms.modaps.eosdis.nasa.gov/api/area/"
        )
    
    # Build URL: https://firms.modaps.eosdis.nasa.gov/api/area/csv/{API_KEY}/{SOURCE}/{REGION}/{DAYS}
    url = f"{NASA_FIRMS_BASE_URL}/{NASA_FIRMS_API_KEY}/{source}/{region}/{days}"
    
    async with httpx.AsyncClient(timeout=60.0) as client:
        try:
            response = await client.get(url)
            response.raise_for_status()
            
            # Parse CSV response
            csv_data = StringIO(response.text)
            reader = csv.DictReader(csv_data)
            
            fire_hotspots = []
            for row in reader:
                try:
                    instrument = "VIIRS" if "VIIRS" in source else "MODIS"
                    confidence_raw = row.get("confidence", "")
                    confidence_level = normalize_confidence(confidence_raw, instrument)
                    
                    # Filter by confidence if specified
                    if min_confidence:
                        confidence_order = {"low": 0, "medium": 1, "high": 2}
                        if confidence_order.get(confidence_level, 0) < confidence_order.get(min_confidence, 0):
                            continue
                    
                    hotspot = FireHotspot(
                        latitude=float(row["latitude"]),
                        longitude=float(row["longitude"]),
                        brightness=float(row.get("bright_ti4", row.get("brightness", 0))),
                        scan=float(row.get("scan", 0)),
                        track=float(row.get("track", 0)),
                        acquisition_date=row["acq_date"],
                        acquisition_time=row["acq_time"],
                        satellite=row.get("satellite", source.split("_")[0]),
                        instrument=instrument,
                        confidence=confidence_raw,
                        confidence_level=confidence_level,
                        version=row.get("version"),
                        bright_t31=float(row["bright_ti5"]) if row.get("bright_ti5") else None,
                        frp=float(row["frp"]) if row.get("frp") else None,
                        daynight=row.get("daynight", "D")
                    )
                    fire_hotspots.append(hotspot)
                except (KeyError, ValueError) as e:
                    logger.warning(f"Error parsing fire data row: {e}")
                    continue
            
            logger.info(f"Fetched {len(fire_hotspots)} fire hotspots for region {region}")
            return fire_hotspots
            
        except httpx.HTTPStatusError as e:
            logger.error(f"HTTP error fetching fire data: {e}")
            raise HTTPException(status_code=e.response.status_code, detail=str(e))
        except httpx.RequestError as e:
            logger.error(f"Request error fetching fire data: {e}")
            raise HTTPException(status_code=503, detail="NASA FIRMS service unavailable")


@router.get("/india", response_model=FireResponse)
async def get_india_fires(
    days: int = Query(1, ge=1, le=10, description="Days to look back (1-10)"),
    min_confidence: str = Query("medium", description="Minimum confidence level"),
    source: str = Query("VIIRS_SNPP_NRT", description="Satellite source")
):
    """
    Get fire hotspots in India
    
    - **days**: Number of days to look back (1-10)
    - **min_confidence**: Minimum confidence filter (low, medium, high)
    - **source**: VIIRS_SNPP_NRT, VIIRS_NOAA20_NRT, or MODIS_NRT
    """
    try:
        hotspots = await fetch_fire_data(
            source=source,
            region="IND",
            days=days,
            min_confidence=min_confidence
        )
        return FireResponse(
            success=True,
            count=len(hotspots),
            data=hotspots,
            metadata={
                "region": "India",
                "source": source,
                "days": days,
                "min_confidence": min_confidence
            }
        )
    except HTTPException as e:
        return FireResponse(
            success=False, count=0, data=[],
            metadata={}, error=e.detail
        )


@router.get("/by-country", response_model=FireResponse)
async def get_fires_by_country(
    country_code: str = Query(..., min_length=3, max_length=3, description="3-letter country code"),
    days: int = Query(1, ge=1, le=10),
    min_confidence: str = Query("medium"),
    source: str = Query("VIIRS_SNPP_NRT")
):
    """
    Get fire hotspots for a specific country
    
    Common country codes: IND (India), USA, AUS (Australia), BRA (Brazil)
    """
    try:
        hotspots = await fetch_fire_data(
            source=source,
            region=country_code.upper(),
            days=days,
            min_confidence=min_confidence
        )
        return FireResponse(
            success=True,
            count=len(hotspots),
            data=hotspots,
            metadata={
                "country_code": country_code.upper(),
                "source": source,
                "days": days,
                "min_confidence": min_confidence
            }
        )
    except HTTPException as e:
        return FireResponse(
            success=False, count=0, data=[],
            metadata={}, error=e.detail
        )


@router.get("/summary", response_model=dict)
async def get_fire_summary(
    days: int = Query(1, ge=1, le=10)
):
    """
    Get a summary of fire activity in India with risk analysis
    """
    try:
        hotspots = await fetch_fire_data(
            source="VIIRS_SNPP_NRT",
            region="IND",
            days=days,
            min_confidence="low"  # Get all to calculate stats
        )
        
        # Calculate statistics
        high_confidence = [h for h in hotspots if h.confidence_level == "high"]
        medium_confidence = [h for h in hotspots if h.confidence_level == "medium"]
        
        # Group by date
        by_date = {}
        for h in hotspots:
            date = h.acquisition_date
            by_date[date] = by_date.get(date, 0) + 1
        
        # Calculate average FRP (Fire Radiative Power) for intensity
        frp_values = [h.frp for h in hotspots if h.frp]
        avg_frp = sum(frp_values) / len(frp_values) if frp_values else 0
        
        # Determine risk level
        risk_level = "low"
        if len(high_confidence) > 50:
            risk_level = "critical"
        elif len(high_confidence) > 20:
            risk_level = "high"
        elif len(hotspots) > 100:
            risk_level = "moderate"
        
        return {
            "success": True,
            "summary": {
                "total_hotspots": len(hotspots),
                "high_confidence_count": len(high_confidence),
                "medium_confidence_count": len(medium_confidence),
                "average_frp": round(avg_frp, 2),
                "risk_level": risk_level
            },
            "by_date": by_date,
            "high_intensity_fires": [
                h.model_dump() for h in sorted(
                    [h for h in hotspots if h.frp],
                    key=lambda x: x.frp or 0,
                    reverse=True
                )[:10]
            ],
            "metadata": {
                "region": "India",
                "days_analyzed": days,
                "source": "VIIRS_SNPP_NRT"
            },
            "timestamp": datetime.utcnow().isoformat()
        }
    except HTTPException as e:
        return {"success": False, "error": e.detail}


@router.get("/cluster-analysis", response_model=dict)
async def analyze_fire_clusters(
    days: int = Query(1, ge=1, le=10),
    cluster_radius_km: float = Query(50.0, gt=0)
):
    """
    Analyze fire hotspots to identify clusters indicating larger fire events
    """
    try:
        hotspots = await fetch_fire_data(
            source="VIIRS_SNPP_NRT",
            region="IND",
            days=days,
            min_confidence="medium"
        )
        
        if not hotspots:
            return {
                "success": True,
                "clusters": [],
                "message": "No fire hotspots found"
            }
        
        # Simple clustering based on proximity (in production, use proper clustering)
        from math import radians, sin, cos, sqrt, atan2
        
        def haversine(lat1, lon1, lat2, lon2):
            R = 6371  # Earth's radius in km
            lat1, lon1, lat2, lon2 = map(radians, [lat1, lon1, lat2, lon2])
            dlat = lat2 - lat1
            dlon = lon2 - lon1
            a = sin(dlat/2)**2 + cos(lat1) * cos(lat2) * sin(dlon/2)**2
            return 2 * R * atan2(sqrt(a), sqrt(1-a))
        
        # Group nearby fires
        clusters = []
        used = set()
        
        for i, h1 in enumerate(hotspots):
            if i in used:
                continue
            
            cluster = [h1]
            used.add(i)
            
            for j, h2 in enumerate(hotspots):
                if j in used:
                    continue
                if haversine(h1.latitude, h1.longitude, h2.latitude, h2.longitude) <= cluster_radius_km:
                    cluster.append(h2)
                    used.add(j)
            
            if len(cluster) >= 3:  # Only report clusters with 3+ hotspots
                avg_lat = sum(h.latitude for h in cluster) / len(cluster)
                avg_lon = sum(h.longitude for h in cluster) / len(cluster)
                clusters.append({
                    "center_lat": round(avg_lat, 4),
                    "center_lon": round(avg_lon, 4),
                    "hotspot_count": len(cluster),
                    "total_frp": sum(h.frp or 0 for h in cluster),
                    "severity": "high" if len(cluster) > 10 else "moderate"
                })
        
        return {
            "success": True,
            "total_hotspots": len(hotspots),
            "cluster_count": len(clusters),
            "clusters": sorted(clusters, key=lambda x: x["hotspot_count"], reverse=True)[:20],
            "metadata": {
                "cluster_radius_km": cluster_radius_km,
                "days_analyzed": days
            },
            "timestamp": datetime.utcnow().isoformat()
        }
    except HTTPException as e:
        return {"success": False, "error": e.detail}
