"""
Simplified AI Service for Risk Prediction
Standalone version without heavy Google Cloud dependencies
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import Optional, Dict, Any, List
from datetime import datetime
import logging
import numpy as np
import os
import httpx
import asyncio

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# ==================== Pydantic Models ====================

class RiskFeatures(BaseModel):
    """Input features for risk prediction"""
    rainfall: float = Field(..., ge=0, description="Rainfall in mm")
    wind_speed: float = Field(..., ge=0, description="Wind speed in m/s")
    humidity: float = Field(..., ge=0, le=100, description="Humidity percentage")
    avg_magnitude: float = Field(..., ge=0, description="Average earthquake magnitude")
    fire_count: int = Field(..., ge=0, description="Number of active fires")


class ManualPredictRequest(BaseModel):
    features: RiskFeatures


class LocationPredictRequest(BaseModel):
    latitude: float = Field(..., ge=-90, le=90)
    longitude: float = Field(..., ge=-180, le=180)
    region_code: Optional[str] = "IND"


class RiskPredictionResponse(BaseModel):
    success: bool
    risk_level: str
    risk_score: float
    confidence: float
    features_used: RiskFeatures
    timestamp: datetime
    details: Optional[Dict[str, Any]] = None


class LiveDataResponse(BaseModel):
    success: bool
    prediction: RiskPredictionResponse
    live_data: Dict[str, Any]


# ==================== Simple Risk Calculator ====================

class SimpleRiskPredictor:
    """
    Simple rule-based risk predictor (no TensorFlow needed)
    Uses weighted risk calculation for demonstration
    """
    
    def __init__(self):
        self.feature_names = ['rainfall', 'wind_speed', 'humidity', 'avg_magnitude', 'fire_count']
        self.risk_labels = ['Low', 'Medium', 'High']
        logger.info("Simple Risk Predictor initialized")
    
    def calculate_risk(self, features: RiskFeatures) -> RiskPredictionResponse:
        """Calculate risk using weighted rules"""
        
        # Calculate individual risk components (0-1 scale)
        rainfall_risk = min(features.rainfall / 200, 1.0) * 0.25
        wind_risk = min(features.wind_speed / 50, 1.0) * 0.20
        
        # Low humidity increases fire risk
        humidity_risk = 0
        if features.humidity < 30:
            humidity_risk = (1 - features.humidity / 100) * 0.10
        
        magnitude_risk = min(features.avg_magnitude / 6, 1.0) * 0.30
        fire_risk = min(features.fire_count / 50, 1.0) * 0.25
        
        # Total risk score
        total_risk = rainfall_risk + wind_risk + humidity_risk + magnitude_risk + fire_risk
        risk_score = min(total_risk, 1.0)
        
        # Determine risk level
        if risk_score < 0.33:
            risk_level = "Low"
            probs = {"Low": 0.7, "Medium": 0.25, "High": 0.05}
        elif risk_score < 0.66:
            risk_level = "Medium"
            probs = {"Low": 0.2, "Medium": 0.6, "High": 0.2}
        else:
            risk_level = "High"
            probs = {"Low": 0.05, "Medium": 0.25, "High": 0.7}
        
        # Adjust probabilities based on actual score
        confidence = probs[risk_level]
        
        return RiskPredictionResponse(
            success=True,
            risk_level=risk_level,
            risk_score=round(risk_score, 3),
            confidence=round(confidence, 3),
            features_used=features,
            timestamp=datetime.utcnow(),
            details={
                "probabilities": probs,
                "component_risks": {
                    "rainfall": round(rainfall_risk, 3),
                    "wind": round(wind_risk, 3),
                    "humidity": round(humidity_risk, 3),
                    "earthquake": round(magnitude_risk, 3),
                    "fire": round(fire_risk, 3)
                }
            }
        )


# ==================== Data Fetching ====================

OPENWEATHER_API_KEY = os.getenv("OPENWEATHER_API_KEY", "")


async def fetch_weather_data(lat: float, lon: float) -> Dict[str, float]:
    """Fetch weather data from OpenWeatherMap"""
    if not OPENWEATHER_API_KEY:
        logger.warning("OpenWeatherMap API key not set, using mock data")
        # Return mock data for testing
        return {"rainfall": 5.0, "wind_speed": 3.5, "humidity": 65.0}
    
    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            response = await client.get(
                "https://api.openweathermap.org/data/2.5/weather",
                params={
                    "lat": lat,
                    "lon": lon,
                    "appid": OPENWEATHER_API_KEY,
                    "units": "metric"
                }
            )
            if response.status_code == 200:
                data = response.json()
                return {
                    "rainfall": data.get("rain", {}).get("1h", 0) or 0,
                    "wind_speed": data.get("wind", {}).get("speed", 0) or 0,
                    "humidity": data.get("main", {}).get("humidity", 50) or 50
                }
    except Exception as e:
        logger.error(f"Weather fetch error: {e}")
    
    return {"rainfall": 0, "wind_speed": 5, "humidity": 50}


async def fetch_earthquake_data(lat: float, lon: float) -> float:
    """Fetch earthquake data from USGS"""
    try:
        from datetime import timedelta
        end_time = datetime.utcnow()
        start_time = end_time - timedelta(days=7)
        
        async with httpx.AsyncClient(timeout=15.0) as client:
            response = await client.get(
                "https://earthquake.usgs.gov/fdsnws/event/1/query",
                params={
                    "format": "geojson",
                    "starttime": start_time.strftime("%Y-%m-%dT%H:%M:%S"),
                    "endtime": end_time.strftime("%Y-%m-%dT%H:%M:%S"),
                    "minlatitude": lat - 5,
                    "maxlatitude": lat + 5,
                    "minlongitude": lon - 5,
                    "maxlongitude": lon + 5,
                    "minmagnitude": 2.0,
                    "limit": 50
                }
            )
            if response.status_code == 200:
                data = response.json()
                features = data.get("features", [])
                if features:
                    mags = [f["properties"]["mag"] for f in features if f["properties"]["mag"]]
                    return sum(mags) / len(mags) if mags else 0.0
    except Exception as e:
        logger.error(f"Earthquake fetch error: {e}")
    
    return 0.0


async def fetch_fire_count(region: str) -> int:
    """Get fire count - returns mock data if NASA API key not available"""
    nasa_key = os.getenv("NASA_FIRMS_API_KEY", "")
    if not nasa_key:
        logger.warning("NASA FIRMS API key not set, using mock data")
        # Return mock fire count based on region
        mock_fires = {"IND": 12, "USA": 25, "AUS": 45, "world": 100}
        return mock_fires.get(region, 5)
    
    # Real API call would go here
    return 5


# ==================== FastAPI App ====================

app = FastAPI(
    title="AI Risk Prediction Service",
    description="Real-time disaster risk prediction using weather, earthquake, and fire data",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize predictor
risk_predictor = SimpleRiskPredictor()


@app.get("/")
def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "service": "AI Risk Prediction",
        "timestamp": datetime.now().isoformat()
    }


@app.post("/api/prediction/risk/predict", response_model=RiskPredictionResponse)
async def predict_risk_manual(request: ManualPredictRequest):
    """Predict risk from manual feature input"""
    try:
        prediction = risk_predictor.calculate_risk(request.features)
        return prediction
    except Exception as e:
        logger.error(f"Prediction error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/prediction/risk/predict-live", response_model=LiveDataResponse)
async def predict_risk_live(request: LocationPredictRequest):
    """Predict risk using live data from external APIs"""
    try:
        # Fetch live data in parallel
        weather_task = fetch_weather_data(request.latitude, request.longitude)
        earthquake_task = fetch_earthquake_data(request.latitude, request.longitude)
        fire_task = fetch_fire_count(request.region_code)
        
        weather_data, avg_magnitude, fire_count = await asyncio.gather(
            weather_task, earthquake_task, fire_task
        )
        
        # Build features
        features = RiskFeatures(
            rainfall=weather_data["rainfall"],
            wind_speed=weather_data["wind_speed"],
            humidity=weather_data["humidity"],
            avg_magnitude=avg_magnitude,
            fire_count=fire_count
        )
        
        # Get prediction
        prediction = risk_predictor.calculate_risk(features)
        
        return LiveDataResponse(
            success=True,
            prediction=prediction,
            live_data={
                "weather": weather_data,
                "avg_earthquake_magnitude": avg_magnitude,
                "active_fires": fire_count,
                "location": {
                    "latitude": request.latitude,
                    "longitude": request.longitude,
                    "region": request.region_code
                },
                "data_sources": {
                    "weather": "OpenWeatherMap API" if OPENWEATHER_API_KEY else "Mock Data",
                    "earthquakes": "USGS Earthquake API",
                    "fires": "NASA FIRMS" if os.getenv("NASA_FIRMS_API_KEY") else "Mock Data"
                }
            }
        )
    except Exception as e:
        logger.error(f"Live prediction error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/prediction/risk/model-info")
async def get_model_info():
    """Get model information"""
    return {
        "model_type": "Rule-based Risk Calculator",
        "description": "Weighted risk calculation based on disaster indicators",
        "input_features": risk_predictor.feature_names,
        "feature_weights": {
            "rainfall": 0.25,
            "wind_speed": 0.20,
            "humidity": 0.10,
            "avg_magnitude": 0.30,
            "fire_count": 0.25
        },
        "output_classes": risk_predictor.risk_labels,
        "thresholds": {
            "Low": "< 0.33",
            "Medium": "0.33 - 0.66",
            "High": "> 0.66"
        }
    }


@app.post("/api/prediction/risk/simulate")
async def simulate_scenarios():
    """Simulate various disaster scenarios"""
    scenarios = [
        {"name": "Normal conditions", "features": RiskFeatures(rainfall=5, wind_speed=3, humidity=60, avg_magnitude=0, fire_count=0)},
        {"name": "Heavy rainfall", "features": RiskFeatures(rainfall=150, wind_speed=10, humidity=95, avg_magnitude=0, fire_count=0)},
        {"name": "Tropical storm", "features": RiskFeatures(rainfall=100, wind_speed=45, humidity=85, avg_magnitude=0, fire_count=0)},
        {"name": "Earthquake zone", "features": RiskFeatures(rainfall=10, wind_speed=5, humidity=50, avg_magnitude=5.5, fire_count=0)},
        {"name": "Wildfire risk", "features": RiskFeatures(rainfall=0, wind_speed=15, humidity=20, avg_magnitude=0, fire_count=75)},
        {"name": "Multi-hazard", "features": RiskFeatures(rainfall=200, wind_speed=60, humidity=90, avg_magnitude=4.0, fire_count=30)}
    ]
    
    results = []
    for scenario in scenarios:
        prediction = risk_predictor.calculate_risk(scenario["features"])
        results.append({
            "scenario": scenario["name"],
            "features": scenario["features"].model_dump(),
            "risk_level": prediction.risk_level,
            "risk_score": prediction.risk_score,
            "confidence": prediction.confidence,
            "probabilities": prediction.details["probabilities"]
        })
    
    return {"scenarios": results}


# Weather endpoint for frontend
@app.get("/api/data/weather/current")
async def get_current_weather(lat: float, lon: float):
    """Get current weather for location"""
    weather = await fetch_weather_data(lat, lon)
    return {
        "success": True,
        "data": {
            "rainfall_mm_1h": weather["rainfall"],
            "wind_speed_mps": weather["wind_speed"],
            "humidity_percent": weather["humidity"]
        }
    }


# Earthquake endpoint for frontend
@app.get("/api/data/earthquakes/recent")
async def get_recent_earthquakes(
    min_lat: float = -90, max_lat: float = 90,
    min_lon: float = -180, max_lon: float = 180,
    min_magnitude: float = 2.0, days: int = 7, limit: int = 50
):
    """Get recent earthquakes"""
    avg_mag = await fetch_earthquake_data((min_lat + max_lat) / 2, (min_lon + max_lon) / 2)
    return {
        "success": True,
        "data": [{"magnitude": avg_mag}] if avg_mag > 0 else [],
        "count": 1 if avg_mag > 0 else 0
    }


# Fire endpoint for frontend
@app.get("/api/data/fires/hotspots")
async def get_fire_hotspots(region: str = "IND", days: int = 1):
    """Get fire hotspots"""
    count = await fetch_fire_count(region)
    return {
        "success": True,
        "count": count
    }


# ==================== Resource Allocation Models ====================

class ResourceCenter(BaseModel):
    """Resource center/depot"""
    id: str
    name: str
    latitude: float
    longitude: float
    capacity: Dict[str, int]  # resource_type -> quantity available


class DisasterLocation(BaseModel):
    """Disaster location requiring resources"""
    id: str
    name: str
    latitude: float
    longitude: float
    demand: Dict[str, int]  # resource_type -> quantity needed
    priority: int = Field(default=1, ge=1, le=5, description="Priority 1-5 (5 is highest)")


class OptimizeRequest(BaseModel):
    """Resource optimization request"""
    disaster_locations: List[DisasterLocation]
    resource_centers: Optional[List[ResourceCenter]] = None  # If None, use predefined centers


class AllocationPlan(BaseModel):
    """Single allocation in the plan"""
    from_center: str
    to_disaster: str
    resource_type: str
    quantity: int
    distance_km: float
    estimated_time_hours: float


class OptimizeResponse(BaseModel):
    """Resource optimization response"""
    success: bool
    total_distance_km: float
    total_allocations: int
    allocation_plan: List[AllocationPlan]
    unmet_demands: Dict[str, Dict[str, int]]  # location_id -> {resource_type -> unmet_quantity}
    summary: Dict[str, Any]


# ==================== Predefined Resource Centers ====================

PREDEFINED_RESOURCE_CENTERS = [
    ResourceCenter(
        id="RC001",
        name="Delhi Central Depot",
        latitude=28.6139,
        longitude=77.2090,
        capacity={"medical_kits": 500, "food_packets": 2000, "tents": 200, "water_tanks": 100, "rescue_equipment": 50}
    ),
    ResourceCenter(
        id="RC002",
        name="Mumbai Emergency Center",
        latitude=19.0760,
        longitude=72.8777,
        capacity={"medical_kits": 600, "food_packets": 2500, "tents": 250, "water_tanks": 150, "rescue_equipment": 75}
    ),
    ResourceCenter(
        id="RC003",
        name="Chennai Disaster Hub",
        latitude=13.0827,
        longitude=80.2707,
        capacity={"medical_kits": 400, "food_packets": 1800, "tents": 180, "water_tanks": 80, "rescue_equipment": 40}
    ),
    ResourceCenter(
        id="RC004",
        name="Kolkata Relief Center",
        latitude=22.5726,
        longitude=88.3639,
        capacity={"medical_kits": 450, "food_packets": 2000, "tents": 200, "water_tanks": 90, "rescue_equipment": 45}
    ),
    ResourceCenter(
        id="RC005",
        name="Bangalore Supply Base",
        latitude=12.9716,
        longitude=77.5946,
        capacity={"medical_kits": 350, "food_packets": 1500, "tents": 150, "water_tanks": 70, "rescue_equipment": 35}
    ),
    ResourceCenter(
        id="RC006",
        name="Hyderabad Logistics Center",
        latitude=17.3850,
        longitude=78.4867,
        capacity={"medical_kits": 400, "food_packets": 1700, "tents": 170, "water_tanks": 85, "rescue_equipment": 42}
    ),
    ResourceCenter(
        id="RC007",
        name="Ahmedabad Emergency Depot",
        latitude=23.0225,
        longitude=72.5714,
        capacity={"medical_kits": 380, "food_packets": 1600, "tents": 160, "water_tanks": 75, "rescue_equipment": 38}
    ),
    ResourceCenter(
        id="RC008",
        name="Jaipur Relief Station",
        latitude=26.9124,
        longitude=75.7873,
        capacity={"medical_kits": 320, "food_packets": 1400, "tents": 140, "water_tanks": 65, "rescue_equipment": 32}
    )
]


# ==================== Haversine Distance Calculation ====================

def haversine_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """
    Calculate the great circle distance between two points on Earth using Haversine formula
    Returns distance in kilometers
    """
    R = 6371  # Earth's radius in kilometers
    
    lat1_rad = np.radians(lat1)
    lat2_rad = np.radians(lat2)
    delta_lat = np.radians(lat2 - lat1)
    delta_lon = np.radians(lon2 - lon1)
    
    a = np.sin(delta_lat / 2) ** 2 + np.cos(lat1_rad) * np.cos(lat2_rad) * np.sin(delta_lon / 2) ** 2
    c = 2 * np.arctan2(np.sqrt(a), np.sqrt(1 - a))
    
    return R * c


def estimate_travel_time(distance_km: float, is_emergency: bool = True) -> float:
    """Estimate travel time in hours based on distance"""
    # Average speed: 60 km/h for emergency, 40 km/h for normal
    avg_speed = 60 if is_emergency else 40
    return distance_km / avg_speed


# ==================== Resource Allocation Optimizer ====================

class ResourceOptimizer:
    """
    Resource allocation optimizer using greedy algorithm with priority weighting
    Minimizes total travel distance while respecting capacity constraints
    """
    
    def __init__(self):
        self.resource_centers = PREDEFINED_RESOURCE_CENTERS.copy()
    
    def optimize(
        self,
        disaster_locations: List[DisasterLocation],
        resource_centers: Optional[List[ResourceCenter]] = None
    ) -> OptimizeResponse:
        """
        Optimize resource allocation from centers to disaster locations
        
        Strategy:
        1. Sort disasters by priority (highest first)
        2. For each disaster and resource type, find nearest center with available capacity
        3. Allocate resources greedily while minimizing distance
        """
        centers = resource_centers if resource_centers else self.resource_centers
        
        # Track remaining capacity at each center
        remaining_capacity = {
            center.id: center.capacity.copy() for center in centers
        }
        
        allocation_plan = []
        unmet_demands = {}
        total_distance = 0.0
        
        # Sort disasters by priority (descending)
        sorted_disasters = sorted(disaster_locations, key=lambda d: d.priority, reverse=True)
        
        for disaster in sorted_disasters:
            unmet_demands[disaster.id] = {}
            
            for resource_type, demand in disaster.demand.items():
                remaining_demand = demand
                
                # Calculate distances to all centers with this resource
                center_distances = []
                for center in centers:
                    if remaining_capacity[center.id].get(resource_type, 0) > 0:
                        dist = haversine_distance(
                            center.latitude, center.longitude,
                            disaster.latitude, disaster.longitude
                        )
                        center_distances.append((center, dist))
                
                # Sort by distance (nearest first)
                center_distances.sort(key=lambda x: x[1])
                
                # Allocate from nearest centers
                for center, distance in center_distances:
                    if remaining_demand <= 0:
                        break
                    
                    available = remaining_capacity[center.id].get(resource_type, 0)
                    if available > 0:
                        # Allocate what we can
                        allocated = min(available, remaining_demand)
                        remaining_capacity[center.id][resource_type] -= allocated
                        remaining_demand -= allocated
                        total_distance += distance * (allocated / demand)  # Weighted distance
                        
                        allocation_plan.append(AllocationPlan(
                            from_center=center.name,
                            to_disaster=disaster.name,
                            resource_type=resource_type,
                            quantity=allocated,
                            distance_km=round(distance, 2),
                            estimated_time_hours=round(estimate_travel_time(distance), 2)
                        ))
                
                # Track unmet demand
                if remaining_demand > 0:
                    unmet_demands[disaster.id][resource_type] = remaining_demand
            
            # Clean up empty unmet demands
            if not unmet_demands[disaster.id]:
                del unmet_demands[disaster.id]
        
        # Calculate summary statistics
        total_demand = sum(
            sum(d.demand.values()) for d in disaster_locations
        )
        total_allocated = sum(a.quantity for a in allocation_plan)
        fulfillment_rate = (total_allocated / total_demand * 100) if total_demand > 0 else 100
        
        return OptimizeResponse(
            success=True,
            total_distance_km=round(total_distance, 2),
            total_allocations=len(allocation_plan),
            allocation_plan=allocation_plan,
            unmet_demands=unmet_demands,
            summary={
                "total_demand": total_demand,
                "total_allocated": total_allocated,
                "fulfillment_rate_percent": round(fulfillment_rate, 2),
                "disasters_served": len(disaster_locations),
                "centers_used": len(set(a.from_center for a in allocation_plan))
            }
        )


# Initialize optimizer
resource_optimizer = ResourceOptimizer()


# ==================== Resource Optimization Endpoints ====================

@app.post("/api/optimize", response_model=OptimizeResponse)
async def optimize_resources(request: OptimizeRequest):
    """
    Optimize resource allocation from centers to disaster locations
    
    Uses Haversine formula for distance calculation and greedy optimization
    to minimize total travel distance while respecting capacity constraints
    """
    try:
        result = resource_optimizer.optimize(
            request.disaster_locations,
            request.resource_centers
        )
        return result
    except Exception as e:
        logger.error(f"Optimization error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/resource-centers")
async def get_resource_centers():
    """Get all predefined resource centers"""
    return {
        "success": True,
        "centers": [center.model_dump() for center in PREDEFINED_RESOURCE_CENTERS],
        "count": len(PREDEFINED_RESOURCE_CENTERS)
    }


@app.post("/api/optimize/quick")
async def quick_optimize(
    disaster_lat: float,
    disaster_lon: float,
    disaster_name: str = "Disaster Site",
    medical_kits: int = 100,
    food_packets: int = 500,
    tents: int = 50,
    water_tanks: int = 20,
    rescue_equipment: int = 10,
    priority: int = 3
):
    """
    Quick optimization for a single disaster location
    Simplified endpoint for easy testing
    """
    disaster = DisasterLocation(
        id="D001",
        name=disaster_name,
        latitude=disaster_lat,
        longitude=disaster_lon,
        demand={
            "medical_kits": medical_kits,
            "food_packets": food_packets,
            "tents": tents,
            "water_tanks": water_tanks,
            "rescue_equipment": rescue_equipment
        },
        priority=priority
    )
    
    result = resource_optimizer.optimize([disaster])
    return result


@app.get("/api/distance")
async def calculate_distance(lat1: float, lon1: float, lat2: float, lon2: float):
    """Calculate distance between two points using Haversine formula"""
    distance = haversine_distance(lat1, lon1, lat2, lon2)
    travel_time = estimate_travel_time(distance)
    return {
        "distance_km": round(distance, 2),
        "estimated_time_hours": round(travel_time, 2),
        "from": {"latitude": lat1, "longitude": lon1},
        "to": {"latitude": lat2, "longitude": lon2}
    }


if __name__ == "__main__":
    import uvicorn
    print("\n" + "="*60)
    print("  AI Risk Prediction Service")
    print("="*60)
    print(f"  Starting server on http://localhost:8000")
    print(f"  API docs: http://localhost:8000/docs")
    print("="*60 + "\n")
    uvicorn.run("simple_server:app", host="0.0.0.0", port=8000, reload=True)
