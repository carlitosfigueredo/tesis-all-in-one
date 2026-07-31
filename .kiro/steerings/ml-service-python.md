---
inclusion: always
---

# Machine Learning — Servicio de Prediccion (Python + FastAPI)

## Contexto

El motor predictivo esta separado del backend principal. Es un microservicio Python 3 con FastAPI y Scikit-Learn. Predice la probabilidad de desercion laboral de empleados en empresas de desarrollo de software de Asuncion, Paraguay.

---

## Stack del ML Service

- **Framework Web:** FastAPI (con Uvicorn)
- **Librerias ML:** scikit-learn, pandas, numpy, joblib
- **Algoritmo:** Random Forest Classifier (200 estimadores, max_depth=12, class_weight=balanced)
- **Dataset:** `notebooks/data/dataset_desercion_software_py.csv` (1000 registros sinteticos)
- **Modelo serializado:** `model/model.pkl` + `model/encoders.pkl` (LabelEncoders)

---

## Dataset custom — Variables del modelo

17 features + 1 target. Todo en espanol, sin acentos en nombres de columna.

### Variables de RRHH (12 — obligatorias, la empresa las tiene)

| Variable | Tipo | Rango |
|----------|------|-------|
| `edad` | Numerica | 18-65 |
| `nivel_formacion` | Categorica | Secundaria, Tecnico, Universitario, Posgrado |
| `rol_tecnologico` | Categorica | Frontend, Backend, Fullstack, Mobile, DevOps, QA, Data |
| `seniority` | Categorica | Trainee, Junior, Semi-Senior, Senior, Lead |
| `antiguedad_meses` | Numerica | 0-360 |
| `modalidad_trabajo` | Categorica | Presencial, Hibrido, Remoto |
| `tipo_contrato` | Categorica | Indefinido, Plazo fijo, Eventual |
| `salario_mensual` | Numerica | En guaranies (Gs.) |
| `cantidad_horas_extra_mes` | Numerica | 0-80 |
| `capacitacion_ultimo_anio` | Binaria | Si/No (bool en API) |
| `evaluacion_desempeno` | Ordinal | 1-5 |
| `cantidad_empresas_anteriores` | Numerica | 0-15 |

### Variables de encuesta clima (5 — opcionales, mejoran precision)

| Variable | Tipo | Rango | Impacto |
|----------|------|-------|---------|
| `satisfaccion_laboral` | Ordinal | 1-5 | CRITICA |
| `satisfaccion_ambiente` | Ordinal | 1-5 | Media |
| `equilibrio_vida_trabajo` | Ordinal | 1-5 | CRITICA |
| `estancamiento_carrera` | Ordinal | 1-5 | CRITICA |
| `feedback_lider` | Ordinal | 1-5 | Alta |

### Target

| Variable | Tipo | Valores |
|----------|------|---------|
| `desercion` | Binaria | Si / No |

### Logica de variables opcionales

Si la empresa no proporciona las variables de encuesta clima:
- El modelo usa valor neutro (3) como default
- La confianza de la prediccion se penaliza (5% por cada variable faltante)
- La respuesta incluye `variables_faltantes` con la lista de campos no proporcionados

---

## Endpoints del ML Service

### `GET /api/model/status`
Estado del modelo (entrenado o no, registros del dataset, tamano).

### `POST /api/train`
Entrena el modelo con el dataset. Retorna metricas completas (AUC-ROC, accuracy, recall, confusion matrix, feature importances con tier).

### `POST /api/predict`
Predice desercion para un empleado. Retorna:
- `riesgo_desercion` (0.0-1.0)
- `nivel_riesgo` (BAJO < 0.30, MEDIO 0.30-0.50, ALTO 0.50-0.75, CRITICO > 0.75)
- `confianza`
- `variables_faltantes`
- `recomendacion` (texto segun nivel)

### `POST /api/predict/batch`
Prediccion en lote (array de empleados).

### `GET /api/employees/stats`
Estadisticas del dataset con predicciones vectorizadas.

### `GET /api/employees`
Lista paginada del dataset con predicciones.

---

## Restriccion por plan

- Plan CORPORATIVO: puede entrenar bajo demanda (boton "Entrenar ahora")
- Plan PROFESIONAL: predicciones se actualizan semanalmente
- Plan ESTANDAR: predicciones se actualizan mensualmente
- El backend verifica el plan en `POST /api/model/train` antes de permitir

---

## Datasets de prueba (5 empresas simuladas)

En `notebooks/data/empresas/`:
- `technova_solutions_120.csv` — Startup, 120 empleados, 29% desercion
- `guarani_code_85.csv` — Software factory con problemas, 85 emp, 44% desercion
- `datapy_consulting_52.csv` — Consultora premium, 52 emp, 12% desercion
- `appmakers_paraguay_345.csv` — Empresa grande, 345 emp, 31% desercion
- `cloudsoft_saci_178.csv` — Enfocada en cloud/DevOps, 178 emp, 18% desercion

---

## Comunicacion Backend ↔ ML Service

- El backend Node llama al ML service via HTTP interno (`ML_SERVICE_URL=http://ml-service:8000`)
- `ml.service.js` tiene funciones: `calcularRiesgoEmpleado()`, `calcularRiesgoBatch()`, `trainModel()`, `getModelStatus()`
- `employeeToFeatures()` mapea un registro de Prisma al formato que espera el ML service
- Si el ML service no responde, las funciones retornan valores por defecto (riesgo 0, nivel BAJO)
