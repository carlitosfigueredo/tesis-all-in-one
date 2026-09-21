# Mejoras implementadas: entrenamiento por empresa, estrategias de retención, reportes y dashboard configurable

Fecha: 2026-09-21
Rama: `feat/mejoras`

Este documento resume las funcionalidades agregadas y los cambios realizados sobre
el sistema BI de predicción de deserción laboral. Está pensado como referencia
técnica y como apoyo para la defensa.

---

## Resumen ejecutivo

Se detectaron y resolvieron cuatro puntos:

1. **Entrenamiento del modelo con datos reales de la empresa.** Antes, el botón
   "Entrenar ahora" reentrenaba el modelo sobre un dataset sintético fijo
   (1.000 empleados de "Software PY"), ignorando por completo a los empleados
   cargados. Ahora entrena con los empleados reales de la empresa del usuario.
2. **Estrategias de retención** (pilar de la tesis): antes eran textos efímeros
   calculados en el navegador y no se guardaban. Ahora son entidades persistidas,
   con estado y seguimiento.
3. **Reportes exportables** (pilar de la tesis): no existían. Se agregó generación
   de reportes en PDF y Excel.
4. **Dashboard configurable y personalizado** (pilar de la tesis): el dashboard
   era fijo y su tendencia histórica usaba datos inventados. Ahora es
   personalizable por usuario y la tendencia se calcula con datos reales.

---

## 1. Entrenamiento del modelo con los empleados de la empresa

### Problema
El endpoint `POST /api/model/train` llamaba a `trainModel()`, que en el ML service
(Python) leía un CSV sintético en disco (`dataset_desercion_software_py.csv`). Por
eso "entrenaba" aunque la empresa no tuviera ningún empleado, y el texto
"1.000 empleados" era una etiqueta fija.

### Solución
- **Backend nuevo:** `backend/src/services/companyTraining.service.js`
  - `buildCompanyDataset(companyId)`: arma el dataset con los empleados de esa
    empresa (filtrado por `companyId`), reutilizando `employeeToTrainingRow` del
    servicio de entrenamiento global (mismo formato, datos anonimizados).
  - `trainCompanyModel(companyId)`: valida y entrena vía `mlService.trainDataset(rows)`.
    Devuelve error claro (422) si no hay empleados o si no hay casos de ambas
    clases (empleados que se fueron y que permanecieron).
- **Backend modificado:** `backend/src/routes/model.routes.js`
  - `POST /api/model/train` ahora usa `trainCompanyModel(req.user.companyId)` en
    lugar del CSV sintético. Registra auditoría `COMPANY_MODEL_TRAINED` y traduce
    los errores 422 (propios y del ML service) a mensajes entendibles.
- **Frontend modificado:** `frontend/src/pages/ModelML.jsx`
  - Se quitó el texto fijo "Dataset custom: Software PY · 1.000 empleados".
  - El botón "Entrenar ahora" ya no depende del CSV; el aviso ahora explica que se
    entrena con los empleados de la empresa y que se necesita historial de
    deserción real (ambas clases).

### Nota conceptual
El modelo aprende del campo `desercion_real` de cada empleado (si efectivamente se
fue o no). Sin ese dato histórico en ambas clases, ningún modelo supervisado puede
aprender. El sistema ahora lo comunica claramente en vez de entrenar sobre datos
falsos.

---

## 2. Estrategias de retención (persistidas y con seguimiento)

### Modelo de datos (Prisma)
`backend/prisma/schema.prisma` — nuevo modelo `RetentionStrategy`:

- `factorKey`: factor de riesgo que originó la estrategia (ej. `horas_extra`,
  `estancamiento_carrera`, o `general` para mantenimiento).
- `titulo`, `descripcion`, `motivo`: la acción sugerida y su justificación.
- `prioridad`: `CRITICA | ALTA | MEDIA | BAJA`.
- `estado` (enum `RetentionStatus`): `SUGERIDA | EN_CURSO | COMPLETADA | DESCARTADA`.
- `nivelRiesgoAlGenerar`: foto del nivel de riesgo del empleado al momento de
  generar la estrategia.
- `notas`: seguimiento que agrega RRHH.
- `completedAt`, relaciones con `Employee` y `Company`, `assignedToUserId`.

### Lógica de generación
`backend/src/services/retentionFactors.js`: catálogo de factores de riesgo (portado
de la lógica del frontend `riskInsights.js`) que, a partir de los datos reales del
empleado, produce estrategias accionables. Transparente y auditable: las reglas se
pueden leer y explicar.

### API
`backend/src/controllers/retention.controller.js` + `backend/src/routes/retention.routes.js`
(montado en `/api/retention`, multi-tenant, permisos `retention.read` / `retention.manage`):

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/api/retention/strategies` | Lista estrategias de la empresa (filtros: estado, prioridad, empleado) |
| GET | `/api/retention/strategies/summary` | Conteos por estado + críticas pendientes |
| GET | `/api/retention/employees/:employeeId/strategies` | Estrategias de un empleado |
| POST | `/api/retention/employees/:employeeId/generate` | Genera estrategias desde los factores actuales (no duplica) |
| PATCH | `/api/retention/strategies/:id` | Actualiza estado / notas / prioridad |
| DELETE | `/api/retention/strategies/:id` | Elimina una estrategia |

### Frontend
- `frontend/src/components/retention/RetentionPanel.jsx`: panel por empleado
  (generar, iniciar, completar, descartar, anotar). Ciclo de vida
  `SUGERIDA → EN_CURSO → COMPLETADA / DESCARTADA`.
- `frontend/src/pages/EmployeeDetail.jsx`: se reemplazó la sección estática de
  recomendaciones por el panel conectado al backend.
- `frontend/src/pages/Retention.jsx`: página global con resumen (tarjetas) y tabla
  filtrable por estado, con acciones y enlace al detalle del empleado.

---

## 3. Reportes exportables (PDF y Excel)

### Librerías
Se agregaron `pdfkit` y `exceljs` al backend (`backend/package.json`).

### Servicios
- `backend/src/services/reportData.service.js`: `buildRetentionReport(user)` reúne
  los datos (multi-tenant): resumen de riesgo, segmentación por rol / seniority /
  modalidad, top de empleados en riesgo y estado de las estrategias.
- `backend/src/services/reportGenerator.service.js`:
  - `generatePdf(report)` → informe ejecutivo en PDF (secciones + tablas).
  - `generateExcel(report)` → libro Excel con varias hojas (Resumen, Por rol, Por
    seniority, Por modalidad, Top riesgo, Estrategias).

### API
`backend/src/controllers/reports.controller.js` + `backend/src/routes/reports.routes.js`
(montado en `/api/reports`, permiso `reports.view`):

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/api/reports/retention` | Dataset del reporte en JSON (previsualización) |
| GET | `/api/reports/retention/pdf` | Descarga PDF |
| GET | `/api/reports/retention/excel` | Descarga Excel |

Cada exportación registra auditoría `REPORT_EXPORTED`.

### Frontend
`frontend/src/pages/Reports.jsx`: previsualiza el reporte (KPIs, segmentaciones,
estrategias, top de riesgo) y permite descargar PDF o Excel (descarga vía blob).

---

## 4. Dashboard configurable y tendencia real

### Modelo de datos (Prisma)
Nuevo modelo `DashboardConfig` (un registro por usuario): `widgets` (JSON con
`{ key, visible, orden }`), relación con `User` (único) y `Company`.

### Tendencia real
`backend/src/controllers/dashboard.controller.js` → `GET /api/dashboard/trend`
calcula la evolución del riesgo por mes a partir de los `RiskSnapshot` reales de la
empresa (antes era un `generateTrend()` con datos aleatorios). Devuelve `hasData`
para que el frontend avise honestamente cuando no hay historial suficiente.

### Personalización de widgets
Endpoints (montados en `/api/dashboard`):

| Método | Endpoint | Permiso | Descripción |
|--------|----------|---------|-------------|
| GET | `/api/dashboard/trend` | `dashboard.view` | Tendencia real (query `months`) |
| GET | `/api/dashboard/config` | `dashboard.view` | Config de widgets del usuario (o default) |
| PUT | `/api/dashboard/config` | `dashboard.config` | Guarda la personalización |
| DELETE | `/api/dashboard/config` | `dashboard.config` | Restaura la config por defecto |

Widgets disponibles: `kpis`, `risk_distribution`, `risk_by_dept`, `trend`,
`top_risk`, `strategies`.

### Frontend
`frontend/src/pages/Dashboard.jsx` reescrito: consume la tendencia real, renderiza
solo los widgets visibles en el orden configurado, y agrega un panel "Personalizar"
(mostrar/ocultar y reordenar widgets, guardar / restaurar). Se corrigieron además
los nombres de campos consumidos del endpoint `/employees/stats`.

---

## Permisos y roles (RBAC)

`backend/prisma/seed.js` — permisos nuevos:

- `retention.read`, `retention.manage`
- `reports.view`
- `dashboard.config`

Asignación:
- **COMPANY_ADMIN**: todos los nuevos.
- **ANALYST**: `retention.read`, `retention.manage`, `reports.view`, `dashboard.config`.
- **VIEWER**: `retention.read`, `reports.view`.
- **SUPER_ADMIN**: todos (bypass de permisos).

---

## Migración de base de datos

Migración: `backend/prisma/migrations/20260920000000_retention_strategies_and_dashboard_config/`

Crea el enum `RetentionStatus` y las tablas `retention_strategies` y
`dashboard_configs` (con índices y llaves foráneas).

### Cómo aplicar (entorno Docker)
```bash
docker exec tesis_backend npx prisma migrate deploy
docker exec tesis_backend npx prisma db seed   # registra permisos nuevos y roles
```
> El `seed` es necesario para que los permisos nuevos existan y se asignen a los
> roles. Sin él, los usuarios que no sean SUPER_ADMIN no verán las funciones.

---

## Verificación realizada

- `prisma validate` y `prisma generate`: OK.
- `node --check` en todos los archivos backend nuevos/modificados: OK.
- Build del frontend (`npm run build`): OK.
- Migración aplicada y tablas confirmadas en Postgres (`retention_strategies`,
  `dashboard_configs`).
- Seed ejecutado: 23 permisos, incluidos los 4 nuevos (confirmados en la tabla
  `permissions`).
- Pruebas end-to-end contra la base real (con token válido del admin demo):
  - Generación y persistencia de estrategias (resumen pasó de 0 a 1).
  - `dashboard/config` (6 widgets) y `dashboard/trend` (calcula desde snapshots
    reales; `hasData:false` cuando no hay historial).
  - Reporte JSON con datos reales; PDF válido (firma `%PDF`); Excel válido
    (firma `PK`).

---

## Archivos nuevos

**Backend**
- `backend/src/services/companyTraining.service.js`
- `backend/src/services/retentionFactors.js`
- `backend/src/controllers/retention.controller.js`
- `backend/src/routes/retention.routes.js`
- `backend/src/services/reportData.service.js`
- `backend/src/services/reportGenerator.service.js`
- `backend/src/controllers/reports.controller.js`
- `backend/src/routes/reports.routes.js`
- `backend/src/controllers/dashboard.controller.js`
- `backend/src/routes/dashboard.routes.js`
- `backend/prisma/migrations/20260920000000_retention_strategies_and_dashboard_config/migration.sql`

**Frontend**
- `frontend/src/components/retention/RetentionPanel.jsx`
- `frontend/src/pages/Retention.jsx`
- `frontend/src/pages/Reports.jsx`

## Archivos modificados (por esta serie de cambios)
- `backend/prisma/schema.prisma` (modelos `RetentionStrategy`, `DashboardConfig` + relaciones)
- `backend/prisma/seed.js` (permisos y roles)
- `backend/src/routes/index.js` (monta `/retention`, `/reports`, `/dashboard`)
- `backend/src/routes/model.routes.js` (entrenamiento por empresa)
- `backend/package.json` / `backend/package-lock.json` (pdfkit, exceljs)
- `frontend/src/App.jsx` (rutas `/retention`, `/reports`)
- `frontend/src/components/layout/Sidebar.jsx` (enlaces Retención y Reportes)
- `frontend/src/pages/Dashboard.jsx` (configurable + tendencia real)
- `frontend/src/pages/EmployeeDetail.jsx` (panel de retención)
- `frontend/src/pages/ModelML.jsx` (entrenamiento con empleados de la empresa)
- `ml-service/routers/training.py` (soporte de entrenamiento por dataset enviado)

---

## 5. Generación automática de estrategias + notificación por correo

Agregado posterior a los pilares. Automatiza la generación de estrategias y avisa
al equipo de RRHH cuando hay empleados en riesgo.

### Comportamiento
- **Umbral:** solo empleados en riesgo **ALTO** o **CRÍTICO** (activos).
- **Sin duplicar:** no vuelve a crear estrategias para factores que ya tienen una
  activa (SUGERIDA / EN_CURSO).
- **Notificación:** un único correo resumen por empresa (no uno por empleado) a
  los usuarios con rol **COMPANY_ADMIN**. Solo se envía si hubo estrategias nuevas.
- **No bloqueante:** si el correo o la generación fallan, se loguea pero no rompe
  el flujo de importación/recálculo.

### Disparadores
1. **En cada recálculo de riesgo** (import y recálculo manual), cuando la política
   del plan permitió recalcular. — `backend/src/controllers/employees.controller.js`
2. **Job programado semanal** que recorre todas las empresas activas.
   — `backend/src/jobs/retentionScan.job.js` (intervalo configurable con
   `RETENTION_SCAN_INTERVAL_MIN`, default 10080 min = 7 días).

### Archivos
Nuevos:
- `backend/src/services/autoRetention.service.js` — `processCompany(companyId, opts)`:
  genera estrategias para los empleados en riesgo y notifica a los admins.
- `backend/src/jobs/retentionScan.job.js` — scheduler semanal (patrón `setInterval`
  nativo, idempotente), registrado en `backend/src/index.js`.
- `backend/src/templates/email/retention-alert.html` — template del correo de alerta.

Modificados:
- `backend/src/services/email.service.js` — nueva `sendRetentionAlertEmail(...)`.
- `backend/src/controllers/employees.controller.js` — llama a `processCompany` tras
  el recálculo en `importEmployees` y `recalculateRisk`.
- `backend/src/index.js` — arranca el job semanal (`startRetentionScanJob`).

### Verificación
- `node --check` OK en todos los archivos.
- Job confirmado en logs: `[RetentionScan] Job iniciado (cada 10080 min)` + pasada
  inicial sobre 6 empresas sin errores.
- Prueba forzada (un empleado a CRÍTICO con factores reales): 9 estrategias
  generadas y correo efectivamente enviado al COMPANY_ADMIN (messageId real vía
  SMTP/Brevo), `notificado: true`.
