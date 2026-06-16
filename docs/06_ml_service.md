# 06 — ML Service — Predicción de Fuga de Talento

## Descripción

Microservicio independiente construido con **Python 3.11 + FastAPI**. Se comunica exclusivamente con el backend Node.js (nunca directamente con el frontend). Corre en el puerto **8000**.

---

## Endpoints

| Método | Ruta | Descripción |
|--------|------|-------------|
| `GET` | `/` | Health check — indica si el modelo real está cargado |
| `POST` | `/api/predict` | Predice el riesgo de un empleado |
| `POST` | `/api/predict/batch` | Predice el riesgo de una lista de empleados |
| `GET` | `/docs` | Documentación interactiva Swagger (auto-generada por FastAPI) |

---

## Variables de entrada al modelo (EmployeeFeatures)

| Variable | Tipo | Rango | Descripción |
|----------|------|-------|-------------|
| `age` | int | 18–65 | Edad del empleado |
| `monthly_income` | float | > 0 | Ingreso mensual |
| `years_at_company` | int | ≥ 0 | Años en la empresa |
| `years_in_current_role` | int | ≥ 0 | Años en el cargo actual |
| `years_since_last_promotion` | int | ≥ 0 | Años desde último ascenso |
| `job_satisfaction` | int | 1–4 | Satisfacción laboral (1=Baja, 4=Alta) |
| `environment_satisfaction` | int | 1–4 | Satisfacción con el ambiente |
| `work_life_balance` | int | 1–4 | Balance vida-trabajo |
| `num_companies_worked` | int | ≥ 0 | Cantidad de empleadores anteriores |
| `overtime` | bool | — | ¿Hace horas extra? |
| `distance_from_home` | int | ≥ 0 | Distancia al trabajo (km) |
| `performance_rating` | int | 1–4 | Calificación de desempeño |

---

## Respuesta del modelo (PredictionResult)

```json
{
  "flight_risk": 0.7321,
  "risk_level": "ALTO",
  "confidence": 0.55,
  "model_version": "0.1.0-dummy",
  "is_dummy": true
}
```

| Campo | Descripción |
|-------|-------------|
| `flight_risk` | Probabilidad de fuga (0.0 = seguro que se queda, 1.0 = seguro que se va) |
| `risk_level` | `BAJO` (< 0.4) / `MEDIO` (0.4–0.7) / `ALTO` (≥ 0.7) |
| `confidence` | Confianza del modelo en la predicción |
| `model_version` | `0.1.0-dummy` (heurístico) o `1.0.0-trained` (Random Forest real) |
| `is_dummy` | `true` si se está usando el modelo dummy |

---

## Lógica de selección del modelo

```python
# routers/predict.py

def predict(employee):
    real_model = joblib.load("model/model.pkl")  # Si existe

    if real_model is not None:
        # Usa el modelo Random Forest entrenado
        proba = real_model.predict_proba(features)[0][1]
        model_version = "1.0.0-trained"
    else:
        # Usa el modelo dummy heurístico
        flight_risk, confidence = dummy_predict(features)
        model_version = "0.1.0-dummy"
```

El microservicio intenta cargar `model/model.pkl` en cada request. Cuando se complete el entrenamiento y se copie el `.pkl`, el servicio automáticamente empieza a usar el modelo real **sin necesitar reiniciarse**.

---

## Modelo dummy heurístico

Mientras el modelo real no está entrenado, se usa un modelo basado en reglas derivadas de la literatura de RRHH:

```
Factor                          Peso    Lógica
─────────────────────────────────────────────────────────────
Satisfacción laboral (1-4)       20%    Invertida: a menor satisfacción, mayor riesgo
Satisfacción con ambiente (1-4)  15%    Invertida
Balance vida-trabajo (1-4)       15%    Invertido
Horas extra                      20%    Si hace overtime → riesgo alto
Número de empresas anteriores    10%    A más empresas, más propenso a moverse
Antigüedad en la empresa         10%    A menos años, más riesgo
Años sin ascenso                  5%    A más años sin ascenso, más desmotivación
Distancia al trabajo              5%    Distancia larga → factor de riesgo
```

---

## Modelo real — Random Forest

Dataset: **IBM HR Analytics Employee Attrition** (1.470 registros, 35 variables)

### Variables seleccionadas para entrenamiento
Las mismas 12 del endpoint (mapeo directo entre el CSV y los campos del schema).

### Configuración del modelo
```python
RandomForestClassifier(
    n_estimators=200,
    max_depth=10,
    min_samples_leaf=5,
    class_weight='balanced',  # Compensa el desbalance (84% No / 16% Yes)
    random_state=42,
    n_jobs=-1
)
```

### Por qué `class_weight='balanced'`
El dataset tiene un desbalance de clases: 83.9% de empleados no se van vs 16.1% que sí. Sin corrección, el modelo aprende a predecir "no se va" siempre y obtiene 84% de accuracy sin aprender nada útil. El parámetro `balanced` pondera automáticamente las clases para compensar.

### Cómo activar el modelo real
1. Abrir `ml-service/notebooks/01_eda_and_training.ipynb` en Jupyter
2. Colocar el CSV en `notebooks/data/`
3. Ejecutar todas las celdas
4. El notebook genera `ml-service/model/model.pkl`
5. El servicio lo detecta automáticamente en el próximo request

---

## Acceso a la documentación interactiva

Con el contenedor corriendo, acceder a:

```
http://localhost:8000/docs
```

Permite probar el endpoint `/api/predict` directamente desde el browser con el ejemplo incluido en el schema.
