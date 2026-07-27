---
inclusion: always
---

# Frontend — Visualización y Dashboards BI (React)

## Contexto

El sistema debe resolver la "brecha operativa" mencionada en la tesis: el usuario final (Gerente de RRHH o CTO) no entiende de modelos matemáticos; necesita ver los datos interpretados en un Dashboard interactivo.

---

## Stack de UI y Gráficos

- **Librería gráfica:** Recharts (priorizar por su integración natural con React).
- **Estilos:** Tailwind CSS.
- **Componentes:** Usar un enfoque modular (ej. `RiskGauge.jsx`, `TurnoverTrend.jsx`).

---

## Reglas de Visualización de Datos (BI)

### Semáforo de Riesgo (Risk Gauges)

La probabilidad de fuga predictiva (Flight Risk) debe mostrarse visualmente:

| Rango | Color | Nivel |
|---|---|---|
| 0.0 – 0.30 | 🟢 Verde | Riesgo Bajo |
| 0.31 – 0.69 | 🟡 Amarillo | Riesgo Medio |
| 0.70 – 1.0 | 🔴 Rojo | Riesgo Alto (requiere acción inmediata) |

### KPIs principales a mostrar en el Home

- Empleados totales activos.
- Tasa de rotación histórica (fórmula de Zaballa Gomariz como referencia histórica).
- Cantidad de empleados en Riesgo Alto (predicción ML).

### Filtros

Todo dashboard debe permitir filtrar por `department` (ej. Frontend, Backend, QA) y `seniority`.

---

## Idioma y Tono (Frontend)

Todo el texto visible para el usuario va en **español paraguayo**, tono directo.

Ejemplos de etiquetas:

| Inglés técnico | Español para el usuario |
|---|---|
| Predictive Churn Rate | Riesgo de fuga / Probabilidad de renuncia |
| Execute action plan | Crear plan de retención |
| Employee details | Perfil del colaborador |

---

## Manejo de Errores en UI

- Si el backend de ML tarda en responder: mostrar un **Skeleton Loader** o spinner con el texto `"Analizando datos del colaborador..."`.
- Si falla la carga de gráficos: `"No pudimos cargar este gráfico. Intenta recargar la página."`
