// ─────────────────────────────────────────
// Middleware RBAC — Control de acceso por permisos
// ─────────────────────────────────────────

const prisma = require('../lib/prisma');

// Cache en memoria para permisos de usuario (evita queries repetidos en la misma request)
// Se invalida por usuario cuando cambian roles/permisos
const permissionCache = new Map();
const CACHE_TTL_MS = 60 * 1000; // 1 minuto

/**
 * Obtiene todos los permisos de un usuario consultando sus roles.
 * Resultado cacheado por 1 minuto.
 */
const getUserPermissions = async (userId) => {
  const cached = permissionCache.get(userId);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return { permissions: cached.permissions, roleNames: cached.roleNames };
  }

  const userRoles = await prisma.userRole.findMany({
    where: { userId },
    include: {
      role: {
        include: {
          rolePermissions: {
            include: { permission: true },
          },
        },
      },
    },
  });

  const permissions = new Set();
  const roleNames = [];

  for (const ur of userRoles) {
    roleNames.push(ur.role.name);
    for (const rp of ur.role.rolePermissions) {
      permissions.add(rp.permission.code);
    }
  }

  const result = { permissions: [...permissions], roleNames };
  permissionCache.set(userId, { ...result, timestamp: Date.now() });
  return result;
};

/**
 * Invalida el cache de permisos para un usuario.
 * Llamar cuando se cambian roles/permisos de un usuario.
 */
const invalidatePermissionCache = (userId) => {
  permissionCache.delete(userId);
};

/**
 * Middleware que verifica que el usuario tenga al menos uno de los permisos indicados.
 * Uso: requirePermission('employees.read')
 *      requirePermission('employees.write', 'employees.delete')
 *
 * Adjunta req.user.permissions y req.user.roleNames al request.
 */
const requirePermission = (...requiredPermissions) => async (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ success: false, message: 'No autorizado' });
  }

  try {
    // Cargar permisos si no estan en el request
    if (!req.user.permissions) {
      const { permissions, roleNames } = await getUserPermissions(req.user.id);
      req.user.permissions = permissions;
      req.user.roleNames = roleNames;
    }

    // SUPER_ADMIN tiene todos los permisos (bypass)
    if (req.user.roleNames?.includes('SUPER_ADMIN')) {
      return next();
    }

    // Verificar que tenga al menos uno de los permisos requeridos
    const hasPermission = requiredPermissions.some((p) => req.user.permissions?.includes(p));

    if (!hasPermission) {
      return res.status(403).json({
        success: false,
        message: 'No tenés permiso para realizar esta acción',
        requiredPermissions,
      });
    }

    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Middleware que carga los permisos del usuario sin bloquear.
 * Util para rutas donde queres saber los permisos pero no exigir uno especifico.
 */
const loadPermissions = async (req, _res, next) => {
  if (req.user && !req.user.permissions) {
    try {
      const { permissions, roleNames } = await getUserPermissions(req.user.id);
      req.user.permissions = permissions;
      req.user.roleNames = roleNames;
    } catch (err) {
      console.error('[Permissions] Error al cargar permisos:', err.message);
    }
  }
  next();
};

module.exports = { requirePermission, loadPermissions, getUserPermissions, invalidatePermissionCache };
