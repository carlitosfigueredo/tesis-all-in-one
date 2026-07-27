const jwt = require('jsonwebtoken');
const prisma = require('../lib/prisma');

// ─────────────────────────────────────────
// protect — valida JWT y adjunta req.user desde la BD
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
        role: true,
        active: true,
        companyId: true,
        company: { select: { name: true } },
      },
    });

    if (!user || !user.active) {
      return res.status(401).json({ success: false, message: 'Token invalido o usuario desactivado' });
    }

    // Adjuntar usuario al request
    req.user = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      companyId: user.companyId,
      companyName: user.company?.name ?? null,
      portal: decoded.portal,
    };

    next();
  } catch {
    return res.status(401).json({ success: false, message: 'Token expirado o invalido' });
  }
};

// ─────────────────────────────────────────
// requireRole — autorizacion por rol
// Uso: requireRole('SUPER_ADMIN')
//      requireRole('COMPANY_ADMIN', 'ANALYST')
// ─────────────────────────────────────────
const requireRole = (...roles) => (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ success: false, message: 'No autorizado' });
  }
  if (!roles.includes(req.user.role)) {
    return res.status(403).json({ success: false, message: 'Acceso denegado: permisos insuficientes' });
  }
  next();
};

// ─────────────────────────────────────────
// requirePortal — asegura que el token
// pertenece al portal correcto
// Uso: requirePortal('admin') | requirePortal('company')
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
