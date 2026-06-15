const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

// ─────────────────────────────────────────
// Usuario ficticio hardcodeado para desarrollo
// En producción esto vendrá de la DB via Prisma
// ─────────────────────────────────────────
const MOCK_USERS = [
  {
    id: '1',
    name: 'Admin BI',
    email: 'admin@tesis.com',
    // Hash de "admin123"
    password: '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',
    role: 'ADMIN',
  },
  {
    id: '2',
    name: 'Analista HR',
    email: 'analista@tesis.com',
    password: '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',
    role: 'ANALYST',
  },
];

const generateToken = (userId) =>
  jwt.sign({ id: userId }, process.env.JWT_SECRET, { expiresIn: '8h' });

/**
 * POST /api/auth/login
 */
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email y contraseña son requeridos' });
    }

    const user = MOCK_USERS.find((u) => u.email === email);
    if (!user) {
      return res.status(401).json({ success: false, message: 'Credenciales inválidas' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Credenciales inválidas' });
    }

    const token = generateToken(user.id);
    const { password: _, ...userWithoutPassword } = user;

    return res.json({
      success: true,
      data: { token, user: userWithoutPassword },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/auth/me
 * Requiere JWT válido (middleware protect)
 */
const me = (req, res) => {
  const { password: _, ...userWithoutPassword } = req.user;
  res.json({ success: true, data: userWithoutPassword });
};

module.exports = { login, me };
