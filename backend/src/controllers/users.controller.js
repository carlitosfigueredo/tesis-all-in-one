// ─────────────────────────────────────────
// Users Controller — Gestion de usuarios de empresa
// COMPANY_ADMIN puede crear/modificar usuarios de su empresa.
// SUPER_ADMIN puede ver todos.
// ─────────────────────────────────────────

const prisma = require('../lib/prisma');
const bcrypt = require('bcryptjs');
const { logAction } = require('../services/audit.service');
const { getIp, getUserAgent } = require('../utils/request.utils');
const { invalidatePermissionCache } = require('../middlewares/permission.middleware');
const { getPasswordPolicy } = require('../services/systemConfig.service');
const { validatePasswordPolicy } = require('../utils/password.utils');

// ─── GET /api/users ───────────────────────────────────────────────────────────

const getUsers = async (req, res, next) => {
  try {
    const where = {};

    if (req.user.roleNames?.includes('SUPER_ADMIN')) {
      if (req.query.companyId) where.companyId = req.query.companyId;
    } else {
      where.companyId = req.user.companyId;
    }

    const users = await prisma.user.findMany({
      where,
      select: {
        id: true,
        name: true,
        email: true,
        active: true,
        createdAt: true,
        updatedAt: true,
        companyId: true,
        company: { select: { name: true } },
        userRoles: {
          include: { role: { select: { name: true } } },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    // Excluir SUPER_ADMIN del listado
    const data = users
      .filter((u) => !u.userRoles.some((ur) => ur.role.name === 'SUPER_ADMIN'))
      .map((u) => ({
        id: u.id,
        name: u.name,
        email: u.email,
        active: u.active,
        createdAt: u.createdAt,
        updatedAt: u.updatedAt,
        companyId: u.companyId,
        companyName: u.company?.name ?? null,
        roles: u.userRoles.map((ur) => ur.role.name),
        role: u.userRoles[0]?.role.name ?? 'VIEWER', // backward compat para el frontend
      }));

    res.json({ success: true, data, total: data.length });
  } catch (error) {
    next(error);
  }
};

// ─── GET /api/users/roles-available ───────────────────────────────────────────

const getAvailableRoles = async (req, res, next) => {
  try {
    // Roles que un COMPANY_ADMIN puede asignar (no puede asignar SUPER_ADMIN)
    const where = { isSystem: true, name: { not: 'SUPER_ADMIN' } };

    const roles = await prisma.role.findMany({
      where,
      select: { id: true, name: true, description: true },
      orderBy: { name: 'asc' },
    });

    res.json({ success: true, data: roles });
  } catch (error) {
    next(error);
  }
};

// ─── POST /api/users ──────────────────────────────────────────────────────────

const createUser = async (req, res, next) => {
  try {
    const { name, email, roleName, password } = req.body;

    // Validaciones
    if (!name || !email || !password) {
      return res.status(400).json({ success: false, message: 'Nombre, correo y contraseña son obligatorios' });
    }

    const policy = await getPasswordPolicy();
    const policyResult = validatePasswordPolicy(password, policy);
    if (!policyResult.valid) {
      return res.status(400).json({
        success: false,
        message: `La contrasena debe tener al menos ${policy.minLength} caracteres`,
        errors: policyResult.errors.map((e) => ({ message: e })),
      });
    }

    // Determinar companyId
    const companyId = req.user.roleNames?.includes('SUPER_ADMIN')
      ? (req.body.companyId || null)
      : req.user.companyId;

    // Validar rol permitido (no puede asignar SUPER_ADMIN)
    const allowedRoleNames = ['COMPANY_ADMIN', 'ANALYST', 'VIEWER'];
    const finalRoleName = allowedRoleNames.includes(roleName) ? roleName : 'VIEWER';

    // Buscar el rol en la BD
    const role = await prisma.role.findFirst({
      where: { name: finalRoleName, companyId: null, isSystem: true },
    });

    if (!role) {
      return res.status(400).json({ success: false, message: 'Rol no válido' });
    }

    // Verificar email unico
    const existing = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
    if (existing) {
      return res.status(409).json({ success: false, message: 'Ya existe un usuario con ese correo' });
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    // Crear usuario + asignar rol en transaccion
    const result = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          name,
          email: email.toLowerCase(),
          password: hashedPassword,
          mustChangePassword: true,
          companyId,
        },
      });

      await tx.userRole.create({
        data: { userId: user.id, roleId: role.id },
      });

      return user;
    });

    await logAction({
      tenantId:   companyId,
      userId:     req.user.id,
      action:     'USER_CREATED',
      resource:   'users',
      resourceId: result.id,
      ipAddress:  getIp(req),
      userAgent:  getUserAgent(req),
      status:     'SUCCESS',
      newValue:   { name: result.name, email: result.email, role: finalRoleName },
    });

    res.status(201).json({
      success: true,
      data: {
        id: result.id,
        name: result.name,
        email: result.email,
        active: result.active,
        createdAt: result.createdAt,
        companyId: result.companyId,
        role: finalRoleName,
        roles: [finalRoleName],
      },
    });
  } catch (error) {
    next(error);
  }
};

// ─── PATCH /api/users/:id/toggle-active ───────────────────────────────────────

const toggleUserActive = async (req, res, next) => {
  try {
    const { id } = req.params;

    const where = { id };
    if (!req.user.roleNames?.includes('SUPER_ADMIN')) {
      where.companyId = req.user.companyId;
    }

    const user = await prisma.user.findFirst({ where });

    if (!user) {
      return res.status(404).json({ success: false, message: 'Usuario no encontrado' });
    }

    if (user.id === req.user.id) {
      return res.status(400).json({ success: false, message: 'No podes desactivar tu propio usuario' });
    }

    const updated = await prisma.user.update({
      where: { id: user.id },
      data: { active: !user.active },
      select: { id: true, name: true, email: true, active: true, createdAt: true },
    });

    await logAction({
      tenantId:   user.companyId,
      userId:     req.user.id,
      action:     updated.active ? 'USER_ACTIVATED' : 'USER_DEACTIVATED',
      resource:   'users',
      resourceId: user.id,
      ipAddress:  getIp(req),
      userAgent:  getUserAgent(req),
      status:     'SUCCESS',
    });

    res.json({ success: true, data: updated });
  } catch (error) {
    next(error);
  }
};

// ─── PUT /api/users/:id ───────────────────────────────────────────────────────

const updateUser = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, roleName } = req.body;

    const where = { id };
    if (!req.user.roleNames?.includes('SUPER_ADMIN')) {
      where.companyId = req.user.companyId;
    }

    const user = await prisma.user.findFirst({
      where,
      include: { userRoles: { include: { role: true } } },
    });
    if (!user) {
      return res.status(404).json({ success: false, message: 'Usuario no encontrado' });
    }

    // Actualizar nombre si se provee
    const data = {};
    if (name) data.name = name;

    if (Object.keys(data).length > 0) {
      await prisma.user.update({ where: { id: user.id }, data });
    }

    // Actualizar rol si se provee
    if (roleName) {
      const allowedRoleNames = ['COMPANY_ADMIN', 'ANALYST', 'VIEWER'];
      if (allowedRoleNames.includes(roleName)) {
        const newRole = await prisma.role.findFirst({
          where: { name: roleName, companyId: null, isSystem: true },
        });

        if (newRole) {
          // Quitar roles actuales del sistema y asignar el nuevo
          const systemRoleIds = await prisma.role.findMany({
            where: { isSystem: true, companyId: null },
            select: { id: true },
          });

          await prisma.userRole.deleteMany({
            where: {
              userId: user.id,
              roleId: { in: systemRoleIds.map((r) => r.id) },
            },
          });

          await prisma.userRole.create({
            data: { userId: user.id, roleId: newRole.id },
          });

          // Invalidar cache de permisos
          invalidatePermissionCache(user.id);
        }
      }
    }

    // Obtener usuario actualizado
    const updated = await prisma.user.findUnique({
      where: { id: user.id },
      select: {
        id: true,
        name: true,
        email: true,
        active: true,
        createdAt: true,
        userRoles: { include: { role: { select: { name: true } } } },
      },
    });

    const oldRoleName = user.userRoles[0]?.role?.name ?? 'VIEWER';
    const newRoleName = updated.userRoles[0]?.role?.name ?? 'VIEWER';

    await logAction({
      tenantId:   user.companyId,
      userId:     req.user.id,
      action:     'USER_UPDATED',
      resource:   'users',
      resourceId: user.id,
      ipAddress:  getIp(req),
      userAgent:  getUserAgent(req),
      status:     'SUCCESS',
      oldValue:   { name: user.name, role: oldRoleName },
      newValue:   { name: updated.name, role: newRoleName },
    });

    res.json({
      success: true,
      data: {
        id: updated.id,
        name: updated.name,
        email: updated.email,
        active: updated.active,
        createdAt: updated.createdAt,
        role: newRoleName,
        roles: updated.userRoles.map((ur) => ur.role.name),
      },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { getUsers, createUser, toggleUserActive, updateUser, getAvailableRoles };
