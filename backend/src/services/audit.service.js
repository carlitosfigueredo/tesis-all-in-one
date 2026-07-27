// src/services/audit.service.js
// Registro centralizado de acciones en audit_logs.
// No lanza excepciones: un fallo de auditoria no interrumpe el flujo principal.

// En desarrollo usamos un store en memoria (mock).
// Cuando Prisma este conectado, descomentar el bloque real y eliminar el mock.

const auditStore = []; // mock en memoria para desarrollo

/**
 * Registra una accion en audit_logs.
 *
 * @param {object} params
 * @param {string|null}  params.tenantId
 * @param {string|null}  params.userId
 * @param {string}       params.action      - Constante en mayusculas: LOGIN_SUCCESS, EMPLOYEE_CREATED, etc.
 * @param {string|null}  params.resource    - Nombre de la entidad: 'users', 'employees', etc.
 * @param {string|null}  params.resourceId
 * @param {object|null}  params.oldValue    - Snapshot antes del cambio (updates)
 * @param {object|null}  params.newValue    - Snapshot despues del cambio
 * @param {string|null}  params.ipAddress
 * @param {string|null}  params.userAgent
 * @param {'SUCCESS'|'FAILURE'|'WARNING'} params.status
 * @param {string|null}  params.errorMsg
 */
const logAction = async ({
  tenantId   = null,
  userId     = null,
  action,
  resource   = null,
  resourceId = null,
  oldValue   = null,
  newValue   = null,
  ipAddress  = null,
  userAgent  = null,
  status     = 'SUCCESS',
  errorMsg   = null,
}) => {
  try {
    const entry = {
      id:         `audit-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
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
      createdAt:  new Date().toISOString(),
    };

    // ── Mock (desarrollo sin DB) ──────────────────────────────────────────────
    auditStore.push(entry);
    console.log(`[Audit] ${status} | ${action} | user=${userId ?? 'anon'} | ip=${ipAddress ?? '-'}`);

    // ── Prisma (produccion) — descomentar cuando este la BD conectada ─────────
    // const { PrismaClient } = require('@prisma/client');
    // const prisma = new PrismaClient();
    // await prisma.auditLog.create({ data: entry });

  } catch (err) {
    // Solo loguear en consola, nunca propagar
    console.error('[Audit] Error al registrar accion:', err.message);
  }
};

// Retorna todos los logs del mock (util para el endpoint admin en desarrollo)
const getAuditLogs = ({ tenantId, action, status, limit = 100 } = {}) => {
  let result = [...auditStore].reverse(); // mas recientes primero
  if (tenantId) result = result.filter((l) => l.tenantId === tenantId);
  if (action)   result = result.filter((l) => l.action === action);
  if (status)   result = result.filter((l) => l.status === status);
  return result.slice(0, limit);
};

module.exports = { logAction, getAuditLogs };
