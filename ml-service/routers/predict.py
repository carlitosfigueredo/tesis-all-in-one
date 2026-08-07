import os
import joblib
import pandas as pd
from fastapi import APIRouter
from schemas import EmployeeFeatures, PredictionResult
from model.dummy_model import predict_desercion_dummy
from routers.training import (
    FEATURES_NUMERICAS, FEATURES_CATEGORICAS, MODEL_PATH, ENCODERS_PATH
)

router = APIRouter(tags=["Prediccion"])


# Valores por defecto (neutros) para variables opcionales no proporcionadas
DEFAULTS_OPCIONALES = {
    "satisfaccion_laboral": 3,
    "satisfaccion_ambiente": 3,
    "equilibrio_vida_trabajo": 3,
    "estancamiento_carrera": 3,
    "feedback_lider": 3,
}


def _get_nivel_riesgo(score: float) -> str:
    """Clasifica el riesgo en 4 niveles."""
    if score >= 0.75:
        return "CRITICO"
    if score >= 0.50:
        return "ALTO"
    if score >= 0.30:
        return "MEDIO"
    return "BAJO"


def _get_recomendacion(nivel: str) -> str:
    """Genera una recomendacion basica segun el nivel de riesgo."""
    recomendaciones = {
        "CRITICO": (
            "Riesgo critico de desercion. Se recomienda accion inmediata: "
            "reunion con el empleado, revisar compensacion y plan de carrera."
        ),
        "ALTO": (
            "Riesgo alto. Se sugiere entrevista de retencion, "
            "evaluar ajuste salarial y oportunidades de crecimiento."
        ),
        "MEDIO": (
            "Riesgo moderado. Monitorear indicadores de satisfaccion "
            "y asegurar feedback continuo del lider."
        ),
        "BAJO": (
            "Riesgo bajo. Mantener buenas practicas de retencion "
            "y seguimiento regular."
        ),
    }
    return recomendaciones.get(nivel, "")


def _load_model():
    """Carga el modelo entrenado si existe."""
    if os.path.exists(MODEL_PATH):
        return joblib.load(MODEL_PATH)
    return None


def _load_encoders():
    """Carga los LabelEncoders guardados durante el entrenamiento."""
    if os.path.exists(ENCODERS_PATH):
        return joblib.load(ENCODERS_PATH)
    return None


def _prepare_features(employee: EmployeeFeatures) -> tuple[pd.DataFrame, list[str]]:
    """
    Convierte un EmployeeFeatures a un DataFrame listo para el modelo.
    Retorna (DataFrame, lista_variables_faltantes).
    """
    variables_faltantes = []

    # Construir dict con todas las features
    data = {
        "edad": employee.edad,
        "antiguedad_meses": employee.antiguedad_meses,
        "salario_mensual": employee.salario_mensual,
        "cantidad_horas_extra_mes": employee.cantidad_horas_extra_mes,
        "evaluacion_desempeno": employee.evaluacion_desempeno,
        "cantidad_empresas_anteriores": employee.cantidad_empresas_anteriores,
        "nivel_formacion": employee.nivel_formacion.value,
        "rol_tecnologico": employee.rol_tecnologico.value,
        "seniority": employee.seniority.value,
        "modalidad_trabajo": employee.modalidad_trabajo.value,
        "tipo_contrato": employee.tipo_contrato.value,
        "capacitacion_ultimo_anio": "Si" if employee.capacitacion_ultimo_anio else "No",
    }

    # Variables opcionales: usar valor proporcionado o default neutro
    for campo, default_val in DEFAULTS_OPCIONALES.items():
        valor = getattr(employee, campo)
        if valor is None:
            data[campo] = default_val
            variables_faltantes.append(campo)
        else:
            data[campo] = valor

    # Crear DataFrame en el orden correcto
    all_features = FEATURES_NUMERICAS + FEATURES_CATEGORICAS
    df = pd.DataFrame([data])[all_features]

    return df, variables_faltantes


def _encode_categoricas(df: pd.DataFrame, encoders: dict) -> pd.DataFrame:
    """Aplica los LabelEncoders a las columnas categoricas."""
    df_encoded = df.copy()
    for col in FEATURES_CATEGORICAS:
        if col in encoders:
            le = encoders[col]
            # Manejar valores no vistos durante entrenamiento
            known_classes = set(le.classes_)
            df_encoded[col] = df_encoded[col].apply(
                lambda x: le.transform([x])[0] if x in known_classes else 0
            )
    return df_encoded


@router.post("/predict", response_model=PredictionResult)
def predict(employee: EmployeeFeatures):
    """
    Predice la probabilidad de desercion de un empleado.

    - Si el modelo entrenado existe, lo usa con las features codificadas.
    - Si no, usa el modelo heuristico base para desarrollo.
    - Variables opcionales no proporcionadas se rellenan con valores neutros (3)
      y se reportan en 'variables_faltantes'.
    """
    model = _load_model()
    encoders = _load_encoders()

    df_features, variables_faltantes = _prepare_features(employee)

    if model is not None and encoders is not None:
        # ── Modelo real entrenado ──────────────────────────────────────────
        df_encoded = _encode_categoricas(df_features, encoders)
        proba = model.predict_proba(df_encoded)[0][1]
        riesgo = float(proba)
        confianza = float(max(model.predict_proba(df_encoded)[0]))
        es_modelo_base = False
        version = "2.0.0-desercion-py"
    else:
        # ── Modelo heuristico base ────────────────────────────────────────
        riesgo, confianza = predict_desercion_dummy(df_features.iloc[0].to_dict())
        es_modelo_base = True
        version = "0.2.0-heuristico"

    # Penalizar confianza si faltan variables
    if variables_faltantes:
        penalizacion = len(variables_faltantes) * 0.05
        confianza = max(0.3, confianza - penalizacion)

    nivel = _get_nivel_riesgo(riesgo)

    return PredictionResult(
        riesgo_desercion=round(riesgo, 4),
        nivel_riesgo=nivel,
        confianza=round(confianza, 4),
        version_modelo=version,
        es_modelo_base=es_modelo_base,
        variables_faltantes=variables_faltantes,
        recomendacion=_get_recomendacion(nivel),
    )


@router.post("/predict/batch", response_model=list[PredictionResult])
def predict_batch(employees: list[EmployeeFeatures]):
    """Predice el riesgo de desercion para una lista de empleados."""
    return [predict(emp) for emp in employees]
