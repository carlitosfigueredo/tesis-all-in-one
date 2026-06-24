"""
Script de entrenamiento del modelo de predicción de fuga de talento.
Dataset: IBM HR Analytics Employee Attrition

Uso:
    python ml-service/train.py

Genera:
    ml-service/model/model.pkl
"""

import os
import sys
import joblib
import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split, cross_val_score
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import (
    classification_report, roc_auc_score, confusion_matrix
)

# ─────────────────────────────────────────────────────────────
# Configuración
# ─────────────────────────────────────────────────────────────
DATASET_PATH = "ml-service/notebooks/data/WA_Fn-UseC_-HR-Employee-Attrition.csv"
MODEL_OUTPUT  = "ml-service/model/model.pkl"

FEATURES = [
    "Age",
    "MonthlyIncome",
    "YearsAtCompany",
    "YearsInCurrentRole",
    "YearsSinceLastPromotion",
    "JobSatisfaction",
    "EnvironmentSatisfaction",
    "WorkLifeBalance",
    "NumCompaniesWorked",
    "OverTime",
    "DistanceFromHome",
    "PerformanceRating",
]
TARGET = "Attrition"

# ─────────────────────────────────────────────────────────────
# 1. Carga del dataset
# ─────────────────────────────────────────────────────────────
print("=" * 60)
print("  ENTRENAMIENTO — Predicción de Fuga de Talento")
print("=" * 60)

if not os.path.exists(DATASET_PATH):
    print(f"\n❌ Dataset no encontrado en: {DATASET_PATH}")
    print("   Descargalo desde:")
    print("   https://www.kaggle.com/datasets/pavansubhasht/ibm-hr-analytics-attrition-dataset")
    sys.exit(1)

df = pd.read_csv(DATASET_PATH)
print(f"\n✓ Dataset cargado: {df.shape[0]} filas × {df.shape[1]} columnas")

# ─────────────────────────────────────────────────────────────
# 2. Preprocesamiento
# ─────────────────────────────────────────────────────────────
df_model = df[FEATURES + [TARGET]].copy()

# Encodings binarios
df_model["OverTime"] = (df_model["OverTime"] == "Yes").astype(int)
df_model[TARGET]     = (df_model[TARGET] == "Yes").astype(int)

X = df_model[FEATURES]
y = df_model[TARGET]

print(f"✓ Variable objetivo — Se va: {y.sum()} ({y.mean()*100:.1f}%)  |  Se queda: {(1-y).sum()} ({(1-y).mean()*100:.1f}%)")

# ─────────────────────────────────────────────────────────────
# 3. Split de datos
# ─────────────────────────────────────────────────────────────
X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.2, random_state=42, stratify=y
)
print(f"✓ Train: {len(X_train)} muestras  |  Test: {len(X_test)} muestras")

# ─────────────────────────────────────────────────────────────
# 4. Entrenamiento
# ─────────────────────────────────────────────────────────────
print("\n⏳ Entrenando Random Forest...")

model = RandomForestClassifier(
    n_estimators=200,
    max_depth=10,
    min_samples_leaf=5,
    class_weight="balanced",
    random_state=42,
    n_jobs=-1,
)
model.fit(X_train, y_train)
print("✓ Entrenamiento completado")

# ─────────────────────────────────────────────────────────────
# 5. Evaluación
# ─────────────────────────────────────────────────────────────
print("\n📊 Resultados en el set de TEST:")

y_pred  = model.predict(X_test)
y_proba = model.predict_proba(X_test)[:, 1]
auc     = roc_auc_score(y_test, y_proba)

print(classification_report(y_test, y_pred, target_names=["Se queda", "Se va"]))
print(f"AUC-ROC: {auc:.4f}")

# Cross-validation
cv = cross_val_score(model, X_train, y_train, cv=5, scoring="roc_auc")
print(f"AUC-ROC CV (5-fold): {cv.mean():.4f} ± {cv.std():.4f}")

# Matriz de confusión
cm = confusion_matrix(y_test, y_pred)
print(f"\nMatriz de Confusión:")
print(f"              Pred: Se queda  Pred: Se va")
print(f"Real: Se queda     {cm[0][0]:>5}        {cm[0][1]:>5}")
print(f"Real: Se va        {cm[1][0]:>5}        {cm[1][1]:>5}")

# Feature importance
print("\n🔍 Importancia de variables (top 5):")
importances = pd.Series(model.feature_importances_, index=FEATURES)
importances = importances.sort_values(ascending=False)
for feat, imp in importances.head(5).items():
    bar = "█" * int(imp * 100)
    print(f"  {feat:<35} {imp:.4f}  {bar}")

# ─────────────────────────────────────────────────────────────
# 6. Guardar el modelo
# ─────────────────────────────────────────────────────────────
os.makedirs(os.path.dirname(MODEL_OUTPUT), exist_ok=True)
joblib.dump(model, MODEL_OUTPUT)

size_kb = os.path.getsize(MODEL_OUTPUT) / 1024
print(f"\n✅ Modelo guardado en: {MODEL_OUTPUT}")
print(f"   Tamaño: {size_kb:.1f} KB")
print("\n🚀 El ML Service detectará el modelo automáticamente en el próximo request.")
print("   Verificá en: http://localhost:8000  → model_ready: true")
