// src/middlewares/auditMiddleware.js
// Middleware de auditoria automatica para endpoints CRUD.
// Intercepta la respuesta y registra la accion si fue exitosa.

const { logAction } = require('../services/audit.service');
const { getIp, getUserAgent } = require('../utils/request.utils');

const METHOD_ACTION_MAP = {
  POST:   'CREATED',
  PUT:    'UPDATED',
  PATCH:  'UPDATED',
  DELETE: 'DELETED',
};

/**
 * Uso en rutas:
 *   router.post('/employees', protect, auditMiddleware('EMPLOYEE'), createEmployee);
 *   router.delete('/employees/:id', protect, auditMiddleware('EMPLOYEE'), deleteEmployee);
 *
 * @param {string} resource - Nombre del recurso en mayusculas: 'EMPLOYEE', 'USER', etc.
 */
const auditMiddleware = (resource) => (req, res, next) => {
  const suffix = METHOD_ACTION_MAP[req.method];

  // Solo auditar metodos que modifican estado
  if (!suffix) return next();

  const originalJson = res.json.bind(res);

  res.json = (body) => {
    // Registrar solo si la respuesta fue exitosa (2xx)
    if (res.statusCode >= 200 && res.statusCode < 300 && body?.success !== false) {
      const action     = `${resource}_${suffix}`;
      const resourceId = body?.data?.id ?? req.params?.id ?? null;

      logAction({
        tenantId:   req.user?.companyId ?? null,
        userId:     req.user?.id        ?? null,
        action,
        resource:   resource.toLowerCase(),
        resourceId,
        ipAddress:  getIp(req),
        userAgent:  getUserAgent(req),
        status:     'SUCCESS',
        newValue:   body?.data ?? null,
      });
    }

    return originalJson(body);
  };

  next();
};

module.exports = { auditMiddleware };
