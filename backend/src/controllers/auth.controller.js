const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

// ─────────────────────────────────────────
// Mock users — desarrollo (sin DB real aún)
// Contraseña de todos: "admin123"
// Para regenerar: node -e "require('bcryptjs').hash('admin123',10).then(console.log)"
// ─────────────────────────────────────────

// En desarrollo, comparamos en texto plano para evitar problemas de hash.
// En producción esto DEBE ser bcrypt.compare real.
const PLAIN_PASSWORD = 'admin123';

// Reemplaza bcrypt.compare con comparación simple en modo desarrollo
const checkPassword = async (plain, _hash) => {
  if (process.env.NODE_ENV !== 'production') {
    return plain === PLAIN_PASSWORD;
  }
  return bcrypt.compare(plain, _hash);
};

const HASH = 'NO_HASH_NEEDED_IN_DEV';

/** Usuarios del portal de empresas (NO pueden ser SUPER_ADMIN) */
const COMPANY_USERS = [
  {
    id: 'cu-1',
    name: 'Ana García',
    email: 'admin@empresa.com',
    password: HASH,
    role: 'COMPANY_ADMIN',
    companyId: 'comp-1',
    companyName: 'Devsoft S.A.',
  },
  {
    id: 'cu-2',
    name: 'Carlos López',
    email: 'analista@empresa.com',
    password: HASH,
    role: 'ANALYST',
    companyId: 'comp-1',
    companyName: 'Devsoft S.A.',
  },
  {
    id: 'cu-3',
    name: 'María Torres',
    email: 'viewer@empresa.com',
    password: HASH,
    role: 'VIEWER',
    companyId: 'comp-1',
    companyName: 'Devsoft S.A.',
  },
];

/** Usuarios del portal super admin (solo SUPER_ADMIN) */
const SUPER_ADMIN_USERS = [
  {
    id: 'sa-1',
    name: 'Super Admin',
    email: 'superadmin@sistemabi.edu.py',
    password: HASH,
    role: 'SUPER_ADMIN',
    companyId: null,
    companyName: null,
  },
];

// ─────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────

const generateToken = (user) =>
  jwt.sign(
    {
      id:        user.id,
      role:      user.role,
      companyId: user.companyId ?? null,
      portal:    user.role === 'SUPER_ADMIN' ? 'admin' : 'company',
    },
    process.env.JWT_SECRET,
    { expiresIn: '8h' }
  );

const sanitize = ({ password, ...rest }) => rest;

// ─────────────────────────────────────────
// Controllers
// ─────────────────────────────────────────

/**
 * POST /api/auth/login
 * Portal de empresas — rechaza SUPER_ADMIN
 */
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'El correo y la contraseña son obligatorios' });
    }

    const user = COMPANY_USERS.find((u) => u.email === email);
    if (!user) {
      return res.status(401).json({ success: false, message: 'Credenciales incorrectas' });
    }

    const isMatch = await checkPassword(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Credenciales incorrectas' });
    }

    const token = generateToken(user);
    return res.json({ success: true, data: { token, user: sanitize(user) } });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/admin/auth/login
 * Portal super admin — solo acepta SUPER_ADMIN
 */
const adminLogin = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'El correo y la contraseña son obligatorios' });
    }

    const user = SUPER_ADMIN_USERS.find((u) => u.email === email);
    if (!user) {
      return res.status(401).json({ success: false, message: 'Credenciales incorrectas' });
    }

    const isMatch = await checkPassword(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Credenciales incorrectas' });
    }

    const token = generateToken(user);
    return res.json({ success: true, data: { token, user: sanitize(user) } });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/auth/me  |  GET /api/admin/auth/me
 * Retorna el usuario del token activo
 */
const me = (req, res) => {
  res.json({ success: true, data: sanitize(req.user) });
};

module.exports = { login, adminLogin, me };
