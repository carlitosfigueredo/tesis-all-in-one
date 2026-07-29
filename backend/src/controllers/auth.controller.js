const jwt    = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

const prisma = require('../lib/prisma');
const { validatePasswordPolicy }            = require('../utils/password.utils');
const { sendPasswordResetEmail,
        sendPasswordChangedEmail,
        sendAccountLockedEmail }            = require('../services/email.service');
const { logAction }                         = require('../services/audit.service');
const { getIp, getUserAgent }              = require('../utils/request.utils');
const { getUserPermissions, invalidatePermissionCache } = require('../middlewares/permission.middleware');

// ─── Constantes ──────────────────────────────────────────────────────────────

const MAX_FAILED_ATTEMPTS = 5;
const LOCK_DURATION_MS    = 15 * 60 * 1000; // 15 minutos
const RESET_TOKEN_TTL_MS  = 5 * 60 * 1000;  // 5 minutos

// ─── Helpers ─────────────────────────────────────────────────────────────────

const generateToken = (user, roleNames = []) =>
  jwt.sign(
    {
      id: user.id,
      roles: roleNames,
      companyId: user.companyId ?? null,
      portal: roleNames.includes('SUPER_ADMIN') ? 'admin' : 'company',
    },
    process.env.JWT_SECRET,
    { expiresIn: '8h' }
  );

const sanitize = (user) => {
  const { password, failedAttempts, lockedUntil, ...rest } = user;
  return rest;
};

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
      return res.status(400).json({ success: false, message: 'El correo y la contrasena son obligatorios' });
    }

    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
      include: { company: true },
    });

    if (!user) {
      await logAction({ action: 'LOGIN_FAILED', resource: 'users', ipAddress: ip, userAgent: ua,
        status: 'FAILURE', errorMsg: `Email no encontrado: ${email}` });
      return res.status(401).json({ success: false, message: 'El correo o la contrasena no son correctos' });
    }

    // Cargar roles/permisos del usuario
    const { permissions, roleNames } = await getUserPermissions(user.id);

    // SUPER_ADMIN no puede loguear por el portal de empresas
    if (roleNames.includes('SUPER_ADMIN')) {
      return res.status(401).json({ success: false, message: 'El correo o la contrasena no son correctos' });
    }

    if (!user.active) {
      return res.status(401).json({ success: false, message: 'Tu cuenta esta desactivada. Contacta al administrador' });
    }

    // Verificar bloqueo por intentos fallidos
    if (user.lockedUntil && new Date() < new Date(user.lockedUntil)) {
      return res.status(423).json({ success: false, message: 'Cuenta bloqueada temporalmente. Intenta mas tarde' });
    }

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      const attempts = user.failedAttempts + 1;
      const updateData = { failedAttempts: attempts };

      if (attempts >= MAX_FAILED_ATTEMPTS) {
        updateData.lockedUntil = new Date(Date.now() + LOCK_DURATION_MS);
        await sendAccountLockedEmail({ to: user.email, name: user.name });
      }

      await prisma.user.update({ where: { id: user.id }, data: updateData });

      await logAction({ userId: user.id, tenantId: user.companyId, action: 'LOGIN_FAILED',
        resource: 'users', resourceId: user.id, ipAddress: ip, userAgent: ua,
        status: 'FAILURE', errorMsg: `Contrasena incorrecta (intento ${attempts})` });

      return res.status(401).json({ success: false, message: 'El correo o la contrasena no son correctos' });
    }

    // Login exitoso: resetear intentos fallidos
    if (user.failedAttempts > 0 || user.lockedUntil) {
      await prisma.user.update({
        where: { id: user.id },
        data: { failedAttempts: 0, lockedUntil: null },
      });
    }

    const token = generateToken(user, roleNames);

    await logAction({ userId: user.id, tenantId: user.companyId, action: 'LOGIN_SUCCESS',
      resource: 'users', resourceId: user.id, ipAddress: ip, userAgent: ua, status: 'SUCCESS' });

    const userData = {
      ...sanitize(user),
      companyName: user.company?.name ?? null,
      companyStatus: user.company?.status ?? null,
      roles: roleNames,
      permissions,
    };

    return res.json({ success: true, data: { token, user: userData } });
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
      return res.status(400).json({ success: false, message: 'El correo y la contrasena son obligatorios' });
    }

    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (!user) {
      await logAction({ action: 'LOGIN_FAILED', resource: 'users', ipAddress: ip, userAgent: ua,
        status: 'FAILURE', errorMsg: `Admin login fallido para: ${email}` });
      return res.status(401).json({ success: false, message: 'Credenciales incorrectas' });
    }

    // Verificar que tenga rol SUPER_ADMIN
    const { roleNames } = await getUserPermissions(user.id);
    if (!roleNames.includes('SUPER_ADMIN')) {
      await logAction({ action: 'LOGIN_FAILED', resource: 'users', ipAddress: ip, userAgent: ua,
        status: 'FAILURE', errorMsg: `Admin login: usuario sin rol SUPER_ADMIN: ${email}` });
      return res.status(401).json({ success: false, message: 'Credenciales incorrectas' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      await logAction({ userId: user.id, action: 'LOGIN_FAILED', resource: 'users',
        resourceId: user.id, ipAddress: ip, userAgent: ua, status: 'FAILURE' });
      return res.status(401).json({ success: false, message: 'Credenciales incorrectas' });
    }

    const token = generateToken(user, roleNames);

    await logAction({ userId: user.id, action: 'LOGIN_SUCCESS', resource: 'users',
      resourceId: user.id, ipAddress: ip, userAgent: ua, status: 'SUCCESS' });

    return res.json({ success: true, data: { token, user: { ...sanitize(user), roles: roleNames } } });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/auth/me | GET /api/admin/auth/me
 */
const me = async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      include: { company: true },
    });

    if (!user) {
      return res.status(404).json({ success: false, message: 'Usuario no encontrado' });
    }

    const userData = {
      ...sanitize(user),
      companyName: user.company?.name ?? null,
      companyStatus: user.company?.status ?? null,
      roles: req.user.roleNames,
      permissions: req.user.permissions,
    };

    res.json({ success: true, data: userData });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/auth/forgot-password
 */
const forgotPassword = async (req, res, next) => {
  const ip = getIp(req);
  const ua = getUserAgent(req);
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ success: false, message: 'El correo es obligatorio' });
    }

    const GENERIC_MSG = 'Si el correo esta registrado, vas a recibir un enlace en breve';

    const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });

    if (!user) {
      await logAction({ action: 'PASSWORD_RESET_REQUESTED', resource: 'users',
        ipAddress: ip, userAgent: ua, status: 'WARNING',
        errorMsg: `Email no encontrado: ${email}` });
      return res.json({ success: true, message: GENERIC_MSG });
    }

    const plainToken = crypto.randomUUID();
    const tokenHash  = hashToken(plainToken);
    const expiresAt  = new Date(Date.now() + RESET_TOKEN_TTL_MS);

    await prisma.passwordResetToken.create({
      data: { tokenHash, expiresAt, userId: user.id },
    });

    const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/reset-password?token=${plainToken}`;

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
 */
const resetPassword = async (req, res, next) => {
  const ip = getIp(req);
  const ua = getUserAgent(req);
  try {
    const { token, newPassword, confirmPassword } = req.body;

    if (!token || !newPassword || !confirmPassword) {
      return res.status(400).json({ success: false, message: 'Todos los campos son obligatorios' });
    }
    if (newPassword !== confirmPassword) {
      return res.status(400).json({ success: false, message: 'Las contrasenas no coinciden' });
    }

    const tokenHash = hashToken(token);
    const resetEntry = await prisma.passwordResetToken.findUnique({
      where: { tokenHash },
      include: { user: true },
    });

    if (!resetEntry) {
      await logAction({ action: 'PASSWORD_RESET_FAILED', resource: 'users',
        ipAddress: ip, userAgent: ua, status: 'FAILURE', errorMsg: 'Token no encontrado' });
      return res.status(400).json({ success: false, message: 'El enlace no es valido o ya fue usado' });
    }

    if (new Date() > new Date(resetEntry.expiresAt)) {
      await prisma.passwordResetToken.delete({ where: { id: resetEntry.id } });
      return res.status(400).json({ success: false, message: 'El enlace vencio. Solicita uno nuevo' });
    }

    if (resetEntry.usedAt) {
      return res.status(400).json({ success: false, message: 'El enlace no es valido o ya fue usado' });
    }

    const user = resetEntry.user;
    const policyResult = validatePasswordPolicy(newPassword, user);
    if (!policyResult.valid) {
      return res.status(400).json({
        success: false,
        message: 'La contrasena no cumple con los requisitos de seguridad',
        errors: policyResult.errors,
      });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 12);

    await prisma.$transaction([
      prisma.user.update({
        where: { id: user.id },
        data: { password: hashedPassword, failedAttempts: 0, lockedUntil: null },
      }),
      prisma.passwordResetToken.update({
        where: { id: resetEntry.id },
        data: { usedAt: new Date() },
      }),
    ]);

    await sendPasswordChangedEmail({ to: user.email, name: user.name, ip, timestamp: new Date().toISOString() });

    await logAction({ userId: user.id, tenantId: user.companyId ?? null,
      action: 'PASSWORD_RESET_COMPLETED', resource: 'users', resourceId: user.id,
      ipAddress: ip, userAgent: ua, status: 'SUCCESS' });

    return res.json({ success: true, message: 'Tu contrasena fue cambiada correctamente. Ya podes iniciar sesion' });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/auth/change-password
 */
const changePassword = async (req, res, next) => {
  const ip = getIp(req);
  const ua = getUserAgent(req);
  try {
    const { currentPassword, newPassword, confirmPassword } = req.body;

    if (!currentPassword || !newPassword || !confirmPassword) {
      return res.status(400).json({ success: false, message: 'Todos los campos son obligatorios' });
    }
    if (newPassword !== confirmPassword) {
      return res.status(400).json({ success: false, message: 'Las contrasenas nuevas no coinciden' });
    }

    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    if (!user) {
      return res.status(401).json({ success: false, message: 'Usuario no encontrado' });
    }

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'La contrasena actual no es correcta' });
    }

    const policyResult = validatePasswordPolicy(newPassword, user);
    if (!policyResult.valid) {
      return res.status(400).json({
        success: false,
        message: 'La contrasena no cumple los requisitos de seguridad',
        errors: policyResult.errors.map((e) => ({ message: e })),
      });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 12);
    await prisma.user.update({ where: { id: user.id }, data: { password: hashedPassword } });

    await sendPasswordChangedEmail({ to: user.email, name: user.name, ip, timestamp: new Date().toISOString() });
    await logAction({ userId: user.id, tenantId: user.companyId ?? null,
      action: 'PASSWORD_CHANGED', resource: 'users', resourceId: user.id,
      ipAddress: ip, userAgent: ua, status: 'SUCCESS' });

    return res.json({ success: true, message: 'Contrasena cambiada correctamente' });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/auth/register
 * Registro publico: crea empresa + usuario + asigna rol COMPANY_ADMIN.
 */
const register = async (req, res, next) => {
  const ip = getIp(req);
  const ua = getUserAgent(req);
  try {
    const { companyName, plan, name, email, password } = req.body;

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return res.status(409).json({ success: false, message: 'Ya existe una cuenta con ese correo' });
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    // Buscar rol COMPANY_ADMIN del sistema
    const companyAdminRole = await prisma.role.findFirst({
      where: { name: 'COMPANY_ADMIN', companyId: null, isSystem: true },
    });

    const result = await prisma.$transaction(async (tx) => {
      const company = await tx.company.create({
        data: {
          name: companyName,
          plan: plan || 'BASICO',
          status: 'PENDING_PAYMENT',
          active: true,
        },
      });

      const user = await tx.user.create({
        data: {
          name,
          email,
          password: hashedPassword,
          companyId: company.id,
        },
      });

      // Asignar rol COMPANY_ADMIN
      if (companyAdminRole) {
        await tx.userRole.create({
          data: { userId: user.id, roleId: companyAdminRole.id },
        });
      }

      return { company, user };
    });

    await logAction({
      tenantId: result.company.id,
      userId: result.user.id,
      action: 'COMPANY_REGISTERED',
      resource: 'companies',
      resourceId: result.company.id,
      ipAddress: ip,
      userAgent: ua,
      status: 'SUCCESS',
      newValue: { companyName: result.company.name, plan: result.company.plan },
    });

    // Cargar permisos del nuevo usuario
    const { permissions, roleNames } = await getUserPermissions(result.user.id);
    const token = generateToken(result.user, roleNames);

    const userData = {
      id: result.user.id,
      name: result.user.name,
      email: result.user.email,
      companyId: result.company.id,
      companyName: result.company.name,
      companyStatus: result.company.status,
      roles: roleNames,
      permissions,
    };

    return res.status(201).json({
      success: true,
      message: 'Empresa registrada correctamente. Activa tu plan para acceder a todas las funcionalidades',
      data: { token, user: userData },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { login, adminLogin, me, forgotPassword, resetPassword, changePassword, register };
