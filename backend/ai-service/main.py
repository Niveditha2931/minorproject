# import os
# from fastapi import FastAPI, HTTPException, Depends
# from fastapi.middleware.cors import CORSMiddleware
# from pydantic import BaseModel
# import google.generativeai as genai
# import google.cloud.aiplatform as vertex_ai
# from dotenv import load_dotenv

# # Load environment variables
# load_dotenv()

# # Configure Google AI services
# genai.configure(api_key=os.getenv("GEMINI_API_KEY"))
# vertex_ai.init(project=os.getenv("GCP_PROJECT_ID"), location=os.getenv("GCP_LOCATION"))

# # Initialize FastAPI app
# app = FastAPI(title="Crisis Response AI Service", description="AI services for disaster management")

# # Configure CORS
# app.add_middleware(
#     CORSMiddleware,
#     allow_origins=["*"],
#     allow_credentials=True,
#     allow_methods=["*"],
#     allow_headers=["*"],
# )

# # Models
# class DisasterPredictionRequest(BaseModel):
#     latitude: float
#     longitude: float
#     data_sources: list

# class ImageAnalysisRequest(BaseModel):
#     image_url: str
#     analysis_type: str

# # Routes
# @app.get("/")
# def read_root():
#     return {"message": "Welcome to Crisis Response AI Service"}

# @app.post("/predict/disaster")
# async def predict_disaster(request: DisasterPredictionRequest):
#     """Predict potential disasters based on geo-location and data sources"""
#     try:
#         # This is a placeholder for your actual model inference
#         # You would use Vertex AI here with your trained models
#         prediction = {"risk_level": "moderate", "disaster_type": "flood", "confidence": 0.78}
#         return prediction
#     except Exception as e:
#         raise HTTPException(status_code=500, detail=str(e))

# @app.post("/analyze/image")
# async def analyze_image(request: ImageAnalysisRequest):
#     """Analyze disaster images using Gemini API"""
#     try:
#         # This is a placeholder for your actual Gemini API call
#         # You would process the image and get analysis results
#         analysis_result = {
#             "damage_level": "severe",
#             "affected_structures": 12,
#             "recommended_resources": ["medical supplies", "shelter kits", "food packages"]
#         }
#         return analysis_result
#     except Exception as e:
#         raise HTTPException(status_code=500, detail=str(e))

# if __name__ == "__main__":
#     import uvicorn
#     uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)



# ai-service/main.py
from fastapi import FastAPI, HTTPException, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from contextlib import asynccontextmanager
from typing import Optional, List
import logging
from datetime import datetime
import io
import json

# Import your services
from services.vertex_service import VertexAIService
from services.gemini_service import GeminiService
from services.gcp_service import GCPService
from models.damage_assessment.image_classifier import DamageClassifier
from models.resource_optimization.predictive_model import ResourcePredictor

# Import data ingestion routers
from services.data_ingestion import weather_router, earthquake_router, fire_router
from services.scheduler import data_scheduler

# Import risk prediction service
from services.risk_prediction import risk_router

# Configure logging early
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Initialize service instances (in production, use dependency injection)
vertex_service = VertexAIService()
gemini_service = GeminiService()
gcp_service = GCPService()
damage_classifier = DamageClassifier()
resource_predictor = ResourcePredictor()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifespan context manager for startup/shutdown events"""
    # Startup
    logger.info("Starting AI service...")
    
    # Initialize database and scheduler
    await data_scheduler.init_database()
    data_scheduler.start()
    
    # Load AI models
    try:
        damage_classifier.load("models/damage_classifier.h5")
        resource_predictor.load_models("models/resource_predictor")
        logger.info("AI models loaded successfully")
    except Exception as e:
        logger.warning(f"Models not loaded (may not exist yet): {e}")
    
    yield
    
    # Shutdown
    logger.info("Shutting down AI service...")
    data_scheduler.stop()
    await data_scheduler.close_database()


# Initialize the app with lifespan
app = FastAPI(
    title="AI-Powered Real-Time Operations Dashboard for Crisis Response - AI Service",
    description="API for disaster management AI capabilities",
    version="1.0.0",
    lifespan=lifespan
)

# Set up CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include data ingestion routers
app.include_router(weather_router, prefix="/api/data")
app.include_router(earthquake_router, prefix="/api/data")
app.include_router(fire_router, prefix="/api/data")

# Include risk prediction router
app.include_router(risk_router, prefix="/api/prediction")

@app.get("/")
def health_check():
    """Health check endpoint"""
    scheduler_status = data_scheduler.get_job_status()
    return {
        "status": "healthy",
        "timestamp": datetime.now().isoformat(),
        "services": {
            "vertex": True,
            "gemini": True,
            "gcp": True
        },
        "scheduler": {
            "running": scheduler_status["is_running"],
            "jobs_count": len(scheduler_status["jobs"])
        }
    }


@app.get("/api/scheduler/status")
def get_scheduler_status():
    """Get detailed scheduler status and job information"""
    return data_scheduler.get_job_status()


@app.post("/api/scheduler/trigger/{job_name}")
async def trigger_job(job_name: str):
    """Manually trigger a scheduled job"""
    job_map = {
        "weather": data_scheduler.fetch_and_store_weather,
        "earthquake": data_scheduler.fetch_and_store_earthquakes,
        "fire": data_scheduler.fetch_and_store_fires
    }
    
    if job_name not in job_map:
        raise HTTPException(status_code=404, detail=f"Job '{job_name}' not found")
    
    await job_map[job_name]()
    return {"message": f"Job '{job_name}' triggered successfully"}

@app.post("/predict/disaster")
async def predict_disaster(
    satellite_image: UploadFile = File(...),
    sensor_data: str = Form("{}")
):
    """
    Predict disaster likelihood from satellite imagery and sensor data
    """
    try:
        # Read and process image
        image_bytes = await satellite_image.read()
        image = Image.open(io.BytesIO(image_bytes))
        
        # Get damage assessment
        damage_result = damage_classifier.predict_damage(image)
        
        # Get resource predictions
        sensor_json = json.loads(sensor_data)
        resource_pred = resource_predictor.predict(sensor_json)
        
        return {
            "damage_assessment": damage_result,
            "resource_predictions": resource_pred,
            "timestamp": datetime.now().isoformat()
        }
        
    except Exception as e:
        logger.error(f"Prediction failed: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/analyze/report")
async def analyze_report(
    text_report: Optional[str] = Form(None),
    images: Optional[List[UploadFile]] = File(None),
    audio: Optional[UploadFile] = File(None)
):
    """
    Analyze multimodal disaster reports (text, images, audio)
    """
    try:
        # Process text report
        text_analysis = {}
        if text_report:
            text_analysis = gemini_service.analyze_text_report(text_report)
        
        # Process images
        image_analysis = []
        if images:
            for img in images:
                img_bytes = await img.read()
                analysis = gemini_service.analyze_image(img_bytes)
                image_analysis.append(analysis)
        
        # TODO: Add audio processing
        
        return {
            "text_analysis": text_analysis,
            "image_analysis": image_analysis,
            "combined_report": gemini_service.generate_incident_report(
                text=text_report,
                images=[await img.read() for img in images] if images else None
            )
        }
        
    except Exception as e:
        logger.error(f"Report analysis failed: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/optimize/resources")
async def optimize_resources(
    demand: dict,
    inventory: dict,
    constraints: dict = {}
):
    """
    Optimize resource allocation based on demand and inventory
    """
    try:
        # Get predictions
        predictions = resource_predictor.predict(demand)
        
        # Generate allocation plan
        allocation = resource_predictor.optimize_allocation(
            predictions['predictions'],
            inventory
        )
        
        # Generate deployment instructions
        instructions = {}
        for res, plan in allocation.items():
            instructions[res] = gemini_service.generate_resource_instructions(
                resource_type=res,
                quantity=plan['deficit'],
                context={
                    **demand,
                    **constraints
                }
            )
        
        return {
            "predictions": predictions,
            "allocation": allocation,
            "instructions": instructions,
            "blockchain_records": resource_predictor.generate_blockchain_records(allocation)
        }
        
    except Exception as e:
        logger.error(f"Optimization failed: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/deploy/model")
async def deploy_model(
    model_type: str,
    model_path: str,
    config: dict = {}
):
    """
    Deploy a model to Vertex AI endpoint
    """
    try:
        if model_type == "damage":
            result = vertex_service.deploy_model(
                model_path=model_path,
                display_name="damage-assessment",
                serving_container=vertex_service.config['docker_image']['tf_cpu']
            )
        elif model_type == "resource":
            result = vertex_service.deploy_custom_container(
                container_uri=vertex_service.config['docker_image']['sklearn'],
                model_path=model_path,
                display_name="resource-predictor"
            )
        else:
            raise ValueError("Invalid model type")
        
        return result
        
    except Exception as e:
        logger.error(f"Model deployment failed: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

# Error handlers
@app.exception_handler(Exception)
async def global_exception_handler(request, exc):
    """Handle all uncaught exceptions"""
    logger.error(f"Unhandled error: {str(exc)}")
    return JSONResponse(
        status_code=500,
        content={"message": "Internal server error", "detail": str(exc)}
    )

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        app,
        host="0.0.0.0",
        port=8000,
        log_level="info"
    )