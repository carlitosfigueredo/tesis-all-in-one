---
inclusion: auto
---

# Requerimientos Por Implementar (antes de defensa)

Estos requerimientos están definidos en la tesis como "implementados" y DEBEN completarse en código antes de la defensa. El documento ya los marca como ✅.

**PRIORIDAD MÁXIMA — implementar en estos días.**

## Resumen de lo pendiente (3 features de código):
1. RF-026: Exportación de reportes (PDF + CSV)
2. RF-027: Trazabilidad histórica de predicciones (endpoint /trend + snapshots)
3. RNF-020: Rate limiting (express-rate-limit — ya instalado, solo configurar)

---

## RF-026 — Exportación de Reportes (PDF/CSV)

**Prioridad:** Media
**Complejidad:** Media

### Qué falta:
- No existe funcionalidad de exportación en frontend ni backend
- No hay librería de generación PDF instalada
- No hay endpoint de descarga CSV

### Implementación sugerida:

**Backend:**
1. Crear `GET /api/employees/export/csv` → genera un CSV con los datos filtrados de empleados (mismo filtro que el listado)
2. Crear `GET /api/employees/export/pdf` → genera un reporte PDF con:
   - Encabezado: nombre empresa, fecha, logo
   - KPIs resumidos (total, distribución de riesgo)
   - Tabla de empleados con riesgo alto/crítico
   - Usar librería `pdfkit` o `puppeteer` para generar el PDF
3. Proteger ambos endpoints con `requirePermission('employees.read')`

**Frontend:**
1. Agregar botones "Exportar CSV" y "Exportar PDF" en la página de Empleados
2. Usar `window.open()` o `fetch` + `blob` para descargar el archivo
3. Pasar los filtros activos como query params al endpoint

**Archivos a crear/modificar:**
- `backend/src/controllers/export.controller.js` (nuevo)
- `backend/src/routes/export.routes.js` (nuevo)
- `backend/src/routes/index.js` (agregar ruta)
- `frontend/src/pages/Employees.jsx` (agregar botones)
- Instalar: `npm install pdfkit` en backend

---

## RF-027 — Trazabilidad Histórica de Predicciones

**Prioridad:** Media
**Complejidad:** Media

### Qué falta:
- El Dashboard muestra "Tendencia Histórica de Riesgo" pero usa datos MOCK generados con `generateTrend()` (random)
- No existe un endpoint `/api/employees/trend` en el backend
- No se almacenan snapshots periódicos de predicciones
- Comentario en el código: "En producción vendrían de /api/employees/trend"

### Implementación sugerida:

**Opción A (Tabla de snapshots):**
1. Crear modelo `PredictionSnapshot` en Prisma:
```prisma
model PredictionSnapshot {
  id        String   @id @default(uuid())
  companyId String
  date      DateTime @default(now())
  critico   Int
  alto      Int
  medio     Int
  bajo      Int
  total     Int
  company   Company  @relation(fields: [companyId], references: [id])
  @@index([companyId, date])
  @@map("prediction_snapshots")
}
```
2. Crear un job/endpoint `POST /api/employees/snapshot` que capture la distribución actual de riesgo de la empresa y la guarde
3. Ejecutar este snapshot automáticamente cada vez que se corre una predicción batch (CU-012)
4. Crear `GET /api/employees/trend?months=6` que retorne los snapshots agrupados por mes

**Opción B (Más simple — calcular desde audit_logs):**
1. Consultar `audit_logs` con action='PREDICTION_BATCH' agrupados por mes
2. No requiere nueva tabla pero es menos preciso

**Frontend:**
- Reemplazar `generateTrend()` en `Dashboard.jsx` por un `useEffect` que llame a `GET /api/employees/trend`

**Archivos a crear/modificar:**
- `backend/prisma/schema.prisma` (agregar modelo)
- `backend/prisma/migrations/` (nueva migración)
- `backend/src/controllers/employees.controller.js` (agregar endpoint trend + snapshot)
- `frontend/src/pages/Dashboard.jsx` (reemplazar mock por API real)

---

## RNF-020 — Rate Limiting

**Prioridad:** Alta (seguridad)
**Complejidad:** Baja (< 30 min)

### Qué falta:
- La dependencia `express-rate-limit` está en `package.json` (ya instalada)
- PERO no se importa ni aplica en ningún archivo del proyecto
- Los endpoints de login y registro están desprotegidos contra brute force a nivel HTTP (el bloqueo de cuenta es lógico, no de red)

### Implementación sugerida:

**Archivo:** `backend/src/app.js`

```javascript
const rateLimit = require('express-rate-limit');

// Rate limit global (100 req/15min por IP)
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { success: false, message: 'Demasiadas solicitudes. Intente más tarde.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Rate limit estricto para auth (5 req/15min por IP)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: { success: false, message: 'Demasiados intentos. Espere 15 minutos.' },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/api', globalLimiter);
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);
app.use('/api/auth/forgot-password', authLimiter);
app.use('/api/admin/auth/login', authLimiter);
```

**Archivos a modificar:**
- `backend/src/app.js` (agregar las líneas arriba antes de las rutas)
- No se necesita instalar nada — ya está en package.json
