import os
import joblib
from fastapi import APIRouter
from schemas import EmployeeFeatures, PredictionResult
from model.dummy_model import predict_flight_risk as dummy_predict

router = APIRouter(tags=["Predicción"])

MODEL_PATH = "model/model.pkl"


def _get_risk_level(score: float) -> str:
    if score >= 0.70:
        return "ALTO"
    if score >= 0.40:
        return "MEDIO"
    return "BAJO"


def _load_real_model():
    """Intenta cargar el modelo entrenado. Retorna None si no existe aún."""
    if os.path.exists(MODEL_PATH):
        return joblib.load(MODEL_PATH)
    return None


@router.post("/predict", response_model=PredictionResult)
def predict(employee: EmployeeFeatures):
    """
    Predice la probabilidad de fuga de talento para un empleado.

    - Si el modelo entrenado (model.pkl) existe, lo usa.
    - Si no, usa el modelo heurístico dummy para desarrollo.
    """
    real_model = _load_real_model()

    if real_model is not None:
        # ── Modelo real entrenado ──────────────────────────────────────────
        features_array = [[
            employee.age,
            employee.monthly_income,
            employee.years_at_company,
            employee.years_in_current_role,
            employee.years_since_last_promotion,
            employee.job_satisfaction,
            employee.environment_satisfaction,
            employee.work_life_balance,
            employee.num_companies_worked,
            int(employee.overtime),
            employee.distance_from_home,
            employee.performance_rating,
        ]]
        proba = real_model.predict_proba(features_array)[0][1]
        flight_risk = float(proba)
        confidence = float(max(real_model.predict_proba(features_array)[0]))
        is_dummy = False
        model_version = "1.0.0-trained"
    else:
        # ── Modelo dummy heurístico ────────────────────────────────────────
        flight_risk, confidence = dummy_predict(employee.model_dump())
        is_dummy = True
        model_version = "0.1.0-dummy"

    return PredictionResult(
        flight_risk=round(flight_risk, 4),
        risk_level=_get_risk_level(flight_risk),
        confidence=round(confidence, 4),
        model_version=model_version,
        is_dummy=is_dummy,
    )


@router.post("/predict/batch", response_model=list[PredictionResult])
def predict_batch(employees: list[EmployeeFeatures]):
    """Predice el riesgo para una lista de empleados de una sola vez."""
    return [predict(emp) for emp in employees]
