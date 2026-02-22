# AI-Powered Real-Time Operations Dashboard for Crisis Response 🌍

<p align="center">
  <a href="https://crisis-response-dashboard.vercel.app/" target="_blank">
    <img src="https://img.shields.io/badge/Live%20Now-0066FF?style=for-the-badge&logo=vercel&logoColor=white" alt="Live Now">
  </a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Status-Deployed-brightgreen" alt="Status">
  <img src="https://img.shields.io/badge/License-MIT-blue" alt="License">
  <img src="https://img.shields.io/badge/Team-CodeCanvas-orange" alt="Team">
</p>


<div align="center">

[![GitHub Issues](https://img.shields.io/github/issues/ArshTiwari2004/Recap)](https://github.com/ArshTiwari2004/crisis-response-dashboard/issues)
[![GitHub Forks](https://img.shields.io/github/forks/ArshTiwari2004/Recap)](https://github.com/ArshTiwari2004/crisis-response-dashboard/network)
[![GitHub Stars](https://img.shields.io/github/stars/ArshTiwari2004/Recap)](https://github.com/ArshTiwari2004/crisis-response-dashboard/stargazers)
[![Contributors](https://img.shields.io/github/contributors/ArshTiwari2004/Recap)](https://github.com/ArshTiwari2004/crisis-response-dashboard/graphs/contributors)
[![License](https://img.shields.io/github/license/ArshTiwari2004/crisis-response-dashboard)](LICENSE)
![GitHub commit activity](https://img.shields.io/github/commit-activity/m/ArshTiwari2004/crisis-response-dashboard)
![GitHub last commit](https://img.shields.io/github/last-commit/ArshTiwari2004/crisis-response-dashboard)

</div>

---

## 📝 Problem Statement

India faces significant challenges in disaster management, including:
- **Delayed Response**: Lack of real-time data to predict and respond to disasters.
- **Inefficient Resource Allocation**: Mismanagement of relief materials and response teams.
- **Poor Communication**: Ineffective coordination between authorities, responders, and citizens.
- **Lack of Predictive Insights**: Absence of AI-powered models to predict disasters and mitigate damage.

In large-scale disasters like floods, earthquakes, and cyclones, these inefficiencies result in increased casualties, prolonged suffering, and immense economic loss.

---

## 💡 Solution Overview

**AI-Powered Real-Time Operations Dashboard for Crisis Response** is an AI-powered disaster response platform designed to enhance preparedness, efficiency, and coordination in disaster management. It leverages **Google Cloud Technologies** and **AI models** to predict disasters, optimize resource management, and provide real-time coordination.

### Key Features:
- **Disaster Prediction and Early Warnings** using AI models deployed on Vertex AI.
- **Incident Reporting and Monitoring** through mobile and web apps using Gemini APIs for image, video, and text analysis.
- **Resource Inventory Management** with real-time tracking using REST APIs and WebSocket updates.
- **Task Allocation and Response Management** using AI algorithms to assign the nearest responders.
- **Multi-channel Communication** for real-time notifications using Twilio and Firebase Cloud Messaging.
- **Post-Disaster Analysis** to generate actionable insights for future disaster management.

---

## 🛠️ Tech Stack

### AI and Machine Learning
| **Technology**       | **Purpose**                                                                 |
|-----------------------|-----------------------------------------------------------------------------|
| **Vertex AI**         | Training and deploying AI models (LSTMs, CNNs, GANs) for disaster prediction.|
| **Gemini APIs**       | Multimodal analysis of images, videos, and text for damage assessment.      |
| **OpenCV**            | Image processing and damage detection from satellite and drone imagery.     |

### Backend
| **Technology**       | **Purpose**                                                                 |
|-----------------------|-----------------------------------------------------------------------------|
| **Node.js + Express** | Building RESTful APIs for the backend.                                      |
| **FastAPI**           | Serving AI models and handling AI-related requests.                         |
| **WebSocket**         | Real-time bidirectional communication for live updates.                     |

### Frontend
| **Technology**       | **Purpose**                                                                 |
|-----------------------|-----------------------------------------------------------------------------|
| **React.js**          | Building the web dashboard for real-time monitoring and visualization.      |
| **Flutter**           | Developing the mobile app for citizen reporting and alerts.                 |

### Database
| **Technology**       | **Purpose**                                                                 |
|-----------------------|-----------------------------------------------------------------------------|
| **PostgreSQL**        | Storing structured data like incident reports and resource details.         |
| **MongoDB**           | Storing unstructured data like images, videos, and sensor logs.             |

### Resource Management
| **Technology**       | **Purpose**                                                                 |
|-----------------------|-----------------------------------------------------------------------------|
| **REST APIs**         | CRUD operations for resource tracking and allocation.                       |
| **WebSocket**         | Real-time resource status updates and notifications.                        |

### Communication
| **Technology**       | **Purpose**                                                                 |
|-----------------------|-----------------------------------------------------------------------------|
| **Twilio**            | Sending SMS and voice alerts to citizens and authorities.                   |
| **Firebase Cloud Messaging** | Push notifications for real-time updates.                              |

### Visualization
| **Technology**       | **Purpose**                                                                 |
|-----------------------|-----------------------------------------------------------------------------|
| **Google Maps API**   | GIS-based visualizations for disaster-affected areas and resource allocation.|
| **Google Data Studio**| Generating real-time reports and insights for stakeholders.                 |

### Infrastructure
| **Technology**       | **Purpose**                                                                 |
|-----------------------|-----------------------------------------------------------------------------|
| **Google Cloud Storage (GCS)** | Storing satellite images, sensor data, and AI models.                  |
| **Docker**            | Containerization of backend and AI services.                               |
| **Docker Compose**    | Local development and simplified deployment.                               |

---

## 🔄 Workflow

1. **Data Collection**: Real-time data from sensors and user inputs is received via **REST APIs** and pushed to clients via **WebSocket**.
2. **Disaster Prediction**: **Vertex AI** trains and deploys AI models (LSTMs, CNNs, GANs) for disaster prediction using collected data.
3. **Incident Reporting**: Citizens report incidents via a **Flutter app**, and **Gemini APIs** analyze images, text, and voice inputs for severity assessment.
4. **Decision Making**: AI models process predictions and reports to generate alerts using **Vertex AI** and **Gemini APIs**.
5. **Alert Generation**: Multilingual alerts are sent via **Twilio** (SMS/calls) and **Firebase Cloud Messaging** (push notifications).
6. **Resource Management**: Resources are tracked via **REST APIs** with real-time **WebSocket** updates for status changes.
7. **Task Allocation**: AI optimizes task assignments using **Dijkstra's Algorithm** and real-time data from **Google Maps API**.
8. **Post-Disaster Analysis**: Data is aggregated and **Vertex AI** generates insights for future preparedness.




## Explaining the ai-service folder in detail 

This AI service powers the core intelligence layer of the AI-Powered Real-Time Operations Dashboard for Crisis Response, providing:

- **Real-time disaster prediction** using satellite/drone/sensor data
- **Multimodal damage assessment** (images, text reports, sensor data)
- **Optimal resource allocation** during emergencies
- **Automated reporting & alerting**



### 🛠️ Technology Stack

| Component       | Technology                          | Purpose                          |
|-----------------|-------------------------------------|----------------------------------|
| Core Framework  | Python 3.9, FastAPI                 | API development                  |
| AI/ML           | TensorFlow 2.12, Vertex AI          | Model training/deployment        |
| Multimodal AI   | Gemini API                          | Text/image analysis              |
| Cloud Services  | GCP (Storage, BigQuery, PubSub)     | Data pipeline                    |
| Optimization    | OR-Tools                            | Resource allocation              |
| Containerization| Docker, Gunicorn                    | Production deployment            |


### Prerequisites
- Google Cloud account with:
  - Vertex AI enabled
  - Service account with AI Platform Admin role
- Docker installed


### Step-by-Step Setup

1. **Configure Environment Variables**
```bash
   # Required Variables
   export GCP_PROJECT_ID="your-project-id"
   export GCP_REGION="us-central1"
   export GEMINI_API_KEY="your-api-key"
   export GCS_BUCKET="your-bucket-name"
   
   # Optional Overrides
   export DAMAGE_MODEL_ENDPOINT="projects/.../locations/.../endpoints/..."
   export RESOURCE_MODEL_ENDPOINT="projects/.../locations/.../endpoints/..."
```
2.  **Build Docker Image**

```bash
docker build -t crisis-response-ai-service \
  --build-arg GCP_PROJECT_ID=$GCP_PROJECT_ID \
  --build-arg GEMINI_API_KEY=$GEMINI_API_KEY \
  -f ai-service/Dockerfile .
```

3.  **Run Container**
```bash
docker run -d \
  -p 8000:8000 \
  -e GCP_PROJECT_ID=$GCP_PROJECT_ID \
  -e GEMINI_API_KEY=$GEMINI_API_KEY \
  -e GCS_BUCKET=$GCS_BUCKET \
  --name crisis-response-ai \
  crisis-response-ai-service
```

4. Verify Deployment
```bash
curl http://localhost:8000/
# Expected: {"status":"healthy","services":{"vertex":true,"gemini":true,"gcp":true}}
```

**Ensure you have these enviornment variables**

| Variable                 | Required | Description                                                      |
|---------------------------|----------|------------------------------------------------------------------|
| GCP_PROJECT_ID            | Yes      | Your Google Cloud Platform project ID                           |
| GEMINI_API_KEY            | Yes      | API key for Google Gemini services                              |
| GCS_BUCKET                | Yes      | Default Google Cloud Storage bucket for disaster data           |
| GCP_REGION                | No       | GCP region (default: us-central1)                               |
| DAMAGE_MODEL_ENDPOINT     | No       | Vertex AI endpoint for pre-trained damage assessment model     |
| RFID_API_ENDPOINT         | No       | URL for RFID inventory tracking system                         |
| MAX_CONCURRENT_TASKS      | No       | Limits parallel processing (default: CPU cores * 2)            |


**Models used with architecture**

### **📊 Complete Model Inventory**

#### **1. Disaster Prediction Models**
| Model File         | Architecture       | Input Shape      | Output                          | Pretrained Weights |
|--------------------|--------------------|------------------|---------------------------------|--------------------|
| `lstm_model.py`    | Stacked LSTM       | (24, 5)          | Binary probability              | No                 |
| `cnn_model.py`     | EfficientNetB4     | (256, 256, 3)    | 5-class disaster                | ImageNet           |
| `gan_model.py`     | DCGAN              | (100,) latent dim| (256, 256, 3) synthetic images  | No                 |

#### **2. Damage Assessment Models**
| Model File            | Architecture | Input Shape      | Output                     | Key Features       |
|-----------------------|--------------|------------------|----------------------------|--------------------|
| `image_classifier.py` | EfficientNetB4 | (512, 512, 3)   | 4 damage levels            | Transfer learning  |
| `object_detector.py`  | YOLOv8x      | (640, 640, 3)    | BBox + 6 classes           | COCO pretrained    |

#### **3. Resource Optimization Models**
| Model File            | Architecture       | Input Features       | Output                  | Optimization Method |
|-----------------------|--------------------|-----------------------|-------------------------|---------------------|
| `predictive_model.py` | Hybrid LSTM-RF     | 7 temporal features  | 5 resource demands      | Adam + Gini impurity|
| `allocation_model.py` | OR-Tools MIP       | Demand constraints   | Allocation plan         | Linear Programming  |




## **Performace comparision for the models deployed**

| Endpoint                | Avg Latency | Throughput (req/s) |
|--------------------------|-------------|---------------------|
| Disaster Prediction      | 320ms       | 45                  |
| Damage Assessment        | 480ms       | 32                  |
| Resource Optimization    | 210ms       | 68                  |

*Tested on: n1-standard-4 VM, 100 concurrent requests*


Note: This can vary , I have taken avg latency to get this





## 🚀 Installation

To set up the project locally, follow these steps:

1. **Clone the repository:**
   ```bash
   git clone https://github.com/CodeCanvas/crisis-response-dashboard.git
   cd crisis-response-dashboard

### 2. Install dependencies

### For the backend
```bash
cd backend/api
npm install
```

### For the AI service
```bash
cd ../ai-service
pip install -r requirements.txt
```

### For the frontend
```bash
cd ../../frontend/web
npm install
```

### 3. Set up environment variables
```bash
cp .env.example .env
```
Copy .env.example to .env and fill in the required values.

### 4. Run the project

### Start the backend server
```bash
cd ../../backend/api
npm start
```

### Start the AI service
```bash
cd ../ai-service
uvicorn main:app --reload
```

### Start the frontend
```bash
cd ../../frontend/web
npm start
```

### Implementing docker for Crisis Response Dashboard

#### To deploy:

Build the image: 

```bash
docker build -t crisis-response-ai-service 
```

Then run the command:

```bash
docker run -p 8000:8000 -e GCP_PROJECT_ID=your-project crisis-response-ai-service
```

## 📂 Project Structure

```bash
crisis-response-dashboard/
├── backend/  
│   ├── api/               # Main API server (Node.js + Express + WebSocket)  
│   └── ai-service/        # AI model service (Python + FastAPI)  
│
├── frontend/  
│   ├── web/               # React.js web application  
│   └── mobile/            # Flutter mobile application  
│
├── infrastructure/  
│   └── docker/            # Docker configurations  
│
├── docs/                  # Documentation  
├── scripts/               # Utility scripts  
├── .env.example           # Example environment variables  
├── .gitignore             # Git ignore file  
└── README.md              # Project overview  
```


## 📊 Diagrams

### Process Flow Diagram
<p align="center"> <img src="https://via.placeholder.com/800x400.png?text=Process+Flow+Diagram" alt="Process Flow Diagram" width="800"/> </p>

### Use Case Diagram
<p align="center"> <img src="https://via.placeholder.com/800x400.png?text=Use+Case+Diagram" alt="Use Case Diagram" width="800"/> </p>

### Architeture Diagram
<p align="center"> <img src="https://via.placeholder.com/800x400.png?text=Architecture+Diagram" alt="Architecture Diagram" width="800"/> </p>


## 🤝 Contributing
Contributions to AI-Powered Real-Time Operations Dashboard for Crisis Response are always welcome! Please follow these steps:

1. Fork the repository.

2. Create a new branch (git checkout -b feature/YourFeatureName).

3. Commit your changes (git commit -m 'Add some feature').

4. Push to the branch (git push origin feature/YourFeatureName).

5. Open a pull request.


### 📄 License

This project is licensed under the MIT License. See the LICENSE file for details.
