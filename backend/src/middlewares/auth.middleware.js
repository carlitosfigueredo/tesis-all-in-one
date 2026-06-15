const jwt = require('jsonwebtoken');

// Usuario mock (mismo que en auth.controller.js)
// En producción esto consultaría la DB
const MOCK_USERS = [
  { id: '1', name: 'Admin BI', email: 'admin@tesis.com', role: 'ADMIN' },
  { id: '2', name: 'Analista HR', email: 'analista@tesis.com', role: 'ANALYST' },
];

/**
 * Middleware que valida el JWT en el header Authorization.
 * Adjunta el usuario decodificado a req.user
 */
const protect = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, message: 'No autorizado, token requerido' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = MOCK_USERS.find((u) => u.id === decoded.id);

    if (!user) {
      return res.status(401).json({ success: false, message: 'Token inválido' });
    }

    req.user = user;
    next();
  } catch {
    return res.status(401).json({ success: false, message: 'Token expirado o inválido' });
  }
};

/**
 * Middleware de autorización por rol
 * Uso: authorize('ADMIN')
 */
const authorize = (...roles) => (req, res, next) => {
  if (!roles.includes(req.user?.role)) {
    return res.status(403).json({ success: false, message: 'Acceso denegado: permisos insuficientes' });
  }
  next();
};

module.exports = { protect, authorize };
