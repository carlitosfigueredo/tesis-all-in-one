from pydantic import BaseModel, Field
from typing import Optional


class EmployeeFeatures(BaseModel):
    """
    Variables de entrada para el modelo de predicción.
    Basado en el dataset IBM HR Analytics.
    """
    age: int                        = Field(..., ge=18, le=65,  example=35)
    monthly_income: float           = Field(..., gt=0,          example=5000)
    years_at_company: int           = Field(..., ge=0,          example=3)
    years_in_current_role: int      = Field(..., ge=0,          example=2)
    years_since_last_promotion: int = Field(..., ge=0,          example=1)
    job_satisfaction: int           = Field(..., ge=1, le=4,    example=3)
    environment_satisfaction: int   = Field(..., ge=1, le=4,    example=2)
    work_life_balance: int          = Field(..., ge=1, le=4,    example=3)
    num_companies_worked: int       = Field(..., ge=0,          example=2)
    overtime: bool                  = Field(...,                example=True)
    distance_from_home: int         = Field(..., ge=0,          example=10)
    performance_rating: int         = Field(..., ge=1, le=4,    example=3)

    # Opcionales — se usan cuando el modelo real esté entrenado
    job_level: Optional[int]        = Field(None, ge=1, le=5,   example=2)
    stock_option_level: Optional[int] = Field(None, ge=0, le=3, example=1)

    class Config:
        json_schema_extra = {
            "example": {
                "age": 32,
                "monthly_income": 4500,
                "years_at_company": 2,
                "years_in_current_role": 1,
                "years_since_last_promotion": 0,
                "job_satisfaction": 2,
                "environment_satisfaction": 1,
                "work_life_balance": 2,
                "num_companies_worked": 3,
                "overtime": True,
                "distance_from_home": 25,
                "performance_rating": 3,
            }
        }


class PredictionResult(BaseModel):
    flight_risk: float   = Field(..., description="Probabilidad de fuga (0.0 a 1.0)")
    risk_level: str      = Field(..., description="Nivel de riesgo: BAJO, MEDIO, ALTO")
    confidence: float    = Field(..., description="Confianza del modelo (0.0 a 1.0)")
    model_version: str   = Field(..., description="Versión del modelo usado")
    is_dummy: bool       = Field(..., description="True si el modelo real aún no está entrenado")
