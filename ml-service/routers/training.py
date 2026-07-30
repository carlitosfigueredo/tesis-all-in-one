import os
import time
import joblib
import pandas as pd
import numpy as np
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
from sklearn.model_selection import train_test_split, cross_val_score
from sklearn.ensemble import RandomForestClassifier
from sklearn.preprocessing import LabelEncoder
from sklearn.metrics import (
    classification_report, roc_auc_score, confusion_matrix
)

router = APIRouter(tags=["Entrenamiento"])

DATASET_PATH = "notebooks/data/dataset_desercion_software_py.csv"
MODEL_PATH   = "model/model.pkl"
ENCODERS_PATH = "model/encoders.pkl"

# ─── Definicion de features ──────────────────────────────────────────────────
# Todas las columnas que usa el modelo (sin el target)

FEATURES_NUMERICAS = [
    "edad",
    "antiguedad_meses",
    "salario_mensual",
    "cantidad_horas_extra_mes",
    "evaluacion_desempeno",
    "cantidad_empresas_anteriores",
    "satisfaccion_laboral",
    "satisfaccion_ambiente",
    "equilibrio_vida_trabajo",
    "estancamiento_carrera",
    "feedback_lider",
]

FEATURES_CATEGORICAS = [
    "nivel_formacion",
    "rol_tecnologico",
    "seniority",
    "modalidad_trabajo",
    "tipo_contrato",
    "capacitacion_ultimo_anio",
]

FEATURES = FEATURES_NUMERICAS + FEATURES_CATEGORICAS
TARGET = "desercion"

# Etiquetas legibles para el frontend y reportes
FEATURE_LABELS = {
    "edad": "Edad",
    "nivel_formacion": "Nivel de Formacion",
    "rol_tecnologico": "Rol Tecnologico",
    "seniority": "Seniority",
    "antiguedad_meses": "Antiguedad en la Empresa (meses)",
    "modalidad_trabajo": "Modalidad de Trabajo",
    "tipo_contrato": "Tipo de Contrato",
    "salario_mensual": "Salario Mensual (Gs.)",
    "cantidad_horas_extra_mes": "Horas Extra por Mes",
    "capacitacion_ultimo_anio": "Capacitacion (ultimo anio)",
    "evaluacion_desempeno": "Evaluacion de Desempeno",
    "cantidad_empresas_anteriores": "Empresas Anteriores",
    "satisfaccion_laboral": "Satisfaccion Laboral",
    "satisfaccion_ambiente": "Satisfaccion con el Ambiente",
    "equilibrio_vida_trabajo": "Equilibrio Vida-Trabajo",
    "estancamiento_carrera": "Estancamiento de Carrera",
    "feedback_lider": "Feedback del Lider",
}

# Clasificacion de importancia para el frontend
FEATURE_IMPORTANCE_TIER = {
    "satisfaccion_laboral": "critica",
    "equilibrio_vida_trabajo": "critica",
    "estancamiento_carrera": "critica",
    "salario_mensual": "critica",
    "cantidad_horas_extra_mes": "alta",
    "feedback_lider": "alta",
    "capacitacion_ultimo_anio": "alta",
    "antiguedad_meses": "alta",
    "tipo_contrato": "media",
    "cantidad_empresas_anteriores": "media",
    "evaluacion_desempeno": "media",
    "satisfaccion_ambiente": "media",
    "modalidad_trabajo": "baja",
    "edad": "baja",
    "nivel_formacion": "baja",
    "rol_tecnologico": "baja",
    "seniority": "baja",
}


# ─── Schemas de respuesta ────────────────────────────────────────────────────

class FeatureImportance(BaseModel):
    feature: str
    label: str
    importance: float
    importance_pct: float
    tier: str  # critica, alta, media, baja


class ConfusionMatrixResult(BaseModel):
    true_negative: int
    false_positive: int
    false_negative: int
    true_positive: int


class TrainingMetrics(BaseModel):
    accuracy: float
    auc_roc: float
    auc_roc_cv_mean: float
    auc_roc_cv_std: float
    precision_class1: float
    recall_class1: float
    f1_class1: float
    support_class0: int
    support_class1: int
    confusion_matrix: ConfusionMatrixResult
    feature_importances: list[FeatureImportance]
    training_samples: int
    test_samples: int
    training_time_seconds: float
    model_size_kb: float
    model_version: str


class ModelStatus(BaseModel):
    model_ready: bool
    model_version: Optional[str]
    dataset_available: bool
    dataset_records: Optional[int]
    model_size_kb: Optional[float]
    last_metrics: Optional[TrainingMetrics]


# ─── Estado en memoria ───────────────────────────────────────────────────────
_last_metrics: Optional[TrainingMetrics] = None


# ─── Funciones auxiliares ────────────────────────────────────────────────────

def _preprocess_dataset(df: pd.DataFrame) -> tuple[pd.DataFrame, dict]:
    """
    Preprocesa el dataset: codifica variables categoricas con LabelEncoder.
    Retorna el DataFrame procesado y un dict con los encoders para reusar.
    """
    df_model = df[FEATURES + [TARGET]].copy()

    # Target: Si=1, No=0
    df_model[TARGET] = (df_model[TARGET] == "Si").astype(int)

    # Codificar categoricas
    encoders = {}
    for col in FEATURES_CATEGORICAS:
        le = LabelEncoder()
        df_model[col] = le.fit_transform(df_model[col].astype(str))
        encoders[col] = le

    return df_model, encoders


# ─── Endpoints ───────────────────────────────────────────────────────────────

@router.get("/model/status", response_model=ModelStatus)
def model_status():
    """Devuelve el estado actual del modelo y si el dataset esta disponible."""
    model_ready = os.path.exists(MODEL_PATH)
    dataset_ok  = os.path.exists(DATASET_PATH)
    size_kb     = os.path.getsize(MODEL_PATH) / 1024 if model_ready else None

    dataset_records = None
    if dataset_ok:
        try:
            df = pd.read_csv(DATASET_PATH)
            dataset_records = len(df)
        except Exception:
            pass

    return ModelStatus(
        model_ready=model_ready,
        model_version="2.0.0-desercion-py" if model_ready else None,
        dataset_available=dataset_ok,
        dataset_records=dataset_records,
        model_size_kb=round(size_kb, 1) if size_kb else None,
        last_metrics=_last_metrics,
    )


@router.post("/train", response_model=TrainingMetrics)
def train_model():
    """
    Entrena el modelo Random Forest con el dataset de desercion
    para empresas de desarrollo de software de Paraguay.
    Guarda el modelo en model/model.pkl y los encoders en model/encoders.pkl.
    Devuelve las metricas completas del entrenamiento.
    """
    global _last_metrics

    if not os.path.exists(DATASET_PATH):
        raise HTTPException(
            status_code=404,
            detail=f"Dataset no encontrado en {DATASET_PATH}. "
                   "Coloca el archivo dataset_desercion_software_py.csv en notebooks/data/"
        )

    start_time = time.time()

    # 1. Cargar y preprocesar
    df = pd.read_csv(DATASET_PATH)
    df_model, encoders = _preprocess_dataset(df)

    X = df_model[FEATURES_NUMERICAS + FEATURES_CATEGORICAS]
    y = df_model[TARGET]

    # 2. Split estratificado
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y
    )

    # 3. Entrenar
    model = RandomForestClassifier(
        n_estimators=200,
        max_depth=12,
        min_samples_leaf=5,
        class_weight="balanced",
        random_state=42,
        n_jobs=-1,
    )
    model.fit(X_train, y_train)

    # 4. Evaluar
    y_pred  = model.predict(X_test)
    y_proba = model.predict_proba(X_test)[:, 1]
    auc     = roc_auc_score(y_test, y_proba)
    cm      = confusion_matrix(y_test, y_pred)
    report  = classification_report(y_test, y_pred, output_dict=True)
    cv      = cross_val_score(model, X_train, y_train, cv=5, scoring="roc_auc")

    elapsed = round(time.time() - start_time, 2)

    # 5. Guardar modelo y encoders
    os.makedirs(os.path.dirname(MODEL_PATH), exist_ok=True)
    joblib.dump(model, MODEL_PATH)
    joblib.dump(encoders, ENCODERS_PATH)
    size_kb = os.path.getsize(MODEL_PATH) / 1024

    # 6. Feature importances
    all_features = FEATURES_NUMERICAS + FEATURES_CATEGORICAS
    importances_raw = model.feature_importances_
    total = importances_raw.sum()
    feature_importances = [
        FeatureImportance(
            feature=feat,
            label=FEATURE_LABELS.get(feat, feat),
            importance=round(float(imp), 4),
            importance_pct=round(float(imp / total) * 100, 2),
            tier=FEATURE_IMPORTANCE_TIER.get(feat, "baja"),
        )
        for feat, imp in sorted(
            zip(all_features, importances_raw),
            key=lambda x: x[1],
            reverse=True,
        )
    ]

    metrics = TrainingMetrics(
        accuracy=round(report["accuracy"], 4),
        auc_roc=round(auc, 4),
        auc_roc_cv_mean=round(float(cv.mean()), 4),
        auc_roc_cv_std=round(float(cv.std()), 4),
        precision_class1=round(report["1"]["precision"], 4),
        recall_class1=round(report["1"]["recall"], 4),
        f1_class1=round(report["1"]["f1-score"], 4),
        support_class0=int(report["0"]["support"]),
        support_class1=int(report["1"]["support"]),
        confusion_matrix=ConfusionMatrixResult(
            true_negative=int(cm[0][0]),
            false_positive=int(cm[0][1]),
            false_negative=int(cm[1][0]),
            true_positive=int(cm[1][1]),
        ),
        feature_importances=feature_importances,
        training_samples=len(X_train),
        test_samples=len(X_test),
        training_time_seconds=elapsed,
        model_size_kb=round(size_kb, 1),
        model_version="2.0.0-desercion-py",
    )

    _last_metrics = metrics
    return metrics
