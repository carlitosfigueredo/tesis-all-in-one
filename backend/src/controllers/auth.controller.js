const jwt    = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

const { validatePasswordPolicy }                              = require('../utils/password.utils');
const { sendPasswordResetEmail, sendPasswordChangedEmail,
        sendAccountLockedEmail }                             = require('../services/email.service');
const { logAction }                                          = require('../services/audit.service');
const { getIp, getUserAgent }                               = require('../utils/request.utils');

// ─────────────────────────────────────────
// Mock users — desarrollo (sin DB real aún)
// Contraseña de todos: "admin123"
// ─────────────────────────────────────────

const PLAIN_PASSWORD = 'admin123';

const checkPassword = async (plain, _hash) => {
  if (process.env.NODE_ENV !== 'production') return plain === PLAIN_PASSWORD;
  return bcrypt.compare(plain, _hash);
};

const COMPANY_USERS = [
  { id: 'cu-1', name: 'Ana García',   email: 'admin@empresa.com',    password: 'MOCK', role: 'COMPANY_ADMIN', companyId: 'comp-1', companyName: 'Devsoft S.A.' },
  { id: 'cu-2', name: 'Carlos López', email: 'analista@empresa.com', password: 'MOCK', role: 'ANALYST',       companyId: 'comp-1', companyName: 'Devsoft S.A.' },
  { id: 'cu-3', name: 'María Torres', email: 'viewer@empresa.com',   password: 'MOCK', role: 'VIEWER',        companyId: 'comp-1', companyName: 'Devsoft S.A.' },
];

const SUPER_ADMIN_USERS = [
  { id: 'sa-1', name: 'Super Admin', email: 'superadmin@sistemabi.edu.py', password: 'MOCK', role: 'SUPER_ADMIN', companyId: null, companyName: null },
];

const ALL_USERS = [...COMPANY_USERS, ...SUPER_ADMIN_USERS];

// Store en memoria para tokens de reset (reemplazar por Prisma cuando haya BD)
const resetTokenStore = new Map(); // tokenHash -> { userId, expiresAt, usedAt }

// ─── Helpers ─────────────────────────────────────────────────────────────────

const generateToken = (user) =>
  jwt.sign(
    { id: user.id, role: user.role, companyId: user.companyId ?? null,
      portal: user.role === 'SUPER_ADMIN' ? 'admin' : 'company' },
    process.env.JWT_SECRET,
    { expiresIn: '8h' }
  );

const sanitize = ({ password, ...rest }) => rest;

const hashToken = (token) =>
  crypto.createHash('sha256').update(token).digest('hex');

// ─── Controllers ─────────────────────────────────────────────────────────────

/**
 * POST /api/auth/login — portal de empresas
 */
const login = async (req, res, next) => {
  const ip = getIp(req);
  const ua = getUserAgent(req);
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'El correo y la contraseña son obligatorios' });
    }

    const user = COMPANY_USERS.find((u) => u.email === email.toLowerCase());

    if (!user) {
      await logAction({ action: 'LOGIN_FAILED', resource: 'users', ipAddress: ip, userAgent: ua,
        status: 'FAILURE', errorMsg: `Email no encontrado: ${email}` });
      return res.status(401).json({ success: false, message: 'El correo o la contraseña no son correctos' });
    }

    const isMatch = await checkPassword(password, user.password);
    if (!isMatch) {
      await logAction({ userId: user.id, tenantId: user.companyId, action: 'LOGIN_FAILED',
        resource: 'users', resourceId: user.id, ipAddress: ip, userAgent: ua,
        status: 'FAILURE', errorMsg: 'Contraseña incorrecta' });
      return res.status(401).json({ success: false, message: 'El correo o la contraseña no son correctos' });
    }

    const token = generateToken(user);

    await logAction({ userId: user.id, tenantId: user.companyId, action: 'LOGIN_SUCCESS',
      resource: 'users', resourceId: user.id, ipAddress: ip, userAgent: ua, status: 'SUCCESS' });

    return res.json({ success: true, data: { token, user: sanitize(user) } });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/admin/auth/login — portal super admin
 */
const adminLogin = async (req, res, next) => {
  const ip = getIp(req);
  const ua = getUserAgent(req);
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'El correo y la contraseña son obligatorios' });
    }

    const user = SUPER_ADMIN_USERS.find((u) => u.email === email.toLowerCase());
    if (!user) {
      await logAction({ action: 'LOGIN_FAILED', resource: 'users', ipAddress: ip, userAgent: ua,
        status: 'FAILURE', errorMsg: `Admin login fallido para: ${email}` });
      return res.status(401).json({ success: false, message: 'Credenciales incorrectas' });
    }

    const isMatch = await checkPassword(password, user.password);
    if (!isMatch) {
      await logAction({ userId: user.id, action: 'LOGIN_FAILED', resource: 'users',
        resourceId: user.id, ipAddress: ip, userAgent: ua, status: 'FAILURE' });
      return res.status(401).json({ success: false, message: 'Credenciales incorrectas' });
    }

    const token = generateToken(user);

    await logAction({ userId: user.id, action: 'LOGIN_SUCCESS', resource: 'users',
      resourceId: user.id, ipAddress: ip, userAgent: ua, status: 'SUCCESS' });

    return res.json({ success: true, data: { token, user: sanitize(user) } });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/auth/me | GET /api/admin/auth/me
 */
const me = (req, res) => {
  res.json({ success: true, data: sanitize(req.user) });
};

/**
 * POST /api/auth/forgot-password
 * Genera token de reset con TTL 5 minutos y envía correo.
 * Responde igual tanto si el email existe como si no (no revelar información).
 */
const forgotPassword = async (req, res, next) => {
  const ip = getIp(req);
  const ua = getUserAgent(req);
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ success: false, message: 'El correo es obligatorio' });
    }

    // Siempre responder con el mismo mensaje para no revelar si el email existe
    const GENERIC_MSG = 'Si el correo está registrado, vas a recibir un enlace en breve';

    const user = ALL_USERS.find((u) => u.email === email.toLowerCase());

    if (!user) {
      // Loguear intento para email inexistente pero no revelar al cliente
      await logAction({ action: 'PASSWORD_RESET_REQUESTED', resource: 'users',
        ipAddress: ip, userAgent: ua, status: 'WARNING',
        errorMsg: `Email no encontrado: ${email}` });
      return res.json({ success: true, message: GENERIC_MSG });
    }

    // Generar token plano (UUID) — se guarda el hash SHA-256 en el store
    const plainToken = crypto.randomUUID();
    const tokenHash  = hashToken(plainToken);
    const expiresAt  = new Date(Date.now() + 5 * 60 * 1000); // 5 minutos

    // Guardar en store (reemplazar con Prisma.passwordReset.create en producción)
    resetTokenStore.set(tokenHash, { userId: user.id, expiresAt, usedAt: null });

    const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/reset-password?token=${plainToken}`;

    // Enviar correo — falla silenciosamente si SMTP no está disponible
    await sendPasswordResetEmail({ to: user.email, name: user.name, resetUrl });

    await logAction({ userId: user.id, tenantId: user.companyId ?? null,
      action: 'PASSWORD_RESET_REQUESTED', resource: 'users', resourceId: user.id,
      ipAddress: ip, userAgent: ua, status: 'SUCCESS' });

    return res.json({ success: true, message: GENERIC_MSG });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/auth/reset-password
 * Valida token, política de contraseña y actualiza la contraseña.
 */
const resetPassword = async (req, res, next) => {
  const ip = getIp(req);
  const ua = getUserAgent(req);
  try {
    const { token, newPassword, confirmPassword } = req.body;

    // Validaciones básicas
    if (!token || !newPassword || !confirmPassword) {
      return res.status(400).json({ success: false, message: 'Todos los campos son obligatorios' });
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json({ success: false, message: 'Las contraseñas no coinciden' });
    }

    // Buscar token en store por hash
    const tokenHash  = hashToken(token);
    const resetEntry = resetTokenStore.get(tokenHash);

    if (!resetEntry) {
      await logAction({ action: 'PASSWORD_RESET_FAILED', resource: 'users',
        ipAddress: ip, userAgent: ua, status: 'FAILURE', errorMsg: 'Token no encontrado' });
      return res.status(400).json({ success: false, message: 'El enlace no es válido o ya fue usado' });
    }

    // Verificar que no esté expirado
    if (new Date() > new Date(resetEntry.expiresAt)) {
      resetTokenStore.delete(tokenHash);
      await logAction({ userId: resetEntry.userId, action: 'PASSWORD_RESET_FAILED',
        resource: 'users', resourceId: resetEntry.userId,
        ipAddress: ip, userAgent: ua, status: 'FAILURE', errorMsg: 'Token expirado' });
      return res.status(400).json({ success: false, message: 'El enlace venció. Solicitá uno nuevo' });
    }

    // Verificar que no haya sido usado
    if (resetEntry.usedAt) {
      await logAction({ userId: resetEntry.userId, action: 'PASSWORD_RESET_FAILED',
        resource: 'users', resourceId: resetEntry.userId,
        ipAddress: ip, userAgent: ua, status: 'FAILURE', errorMsg: 'Token ya utilizado' });
      return res.status(400).json({ success: false, message: 'El enlace no es válido o ya fue usado' });
    }

    const user = ALL_USERS.find((u) => u.id === resetEntry.userId);
    if (!user) {
      return res.status(400).json({ success: false, message: 'El enlace no es válido o ya fue usado' });
    }

    // Validar política de contraseña
    const policyResult = validatePasswordPolicy(newPassword, user);
    if (!policyResult.valid) {
      return res.status(400).json({
        success: false,
        message: 'La contraseña no cumple con los requisitos de seguridad',
        errors: policyResult.errors,
      });
    }

    // En dev: solo marcamos el token como usado (no hasheamos ni cambiamos el mock)
    // En prod: bcrypt.hash(newPassword, 12) + prisma.user.update
    resetEntry.usedAt = new Date();
    resetTokenStore.set(tokenHash, resetEntry);

    // Enviar correo de confirmación
    await sendPasswordChangedEmail({ to: user.email, name: user.name, ip, timestamp: new Date().toISOString() });

    await logAction({ userId: user.id, tenantId: user.companyId ?? null,
      action: 'PASSWORD_RESET_COMPLETED', resource: 'users', resourceId: user.id,
      ipAddress: ip, userAgent: ua, status: 'SUCCESS' });

    return res.json({ success: true, message: 'Tu contraseña fue cambiada correctamente. Ya podés iniciar sesión' });
  } catch (error) {
    next(error);
  }
};

module.exports = { login, adminLogin, me, forgotPassword, resetPassword };
