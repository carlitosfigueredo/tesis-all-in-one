// src/services/audit.service.js
// Registro centralizado de acciones en la tabla audit_logs (PostgreSQL).
// No lanza excepciones: un fallo de auditoria no interrumpe el flujo principal.

const prisma = require('../lib/prisma');

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
    await prisma.auditLog.create({
      data: {
        tenantId,
        userId,
        action,
        resource,
        resourceId,
        oldValue:  oldValue  ? JSON.parse(JSON.stringify(oldValue))  : null,
        newValue:  newValue  ? JSON.parse(JSON.stringify(newValue))  : null,
        ipAddress,
        userAgent,
        status,
        errorMsg,
      },
    });

    if (process.env.NODE_ENV !== 'production') {
      console.log(`[Audit] ${status} | ${action} | user=${userId ?? 'anon'} | ip=${ipAddress ?? '-'}`);
    }
  } catch (err) {
    // Solo loguear en consola, nunca propagar
    console.error('[Audit] Error al registrar accion:', err.message);
  }
};

/**
 * Obtiene audit logs con filtros y paginacion.
 * Usado internamente por admin.controller (getAdminAuditLogs).
 */
const getAuditLogs = async ({ tenantId, action, status, userId, dateFrom, dateTo, page = 1, pageSize = 50 } = {}) => {
  const where = {};
  if (tenantId) where.tenantId = tenantId;
  if (action)   where.action   = action;
  if (status)   where.status   = status;
  if (userId)   where.userId   = userId;
  if (dateFrom || dateTo) {
    where.createdAt = {};
    if (dateFrom) where.createdAt.gte = new Date(dateFrom);
    if (dateTo)   where.createdAt.lte = new Date(dateTo);
  }

  const [data, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.auditLog.count({ where }),
  ]);

  return { data, total };
};

module.exports = { logAction, getAuditLogs };
