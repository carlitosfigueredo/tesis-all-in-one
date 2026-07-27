---
inclusion: always
---

# Backend — Lógica de Negocios BI y Endpoints Agrupados

## Contexto de Inteligencia de Negocios

La base de datos PostgreSQL gestionada por Prisma funciona como un sistema **OLTP** (Online Transaction Processing). Sin embargo, el frontend de Inteligencia de Negocios requiere datos agregados y procesados tipo **OLAP** (Online Analytical Processing).

---

## Reglas para los Endpoints de Analytics

- Crear un controlador específico `analytics.controller.js` para servir datos a los dashboards.
- No hacer que el frontend descargue todos los empleados para sumarlos. El backend debe hacer la **agregación usando agrupaciones en BD**.

### Ejemplos de consultas analíticas requeridas

**Riesgo por Departamento:** Agrupar el promedio de `flightRisk` por departamento.

```js
// Usar prisma.employee.groupBy()
const riskByDept = await prisma.employee.groupBy({
  by: ['department'],
  _avg: { flightRisk: true },
  where: { tenantId: req.user.tenantId, status: 'ACTIVE' }
});
```

**Tendencia de predicciones:** Contar cuántas predicciones dieron "Riesgo Alto" en el último mes.

---

## Sincronización Backend ↔ ML Service (Simulación ETL)

Cuando el usuario solicita predecir el riesgo de un empleado (botón "Analizar Riesgo"), el backend de Node.js actúa como **orquestador**:

1. **Extract** — Extrae los datos del `Employee` desde PostgreSQL usando Prisma.
2. **Transform** — Transforma los datos al formato JSON que espera FastAPI.
3. **Load (call)** — Llama al endpoint `POST /api/v1/predict` del ML Service.
4. **Load (save)** — Guarda el resultado en la tabla `MlPrediction` y actualiza el campo `flightRisk` del `Employee`.

Todo este flujo debe estar envuelto en `try/catch` y registrarse en `audit_logs` con los eventos:
- `ML_PREDICTION_REQUESTED`
- `ML_PREDICTION_COMPLETED`
