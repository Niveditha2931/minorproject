"""
LSTM Risk Prediction Model
Real-time disaster risk classification using live data from weather, earthquake, and fire APIs
"""

import numpy as np
import tensorflow as tf
from tensorflow.keras.models import Sequential, load_model
from tensorflow.keras.layers import LSTM, Dense, Dropout, BatchNormalization, Input
from sklearn.preprocessing import MinMaxScaler
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime, timedelta
import logging
import os
import pickle
import httpx
import asyncio

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/risk", tags=["Risk Prediction"])


# ==================== Pydantic Models ====================

class RiskFeatures(BaseModel):
    """Input features for risk prediction"""
    rainfall: float = Field(..., description="Rainfall in mm", ge=0)
    wind_speed: float = Field(..., description="Wind speed in m/s", ge=0)
    humidity: float = Field(..., description="Humidity percentage", ge=0, le=100)
    avg_magnitude: float = Field(..., description="Average earthquake magnitude", ge=0)
    fire_count: int = Field(..., description="Number of active fires", ge=0)


class ManualPredictRequest(BaseModel):
    """Request for manual feature prediction"""
    features: RiskFeatures


class LocationPredictRequest(BaseModel):
    """Request for location-based prediction using live data"""
    latitude: float = Field(..., description="Latitude", ge=-90, le=90)
    longitude: float = Field(..., description="Longitude", ge=-180, le=180)
    region_code: Optional[str] = Field("IND", description="Region code for fire data")


class RiskPredictionResponse(BaseModel):
    """Risk prediction response"""
    success: bool
    risk_level: str  # "Low", "Medium", "High"
    risk_score: float  # 0.0 to 1.0
    confidence: float
    features_used: RiskFeatures
    timestamp: datetime
    details: Optional[Dict[str, Any]] = None


class LiveDataResponse(BaseModel):
    """Response with live data and prediction"""
    success: bool
    prediction: RiskPredictionResponse
    live_data: Dict[str, Any]


# ==================== LSTM Risk Predictor ====================

class RiskPredictor:
    """
    LSTM-based risk prediction model
    
    Features:
    - rainfall (mm)
    - wind_speed (m/s)
    - humidity (%)
    - avg_magnitude (earthquake)
    - fire_count (number)
    
    Output:
    - Risk classification: Low (0), Medium (1), High (2)
    """
    
    def __init__(self, model_path: Optional[str] = None):
        self.model = None
        self.scaler = MinMaxScaler()
        self.feature_names = ['rainfall', 'wind_speed', 'humidity', 'avg_magnitude', 'fire_count']
        self.risk_labels = ['Low', 'Medium', 'High']
        
        # Feature normalization ranges (based on realistic disaster data)
        self.feature_ranges = {
            'rainfall': (0, 500),        # 0-500 mm
            'wind_speed': (0, 100),      # 0-100 m/s
            'humidity': (0, 100),        # 0-100%
            'avg_magnitude': (0, 10),    # 0-10 Richter
            'fire_count': (0, 200)       # 0-200 fires
        }
        
        self._initialize_scaler()
        
        if model_path and os.path.exists(model_path):
            self.load(model_path)
        else:
            self._build_model()
            self._initialize_with_synthetic_weights()
    
    def _initialize_scaler(self):
        """Initialize scaler with known feature ranges"""
        # Create dummy data with min/max values for proper scaling
        min_values = [self.feature_ranges[f][0] for f in self.feature_names]
        max_values = [self.feature_ranges[f][1] for f in self.feature_names]
        
        dummy_data = np.array([min_values, max_values])
        self.scaler.fit(dummy_data)
    
    def _build_model(self):
        """Build the LSTM model for risk classification"""
        self.model = Sequential([
            # Input layer - expecting shape (sequence_length, features)
            # Using sequence_length=1 for single-step prediction
            Input(shape=(1, 5)),
            
            # First LSTM layer
            LSTM(32, return_sequences=True, activation='tanh'),
            BatchNormalization(),
            Dropout(0.2),
            
            # Second LSTM layer
            LSTM(16, return_sequences=False, activation='tanh'),
            BatchNormalization(),
            Dropout(0.2),
            
            # Dense layers
            Dense(16, activation='relu'),
            Dropout(0.2),
            
            # Output layer - 3 classes (Low, Medium, High)
            Dense(3, activation='softmax')
        ])
        
        self.model.compile(
            optimizer=tf.keras.optimizers.Adam(learning_rate=0.001),
            loss='categorical_crossentropy',
            metrics=['accuracy']
        )
        
        logger.info("LSTM model built successfully")
    
    def _initialize_with_synthetic_weights(self):
        """Initialize model with weights that produce sensible predictions"""
        # Run a forward pass to initialize weights
        dummy_input = np.random.rand(10, 1, 5)
        dummy_output = np.eye(3)[np.random.choice(3, 10)]
        
        # Quick training on synthetic patterns to get reasonable starting weights
        synthetic_data = self._generate_synthetic_training_data(500)
        X, y = synthetic_data
        
        # Brief training for initialization
        self.model.fit(X, y, epochs=20, batch_size=32, verbose=0)
        logger.info("Model initialized with synthetic pattern weights")
    
    def _generate_synthetic_training_data(self, n_samples: int):
        """Generate synthetic training data with realistic patterns"""
        X = []
        y = []
        
        for _ in range(n_samples):
            # Generate feature values
            rainfall = np.random.uniform(0, 500)
            wind_speed = np.random.uniform(0, 100)
            humidity = np.random.uniform(0, 100)
            avg_magnitude = np.random.uniform(0, 10)
            fire_count = np.random.uniform(0, 200)
            
            features = np.array([rainfall, wind_speed, humidity, avg_magnitude, fire_count])
            normalized = self.scaler.transform(features.reshape(1, -1))[0]
            
            # Calculate risk based on feature combination
            risk_score = self._calculate_risk_score_from_features(
                rainfall, wind_speed, humidity, avg_magnitude, fire_count
            )
            
            # Convert to one-hot label
            if risk_score < 0.33:
                label = [1, 0, 0]  # Low
            elif risk_score < 0.66:
                label = [0, 1, 0]  # Medium
            else:
                label = [0, 0, 1]  # High
            
            X.append(normalized.reshape(1, 5))
            y.append(label)
        
        return np.array(X), np.array(y)
    
    def _calculate_risk_score_from_features(
        self, rainfall: float, wind_speed: float, 
        humidity: float, avg_magnitude: float, fire_count: int
    ) -> float:
        """Calculate a rule-based risk score for training data generation"""
        # Weighted risk calculation
        rainfall_risk = min(rainfall / 200, 1.0) * 0.25  # Heavy rain > 200mm is high risk
        wind_risk = min(wind_speed / 50, 1.0) * 0.20    # Wind > 50 m/s is hurricane level
        humidity_risk = (1 - humidity / 100) * 0.05 if humidity < 30 else 0  # Low humidity = fire risk
        magnitude_risk = min(avg_magnitude / 6, 1.0) * 0.30  # Magnitude > 6 is significant
        fire_risk = min(fire_count / 50, 1.0) * 0.25  # 50+ fires is high risk
        
        total_risk = rainfall_risk + wind_risk + humidity_risk + magnitude_risk + fire_risk
        return min(total_risk, 1.0)
    
    def normalize_features(self, features: RiskFeatures) -> np.ndarray:
        """Normalize input features using MinMaxScaler"""
        feature_array = np.array([
            features.rainfall,
            features.wind_speed,
            features.humidity,
            features.avg_magnitude,
            features.fire_count
        ]).reshape(1, -1)
        
        normalized = self.scaler.transform(feature_array)
        return normalized.reshape(1, 1, 5)  # Shape: (batch, sequence, features)
    
    def predict(self, features: RiskFeatures) -> RiskPredictionResponse:
        """
        Predict risk level from input features
        
        Args:
            features: RiskFeatures object with 5 disaster indicators
            
        Returns:
            RiskPredictionResponse with risk level and confidence
        """
        if self.model is None:
            raise ValueError("Model not initialized")
        
        # Normalize features
        normalized_input = self.normalize_features(features)
        
        # Get prediction probabilities
        probabilities = self.model.predict(normalized_input, verbose=0)[0]
        
        # Get predicted class and confidence
        predicted_class = int(np.argmax(probabilities))
        confidence = float(probabilities[predicted_class])
        risk_level = self.risk_labels[predicted_class]
        
        # Calculate overall risk score (weighted by class)
        risk_score = float(
            probabilities[0] * 0.0 +   # Low
            probabilities[1] * 0.5 +   # Medium
            probabilities[2] * 1.0     # High
        )
        
        return RiskPredictionResponse(
            success=True,
            risk_level=risk_level,
            risk_score=round(risk_score, 3),
            confidence=round(confidence, 3),
            features_used=features,
            timestamp=datetime.utcnow(),
            details={
                "probabilities": {
                    "Low": round(float(probabilities[0]), 3),
                    "Medium": round(float(probabilities[1]), 3),
                    "High": round(float(probabilities[2]), 3)
                }
            }
        )
    
    def train(self, X: np.ndarray, y: np.ndarray, epochs: int = 50, validation_split: float = 0.2):
        """
        Train the model on historical data
        
        Args:
            X: Feature array (samples, 5)
            y: Labels (samples,) with values 0, 1, 2
            epochs: Number of training epochs
            validation_split: Fraction of data for validation
        """
        # Normalize and reshape
        X_normalized = self.scaler.transform(X)
        X_reshaped = X_normalized.reshape(-1, 1, 5)
        
        # One-hot encode labels
        y_onehot = tf.keras.utils.to_categorical(y, num_classes=3)
        
        callbacks = [
            tf.keras.callbacks.EarlyStopping(patience=10, restore_best_weights=True),
            tf.keras.callbacks.ReduceLROnPlateau(factor=0.5, patience=5)
        ]
        
        history = self.model.fit(
            X_reshaped, y_onehot,
            epochs=epochs,
            batch_size=32,
            validation_split=validation_split,
            callbacks=callbacks,
            verbose=1
        )
        
        return history
    
    def save(self, path: str):
        """Save model and scaler"""
        os.makedirs(os.path.dirname(path), exist_ok=True)
        self.model.save(f"{path}_model.keras")
        with open(f"{path}_scaler.pkl", 'wb') as f:
            pickle.dump(self.scaler, f)
        logger.info(f"Model saved to {path}")
    
    def load(self, path: str):
        """Load model and scaler"""
        self.model = load_model(f"{path}_model.keras")
        with open(f"{path}_scaler.pkl", 'rb') as f:
            self.scaler = pickle.load(f)
        logger.info(f"Model loaded from {path}")


# ==================== Global Predictor Instance ====================

risk_predictor = RiskPredictor()


# ==================== Data Fetching Functions ====================

async def fetch_live_weather(lat: float, lon: float) -> Dict[str, float]:
    """Fetch live weather data from internal API"""
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.get(
                "http://localhost:8000/api/data/weather/current",
                params={"lat": lat, "lon": lon}
            )
            if response.status_code == 200:
                data = response.json()
                if data.get("success") and data.get("data"):
                    weather = data["data"]
                    return {
                        "rainfall": weather.get("rainfall_mm_1h", 0) or 0,
                        "wind_speed": weather.get("wind_speed_mps", 0) or 0,
                        "humidity": weather.get("humidity_percent", 50) or 50
                    }
    except Exception as e:
        logger.warning(f"Failed to fetch weather data: {e}")
    
    # Return defaults if fetch fails
    return {"rainfall": 0, "wind_speed": 5, "humidity": 50}


async def fetch_live_earthquakes(lat: float, lon: float) -> float:
    """Fetch recent earthquake data and calculate average magnitude"""
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            # Search within ~500km radius
            response = await client.get(
                "http://localhost:8000/api/data/earthquakes/recent",
                params={
                    "min_lat": lat - 5,
                    "max_lat": lat + 5,
                    "min_lon": lon - 5,
                    "max_lon": lon + 5,
                    "min_magnitude": 2.0,
                    "days": 7,
                    "limit": 50
                }
            )
            if response.status_code == 200:
                data = response.json()
                if data.get("success") and data.get("data"):
                    earthquakes = data["data"]
                    if earthquakes:
                        magnitudes = [eq.get("magnitude", 0) for eq in earthquakes]
                        return sum(magnitudes) / len(magnitudes)
    except Exception as e:
        logger.warning(f"Failed to fetch earthquake data: {e}")
    
    return 0.0


async def fetch_live_fires(region: str) -> int:
    """Fetch active fire count for region"""
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.get(
                "http://localhost:8000/api/data/fires/hotspots",
                params={"region": region, "days": 1}
            )
            if response.status_code == 200:
                data = response.json()
                if data.get("success"):
                    return data.get("count", 0)
    except Exception as e:
        logger.warning(f"Failed to fetch fire data: {e}")
    
    return 0


# ==================== API Endpoints ====================

@router.post("/predict", response_model=RiskPredictionResponse)
async def predict_risk(request: ManualPredictRequest):
    """
    Predict disaster risk from manually provided features
    
    Input features:
    - rainfall: Rainfall in mm (0-500+)
    - wind_speed: Wind speed in m/s (0-100+)
    - humidity: Humidity percentage (0-100)
    - avg_magnitude: Average earthquake magnitude (0-10)
    - fire_count: Number of active fires (0-200+)
    
    Output:
    - risk_level: "Low", "Medium", or "High"
    - risk_score: 0.0 to 1.0
    - confidence: Model confidence
    """
    try:
        prediction = risk_predictor.predict(request.features)
        return prediction
    except Exception as e:
        logger.error(f"Prediction error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/predict-live", response_model=LiveDataResponse)
async def predict_risk_live(request: LocationPredictRequest):
    """
    Predict disaster risk using live data from external APIs
    
    Automatically fetches:
    - Weather data (rainfall, wind_speed, humidity) from OpenWeatherMap
    - Earthquake data (avg_magnitude) from USGS
    - Fire hotspot count from NASA FIRMS
    
    Combines into risk prediction
    """
    try:
        # Fetch live data in parallel
        weather_task = fetch_live_weather(request.latitude, request.longitude)
        earthquake_task = fetch_live_earthquakes(request.latitude, request.longitude)
        fire_task = fetch_live_fires(request.region_code)
        
        weather_data, avg_magnitude, fire_count = await asyncio.gather(
            weather_task, earthquake_task, fire_task
        )
        
        # Build features from live data
        features = RiskFeatures(
            rainfall=weather_data["rainfall"],
            wind_speed=weather_data["wind_speed"],
            humidity=weather_data["humidity"],
            avg_magnitude=avg_magnitude,
            fire_count=fire_count
        )
        
        # Get prediction
        prediction = risk_predictor.predict(features)
        
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
                }
            }
        )
    except Exception as e:
        logger.error(f"Live prediction error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/model-info")
async def get_model_info():
    """Get information about the risk prediction model"""
    return {
        "model_type": "LSTM Neural Network",
        "framework": "TensorFlow/Keras",
        "input_features": risk_predictor.feature_names,
        "feature_descriptions": {
            "rainfall": "Rainfall in millimeters (mm)",
            "wind_speed": "Wind speed in meters per second (m/s)",
            "humidity": "Relative humidity percentage (%)",
            "avg_magnitude": "Average earthquake magnitude (Richter scale)",
            "fire_count": "Number of active fire hotspots"
        },
        "output_classes": risk_predictor.risk_labels,
        "normalization": "MinMaxScaler",
        "architecture": {
            "layers": [
                "Input (1, 5)",
                "LSTM (32 units, return_sequences=True)",
                "BatchNormalization",
                "Dropout (0.2)",
                "LSTM (16 units)",
                "BatchNormalization",
                "Dropout (0.2)",
                "Dense (16, ReLU)",
                "Dropout (0.2)",
                "Dense (3, Softmax)"
            ]
        }
    }


@router.post("/simulate")
async def simulate_scenarios():
    """
    Simulate various disaster scenarios and their risk predictions
    
    Returns predictions for predefined scenarios to demonstrate model behavior
    """
    scenarios = [
        {
            "name": "Normal conditions",
            "features": RiskFeatures(rainfall=5, wind_speed=3, humidity=60, avg_magnitude=0, fire_count=0)
        },
        {
            "name": "Heavy rainfall",
            "features": RiskFeatures(rainfall=150, wind_speed=10, humidity=95, avg_magnitude=0, fire_count=0)
        },
        {
            "name": "Tropical storm",
            "features": RiskFeatures(rainfall=100, wind_speed=45, humidity=85, avg_magnitude=0, fire_count=0)
        },
        {
            "name": "Earthquake active zone",
            "features": RiskFeatures(rainfall=10, wind_speed=5, humidity=50, avg_magnitude=5.5, fire_count=0)
        },
        {
            "name": "Wildfires",
            "features": RiskFeatures(rainfall=0, wind_speed=15, humidity=20, avg_magnitude=0, fire_count=75)
        },
        {
            "name": "Multi-hazard crisis",
            "features": RiskFeatures(rainfall=200, wind_speed=60, humidity=90, avg_magnitude=4.0, fire_count=30)
        }
    ]
    
    results = []
    for scenario in scenarios:
        prediction = risk_predictor.predict(scenario["features"])
        results.append({
            "scenario": scenario["name"],
            "features": scenario["features"].model_dump(),
            "risk_level": prediction.risk_level,
            "risk_score": prediction.risk_score,
            "confidence": prediction.confidence,
            "probabilities": prediction.details["probabilities"]
        })
    
    return {"scenarios": results}


# Export router
risk_router = router
