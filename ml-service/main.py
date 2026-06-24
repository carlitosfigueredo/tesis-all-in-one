from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routers import predict, training
import os

app = FastAPI(
    title="ML Service - Predicción de Fuga de Talento",
    description="Microservicio de Machine Learning para el sistema BI de retención de empleados",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(predict.router, prefix="/api")
app.include_router(training.router, prefix="/api")


@app.get("/")
def health():
    return {
        "status": "ok",
        "service": "ml-service",
        "model_ready": os.path.exists("model/model.pkl"),
    }
