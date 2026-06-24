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
from sklearn.metrics import (
    classification_report, roc_auc_score, confusion_matrix
)

router = APIRouter(tags=["Entrenamiento"])

DATASET_PATH = "notebooks/data/WA_Fn-UseC_-HR-Employee-Attrition.csv"
MODEL_PATH   = "model/model.pkl"

FEATURES = [
    "Age", "MonthlyIncome", "YearsAtCompany", "YearsInCurrentRole",
    "YearsSinceLastPromotion", "JobSatisfaction", "EnvironmentSatisfaction",
    "WorkLifeBalance", "NumCompaniesWorked", "OverTime",
    "DistanceFromHome", "PerformanceRating",
]
TARGET = "Attrition"

FEATURE_LABELS = {
    "Age": "Edad",
    "MonthlyIncome": "Ingreso Mensual",
    "YearsAtCompany": "Años en la Empresa",
    "YearsInCurrentRole": "Años en el Cargo",
    "YearsSinceLastPromotion": "Años sin Ascenso",
    "JobSatisfaction": "Satisfacción Laboral",
    "EnvironmentSatisfaction": "Satisfacción con el Ambiente",
    "WorkLifeBalance": "Balance Vida-Trabajo",
    "NumCompaniesWorked": "Empresas Anteriores",
    "OverTime": "Horas Extra",
    "DistanceFromHome": "Distancia al Trabajo",
    "PerformanceRating": "Calificación de Desempeño",
}


# ─── Schemas de respuesta ────────────────────────────────────────────────────

class FeatureImportance(BaseModel):
    feature: str
    label: str
    importance: float
    importance_pct: float


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
    model_size_kb: Optional[float]
    last_metrics: Optional[TrainingMetrics]


# ─── Estado en memoria ───────────────────────────────────────────────────────
_last_metrics: Optional[TrainingMetrics] = None


# ─── Endpoints ───────────────────────────────────────────────────────────────

@router.get("/model/status", response_model=ModelStatus)
def model_status():
    """Devuelve el estado actual del modelo y si el dataset está disponible."""
    model_ready = os.path.exists(MODEL_PATH)
    dataset_ok  = os.path.exists(DATASET_PATH)
    size_kb     = os.path.getsize(MODEL_PATH) / 1024 if model_ready else None

    return ModelStatus(
        model_ready=model_ready,
        model_version="1.0.0-trained" if model_ready else None,
        dataset_available=dataset_ok,
        model_size_kb=round(size_kb, 1) if size_kb else None,
        last_metrics=_last_metrics,
    )


@router.post("/train", response_model=TrainingMetrics)
def train_model():
    """
    Entrena el modelo Random Forest con el dataset IBM HR Attrition.
    Guarda el modelo en model/model.pkl y devuelve las métricas completas.
    """
    global _last_metrics

    if not os.path.exists(DATASET_PATH):
        raise HTTPException(
            status_code=404,
            detail=f"Dataset no encontrado en {DATASET_PATH}. "
                   "Colocá el archivo WA_Fn-UseC_-HR-Employee-Attrition.csv en notebooks/data/"
        )

    start_time = time.time()

    # 1. Cargar y preprocesar
    df = pd.read_csv(DATASET_PATH)
    df_model = df[FEATURES + [TARGET]].copy()
    df_model["OverTime"] = (df_model["OverTime"] == "Yes").astype(int)
    df_model[TARGET]     = (df_model[TARGET] == "Yes").astype(int)

    X = df_model[FEATURES]
    y = df_model[TARGET]

    # 2. Split estratificado
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y
    )

    # 3. Entrenar
    model = RandomForestClassifier(
        n_estimators=200,
        max_depth=10,
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

    # 5. Guardar modelo
    os.makedirs(os.path.dirname(MODEL_PATH), exist_ok=True)
    joblib.dump(model, MODEL_PATH)
    size_kb = os.path.getsize(MODEL_PATH) / 1024

    # 6. Feature importances
    importances_raw = model.feature_importances_
    total = importances_raw.sum()
    feature_importances = [
        FeatureImportance(
            feature=feat,
            label=FEATURE_LABELS.get(feat, feat),
            importance=round(float(imp), 4),
            importance_pct=round(float(imp / total) * 100, 2),
        )
        for feat, imp in sorted(
            zip(FEATURES, importances_raw),
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
        model_version="1.0.0-trained",
    )

    _last_metrics = metrics
    return metrics
