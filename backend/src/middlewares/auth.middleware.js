const jwt = require('jsonwebtoken');
const prisma = require('../lib/prisma');
const { getUserPermissions } = require('./permission.middleware');

// ─────────────────────────────────────────
// protect — valida JWT, busca usuario en BD y carga permisos
// ─────────────────────────────────────────
const protect = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, message: 'No autorizado. Token requerido' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      select: {
        id: true,
        name: true,
        email: true,
        active: true,
        companyId: true,
        company: { select: { name: true, status: true, plan: true } },
      },
    });

    if (!user || !user.active) {
      return res.status(401).json({ success: false, message: 'Token invalido o usuario desactivado' });
    }

    // Cargar permisos y roles
    const result = await getUserPermissions(user.id);
    const permissions = result?.permissions ?? [];
    const roleNames = result?.roleNames ?? [];

    // Adjuntar usuario al request
    req.user = {
      id: user.id,
      name: user.name,
      email: user.email,
      companyId: user.companyId,
      companyName: user.company?.name ?? null,
      companyStatus: user.company?.status ?? null,
      companyPlan: user.company?.plan ?? null,
      portal: decoded.portal,
      permissions,
      roleNames,
    };

    next();
  } catch {
    return res.status(401).json({ success: false, message: 'Token expirado o invalido' });
  }
};

// ─────────────────────────────────────────
// requireRole — autorizacion por nombre de rol (backward compat)
// Uso: requireRole('SUPER_ADMIN')
//      requireRole('COMPANY_ADMIN', 'ANALYST')
// ─────────────────────────────────────────
const requireRole = (...roles) => (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ success: false, message: 'No autorizado' });
  }
  const hasRole = roles.some((r) => req.user.roleNames?.includes(r));
  if (!hasRole) {
    return res.status(403).json({ success: false, message: 'Acceso denegado: permisos insuficientes' });
  }
  next();
};

// ─────────────────────────────────────────
// requirePortal — asegura que el token pertenece al portal correcto
// ─────────────────────────────────────────
const requirePortal = (portal) => (req, res, next) => {
  if (req.user?.portal !== portal) {
    return res.status(403).json({
      success: false,
      message: `Este endpoint requiere acceso por el portal "${portal}"`,
    });
  }
  next();
};

// Alias de compatibilidad
const authorize = requireRole;

module.exports = { protect, requireRole, requirePortal, authorize };
