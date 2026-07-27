const jwt = require('jsonwebtoken');

// Mock users — sincronizados con auth.controller.js
// Contraseña de todos: "admin123"
const ALL_USERS = [
  { id: 'sa-1', name: 'Super Admin',   email: 'superadmin@sistemabi.edu.py', role: 'SUPER_ADMIN',   companyId: null },
  { id: 'cu-1', name: 'Ana García',    email: 'admin@empresa.com',           role: 'COMPANY_ADMIN', companyId: 'comp-1' },
  { id: 'cu-2', name: 'Carlos López',  email: 'analista@empresa.com',        role: 'ANALYST',       companyId: 'comp-1' },
  { id: 'cu-3', name: 'María Torres',  email: 'viewer@empresa.com',          role: 'VIEWER',        companyId: 'comp-1' },
];

// ─────────────────────────────────────────
// protect — valida JWT y adjunta req.user
// ─────────────────────────────────────────
const protect = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, message: 'No autorizado. Token requerido' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = ALL_USERS.find((u) => u.id === decoded.id);

    if (!user) {
      return res.status(401).json({ success: false, message: 'Token inválido' });
    }

    // Adjuntar claims completos del token al request
    req.user = {
      ...user,
      portal:    decoded.portal,
      companyId: decoded.companyId,
    };

    next();
  } catch {
    return res.status(401).json({ success: false, message: 'Token expirado o inválido' });
  }
};

// ─────────────────────────────────────────
// requireRole — autorización por rol
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

// Alias de compatibilidad con código anterior
const authorize = requireRole;

module.exports = { protect, requireRole, requirePortal, authorize };
