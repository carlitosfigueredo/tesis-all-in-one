---
inclusion: always
---

# Auditoría — Registro de acciones del sistema

## Propósito

El sistema de auditoría cumple dos funciones:
1. **Seguridad:** detectar accesos no autorizados, patrones anómalos y trazabilidad de incidentes (OWASP A09).
2. **Tesis:** demostrar trazabilidad completa de operaciones en un sistema SaaS multiempresa.

Todo lo que modifica estado o involucra autenticación debe quedar registrado en `audit_logs`.

Los valores del campo `action` son siempre en inglés y en mayúsculas (convención técnica).  
Los mensajes de error o descripción que se muestran al usuario van en español paraguayo.

---

## Tabla de referencia: acciones auditadas

| Acción (`action`) | Recurso | Cuándo se registra |
|---|---|---|
| `LOGIN_SUCCESS` | `users` | Login exitoso |
| `LOGIN_FAILED` | `users` | Credenciales incorrectas |
| `LOGIN_BLOCKED` | `users` | Cuenta bloqueada al intentar login |
| `LOGOUT` | `users` | Cierre de sesión |
| `TOKEN_REFRESHED` | `users` | Refresh de JWT |
| `PASSWORD_RESET_REQUESTED` | `users` | Solicitud de reset |
| `PASSWORD_RESET_COMPLETED` | `users` | Reset exitoso |
| `PASSWORD_RESET_FAILED` | `users` | Token inválido o expirado |
| `PASSWORD_CHANGED` | `users` | Cambio de contraseña desde perfil |
| `ACCOUNT_LOCKED` | `users` | Cuenta bloqueada por intentos |
| `ACCOUNT_UNLOCKED` | `users` | Cuenta desbloqueada (manual o automático) |
| `USER_CREATED` | `users` | Nuevo usuario creado |
| `USER_UPDATED` | `users` | Usuario actualizado |
| `USER_DELETED` | `users` | Usuario eliminado |
| `EMPLOYEE_CREATED` | `employees` | Nuevo empleado registrado |
| `EMPLOYEE_UPDATED` | `employees` | Empleado actualizado |
| `EMPLOYEE_DELETED` | `employees` | Empleado eliminado |
| `ML_PREDICTION_REQUESTED` | `ml_predictions` | Predicción solicitada al ml-service |
| `ML_PREDICTION_COMPLETED` | `ml_predictions` | Predicción recibida y guardada |
| `TENANT_CREATED` | `tenants` | Nueva empresa registrada |
| `TENANT_UPDATED` | `tenants` | Empresa actualizada |
| `UNAUTHORIZED_ACCESS` | — | Intento de acceso a recurso de otro tenant |
| `RATE_LIMIT_EXCEEDED` | — | Se superó el rate limit en un endpoint |

---

## Implementación del servicio de auditoría

Centralizar toda la lógica en `backend/src/services/audit.service.js`:

```js
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * Registra una accion en audit_logs.
 * No lanza excepciones: un fallo de auditoria no debe interrumpir el flujo.
 */
const logAction = async ({
  tenantId = null,
  userId = null,
  action,
  resource = null,
  resourceId = null,
  oldValue = null,
  newValue = null,
  ipAddress = null,
  userAgent = null,
  status = 'SUCCESS',
  errorMsg = null,
}) => {
  try {
    await prisma.auditLog.create({
      data: {
        tenantId,
        userId,
        action,
        resource,
        resourceId,
        oldValue,
        newValue,
        ipAddress,
        userAgent,
        status,
        errorMsg,
      },
    });
  } catch (err) {
    // Solo loguear en consola, nunca propagar
    console.error('[Audit] Error al registrar accion:', err.message);
  }
};

module.exports = { logAction };
```

---

## Helpers para extraer datos del request

```js
// backend/src/utils/request.utils.js

const getIp = (req) => {
  return req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.ip || 'unknown';
};

const getUserAgent = (req) => {
  return req.headers['user-agent'] || 'unknown';
};

module.exports = { getIp, getUserAgent };
```

---

## Uso en controladores

```js
// Ejemplo en auth.controller.js — login exitoso
await logAction({
  tenantId: user.tenantId,
  userId: user.id,
  action: 'LOGIN_SUCCESS',
  resource: 'users',
  resourceId: user.id,
  ipAddress: getIp(req),
  userAgent: getUserAgent(req),
  status: 'SUCCESS',
});

// Ejemplo en auth.controller.js — login fallido
await logAction({
  tenantId: null,
  userId: null,
  action: 'LOGIN_FAILED',
  resource: 'users',
  ipAddress: getIp(req),
  userAgent: getUserAgent(req),
  status: 'FAILURE',
  errorMsg: `Intento fallido para email: ${email}`,
  // No incluir la contraseña ni el email completo en errorMsg en produccion
});

// Ejemplo en employees.controller.js — actualización de empleado
await logAction({
  tenantId: req.user.tenantId,
  userId: req.user.id,
  action: 'EMPLOYEE_UPDATED',
  resource: 'employees',
  resourceId: employee.id,
  oldValue: oldEmployee,      // Snapshot antes del cambio
  newValue: updatedEmployee,  // Snapshot después del cambio
  ipAddress: getIp(req),
  userAgent: getUserAgent(req),
});
```

---

## Middleware de auditoría automática (opcional)

Para endpoints CRUD, se puede crear un middleware que audite automáticamente:

```js
// backend/src/middlewares/auditMiddleware.js

const { logAction } = require('../services/audit.service');
const { getIp, getUserAgent } = require('../utils/request.utils');

const METHOD_ACTION_MAP = {
  POST: 'CREATED',
  PUT: 'UPDATED',
  PATCH: 'UPDATED',
  DELETE: 'DELETED',
};

const auditMiddleware = (resource) => async (req, res, next) => {
  const originalJson = res.json.bind(res);

  res.json = (body) => {
    if (res.statusCode < 400 && METHOD_ACTION_MAP[req.method]) {
      const action = `${resource}_${METHOD_ACTION_MAP[req.method]}`;
      logAction({
        tenantId: req.user?.tenantId,
        userId: req.user?.id,
        action,
        resource: resource.toLowerCase(),
        resourceId: body?.data?.id || req.params?.id,
        ipAddress: getIp(req),
        userAgent: getUserAgent(req),
        status: 'SUCCESS',
      });
    }
    return originalJson(body);
  };

  next();
};

module.exports = auditMiddleware;
```

Uso en rutas:
```js
router.post('/employees', authenticate, auditMiddleware('EMPLOYEE'), createEmployee);
router.put('/employees/:id', authenticate, auditMiddleware('EMPLOYEE'), updateEmployee);
```

---

## Consulta de logs (endpoint admin)

Implementar `GET /api/admin/audit-logs` solo para roles `ADMIN` y `SUPER_ADMIN`:

- Filtros: `action`, `userId`, `resourceId`, `dateFrom`, `dateTo`, `status`.
- Paginación obligatoria: `page` y `pageSize` (máximo 100 por página).
- Solo retornar logs del propio tenant (excepto `SUPER_ADMIN` que ve todos).
- No exponer `oldValue`/`newValue` completos en el listado, solo en el detalle de un log individual.

---

## Retención de datos

- Por defecto: conservar logs de los últimos **90 días**.
- Para tesis: no borrar nada, mantener todos los registros.
- En producción real: implementar política de retención configurable por tenant.

---

## Qué NO registrar

- Contraseñas (ni en texto plano ni hasheadas).
- Tokens de sesión o de reset.
- Datos de tarjetas de crédito u información de pago.
- Información de salud (si aplica en el futuro).

Si es necesario referenciar un dato sensible, loguear solo los primeros/últimos 4 caracteres o un hash.
