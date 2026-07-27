---
inclusion: always
---

# Machine Learning — Servicio de Predicción (Python + FastAPI)

## Contexto

El motor predictivo de la tesis está separado del backend principal. Es un microservicio escrito en Python 3 utilizando FastAPI y Scikit-Learn. Este servicio recibe los datos del empleado, los procesa a través del modelo entrenado y devuelve el porcentaje de riesgo de fuga (Flight Risk).

---

## Stack del ML Service

- **Framework Web:** FastAPI (con Uvicorn).
- **Librerías ML:** scikit-learn, pandas, numpy.
- **Algoritmo principal:** Random Forest Classifier (método de ensamble recomendado en la tesis para evitar sobreajuste).
- **Serialización:** joblib para guardar y cargar el modelo entrenado (`.pkl` o `.joblib`).

---

## Reglas de desarrollo del servicio ML

- Los nombres de variables, funciones y rutas van en **inglés** (`predict_churn`, `/api/v1/predict`).
- Los mensajes de error de validación (Pydantic) o de la API deben estar en **español paraguayo**. Ejemplo: `"Faltan datos del empleado para hacer la predicción"`.
- Evitar lógica de negocio (como autenticación compleja) en este servicio; el backend de Node.js es el único que se comunica con FastAPI.

---

## Diccionario de Variables Predictivas (Feature Engineering)

Según el marco teórico de la tesis, el modelo debe ingerir y evaluar estas variables clave (basadas en la Teoría Bifactorial de Herzberg y el burnout):

| Variable | Tipo | Descripción |
|---|---|---|
| `salaryBand` | Float/Int | Salario actual |
| `remoteWork` | Boolean/Int | `1` si es remoto/híbrido, `0` si es 100% presencial |
| `unplannedOvertime` | Float | Horas extras no planificadas (mide deuda técnica/burnout) |
| `timeUnderSameManager` | Int | Tiempo bajo el mismo líder técnico |
| `contextSwitchingScore` | Float | Cantidad de proyectos simultáneos asignados |
| `seniority` | String/Int | Junior, Semi-Senior, Senior |
| `monthsWithoutPromotion` | Int | Meses desde el último ascenso |

---

## Estructura de Endpoints (FastAPI)

### `POST /api/v1/predict`

Recibe un JSON con las características del empleado y devuelve la probabilidad de fuga.

**Request:**

```json
{
  "employeeId": "uuid",
  "features": {
    "salary": 15000000,
    "remoteWork": 1,
    "unplannedOvertime": 15.5,
    "contextSwitchingScore": 3,
    "monthsWithoutPromotion": 18
  }
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "flightRisk": 0.85,
    "riskLevel": "HIGH",
    "keyFactors": ["unplannedOvertime", "monthsWithoutPromotion"]
  }
}
```

---

## Manejo de Datos Desbalanceados (Class Imbalance)

- Durante la etapa de entrenamiento (scripts internos), aplicar técnicas como **SMOTE** o `class_weight='balanced'` en Random Forest, ya que la mayoría de los empleados no renuncia (desbalance de clases).
- Registrar siempre las métricas de **Recall, Precision, F1-Score y AUC-ROC** al evaluar el modelo.
