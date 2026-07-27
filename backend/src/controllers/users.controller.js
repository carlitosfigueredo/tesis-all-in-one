// ─────────────────────────────────────────
// Users Controller — Gestion de usuarios de empresa
// Solo COMPANY_ADMIN puede crear/modificar usuarios de su empresa.
// SUPER_ADMIN puede ver todos.
// ─────────────────────────────────────────

const prisma = require('../lib/prisma');
const bcrypt = require('bcryptjs');
const { logAction } = require('../services/audit.service');
const { getIp, getUserAgent } = require('../utils/request.utils');

// ─── GET /api/users ───────────────────────────────────────────────────────────

const getUsers = async (req, res, next) => {
  try {
    const where = {};

    // SUPER_ADMIN ve todos (puede filtrar por companyId), los demas solo su empresa
    if (req.user.role === 'SUPER_ADMIN') {
      if (req.query.companyId) where.companyId = req.query.companyId;
      // Excluir super admins del listado
      where.role = { not: 'SUPER_ADMIN' };
    } else {
      where.companyId = req.user.companyId;
    }

    const users = await prisma.user.findMany({
      where,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        active: true,
        createdAt: true,
        updatedAt: true,
        companyId: true,
        company: { select: { name: true } },
      },
      orderBy: { createdAt: 'asc' },
    });

    const data = users.map((u) => ({
      ...u,
      companyName: u.company?.name ?? null,
      company: undefined,
    }));

    res.json({ success: true, data, total: data.length });
  } catch (error) {
    next(error);
  }
};

// ─── POST /api/users ──────────────────────────────────────────────────────────

const createUser = async (req, res, next) => {
  try {
    const { name, email, role, password } = req.body;

    // Validaciones
    if (!name || !email || !password) {
      return res.status(400).json({ success: false, message: 'Nombre, correo y contrasena son obligatorios' });
    }

    if (password.length < 8) {
      return res.status(400).json({ success: false, message: 'La contrasena debe tener al menos 8 caracteres' });
    }

    // Validar rol permitido
    const allowedRoles = ['COMPANY_ADMIN', 'ANALYST', 'VIEWER'];
    const finalRole = allowedRoles.includes(role) ? role : 'VIEWER';

    // Determinar companyId
    const companyId = req.user.role === 'SUPER_ADMIN'
      ? (req.body.companyId || null)
      : req.user.companyId;

    // Verificar email unico
    const existing = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
    if (existing) {
      return res.status(409).json({ success: false, message: 'Ya existe un usuario con ese correo' });
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const user = await prisma.user.create({
      data: {
        name,
        email: email.toLowerCase(),
        password: hashedPassword,
        role: finalRole,
        companyId,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        active: true,
        createdAt: true,
        companyId: true,
      },
    });

    await logAction({
      tenantId:   companyId,
      userId:     req.user.id,
      action:     'USER_CREATED',
      resource:   'users',
      resourceId: user.id,
      ipAddress:  getIp(req),
      userAgent:  getUserAgent(req),
      status:     'SUCCESS',
      newValue:   { name: user.name, email: user.email, role: user.role },
    });

    res.status(201).json({ success: true, data: user });
  } catch (error) {
    next(error);
  }
};

// ─── PATCH /api/users/:id/toggle-active ───────────────────────────────────────

const toggleUserActive = async (req, res, next) => {
  try {
    const { id } = req.params;

    // Buscar usuario respetando tenant
    const where = { id };
    if (req.user.role !== 'SUPER_ADMIN') {
      where.companyId = req.user.companyId;
    }

    const user = await prisma.user.findFirst({ where });

    if (!user) {
      return res.status(404).json({ success: false, message: 'Usuario no encontrado' });
    }

    // No permitir desactivarse a si mismo
    if (user.id === req.user.id) {
      return res.status(400).json({ success: false, message: 'No podes desactivar tu propio usuario' });
    }

    const updated = await prisma.user.update({
      where: { id: user.id },
      data: { active: !user.active },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        active: true,
        createdAt: true,
      },
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
    const { name, role } = req.body;

    const where = { id };
    if (req.user.role !== 'SUPER_ADMIN') {
      where.companyId = req.user.companyId;
    }

    const user = await prisma.user.findFirst({ where });
    if (!user) {
      return res.status(404).json({ success: false, message: 'Usuario no encontrado' });
    }

    const data = {};
    if (name) data.name = name;
    if (role) {
      const allowedRoles = ['COMPANY_ADMIN', 'ANALYST', 'VIEWER'];
      if (allowedRoles.includes(role)) data.role = role;
    }

    const updated = await prisma.user.update({
      where: { id: user.id },
      data,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        active: true,
        createdAt: true,
      },
    });

    await logAction({
      tenantId:   user.companyId,
      userId:     req.user.id,
      action:     'USER_UPDATED',
      resource:   'users',
      resourceId: user.id,
      ipAddress:  getIp(req),
      userAgent:  getUserAgent(req),
      status:     'SUCCESS',
      oldValue:   { name: user.name, role: user.role },
      newValue:   { name: updated.name, role: updated.role },
    });

    res.json({ success: true, data: updated });
  } catch (error) {
    next(error);
  }
};

module.exports = { getUsers, createUser, toggleUserActive, updateUser };
