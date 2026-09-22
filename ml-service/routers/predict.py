import os
import joblib
import pandas as pd
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from schemas import EmployeeFeatures, PredictionResult
from routers.training import (
    FEATURES_NUMERICAS, FEATURES_CATEGORICAS, model_path, encoders_path
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


# ─── Caché de modelo y encoders ───────────────────────────────────────────────
# Cargar el .pkl del disco es caro. Antes se hacía en CADA predicción, lo que
# volvía lentísima la importación masiva (2 loads de disco por empleado).
# Ahora se cachea en memoria y solo se recarga si el archivo cambió (mtime),
# de modo que un reentrenamiento se toma automáticamente sin reiniciar el servicio.

# Caché POR PATH (cada empresa tiene su propio modelo/encoders).
_artifact_cache = {}  # path -> {"mtime", "obj"}


def _load_cached(path: str):
    """Carga un artefacto joblib con caché invalidada por mtime del archivo."""
    if not os.path.exists(path):
        _artifact_cache.pop(path, None)
        return None
    mtime = os.path.getmtime(path)
    entry = _artifact_cache.get(path)
    if entry is None or entry["mtime"] != mtime:
        entry = {"mtime": mtime, "obj": joblib.load(path)}
        _artifact_cache[path] = entry
    return entry["obj"]


def _load_model(company_id: str):
    """Carga el modelo entrenado de una empresa (cacheado)."""
    return _load_cached(model_path(company_id))


def _load_encoders(company_id: str):
    """Carga los LabelEncoders de una empresa (cacheado)."""
    return _load_cached(encoders_path(company_id))


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
def predict(employee: EmployeeFeatures, company_id: str):
    """
    Predice la probabilidad de desercion de un empleado usando el modelo
    PROPIO de la empresa. Si la empresa aún no entrenó su modelo, devuelve 409
    (no se usa el modelo de otra empresa ni un heurístico global).
    """
    model = _load_model(company_id)
    encoders = _load_encoders(company_id)

    if model is None or encoders is None:
        raise HTTPException(
            status_code=409,
            detail="La empresa no tiene un modelo entrenado. Entrená el modelo antes de predecir.",
        )

    df_features, variables_faltantes = _prepare_features(employee)
    df_encoded = _encode_categoricas(df_features, encoders)
    proba_row = model.predict_proba(df_encoded)[0]
    riesgo = float(proba_row[1])
    confianza = float(max(proba_row))

    if variables_faltantes:
        confianza = max(0.3, confianza - len(variables_faltantes) * 0.05)

    nivel = _get_nivel_riesgo(riesgo)

    return PredictionResult(
        riesgo_desercion=round(riesgo, 4),
        nivel_riesgo=nivel,
        confianza=round(confianza, 4),
        version_modelo="2.0.0-desercion-py",
        es_modelo_base=False,
        variables_faltantes=variables_faltantes,
        recomendacion=_get_recomendacion(nivel),
    )


class BatchPredictRequest(BaseModel):
    company_id: str
    employees: list[EmployeeFeatures]


@router.post("/predict/batch", response_model=list[PredictionResult])
def predict_batch(payload: BatchPredictRequest):
    """
    Predice el riesgo para una lista de empleados usando el modelo PROPIO de la
    empresa, de forma VECTORIZADA (un solo predict_proba sobre un DataFrame de N
    filas). Si la empresa no tiene modelo entrenado, devuelve 409.
    """
    employees = payload.employees
    if not employees:
        return []

    model = _load_model(payload.company_id)
    encoders = _load_encoders(payload.company_id)
    if model is None or encoders is None:
        raise HTTPException(
            status_code=409,
            detail="La empresa no tiene un modelo entrenado. Entrená el modelo antes de predecir.",
        )

    # Preparar todas las filas: un DataFrame de N filas + faltantes por empleado.
    frames = []
    faltantes_por_emp = []
    for emp in employees:
        df_emp, faltantes = _prepare_features(emp)
        frames.append(df_emp)
        faltantes_por_emp.append(faltantes)

    df_all = pd.concat(frames, ignore_index=True)
    df_encoded = _encode_categoricas(df_all, encoders)
    proba_matrix = model.predict_proba(df_encoded)   # una sola llamada, N filas
    riesgos = proba_matrix[:, 1]
    confianzas = proba_matrix.max(axis=1)

    resultados = []
    for i in range(len(employees)):
        riesgo = float(riesgos[i])
        confianza = float(confianzas[i])
        faltantes = faltantes_por_emp[i]
        if faltantes:
            confianza = max(0.3, confianza - len(faltantes) * 0.05)
        nivel = _get_nivel_riesgo(riesgo)
        resultados.append(PredictionResult(
            riesgo_desercion=round(riesgo, 4),
            nivel_riesgo=nivel,
            confianza=round(confianza, 4),
            version_modelo="2.0.0-desercion-py",
            es_modelo_base=False,
            variables_faltantes=faltantes,
            recomendacion=_get_recomendacion(nivel),
        ))
    return resultados
