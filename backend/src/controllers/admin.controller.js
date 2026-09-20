// ─────────────────────────────────────────
// Admin Controller — Panel SUPER_ADMIN
// Todas las queries van contra PostgreSQL via Prisma
// ─────────────────────────────────────────

const prisma = require('../lib/prisma');
const { logAction } = require('../services/audit.service');
const { getIp, getUserAgent } = require('../utils/request.utils');
const { readRecentLogs } = require('../lib/logger');
const {
  planIdToEnum,
  daysUntil,
  getSubscriptionStatus,
  extendSubscription,
} = require('../services/subscription.service');

// ─── GET /api/plans (publico - landing page) ─────────────────────────────────

const getPublicPlans = async (_req, res, next) => {
  try {
    const plans = await prisma.planConfig.findMany({
      where: { active: true },
      orderBy: { priceGs: 'asc' },
    });
    res.json({ success: true, data: { plans } });
  } catch (error) {
    next(error);
  }
};

// ─── GET /api/admin/plans ─────────────────────────────────────────────────────

const getPlans = async (_req, res, next) => {
  try {
    const plans = await prisma.planConfig.findMany({
      orderBy: { priceGs: 'asc' },
    });
    res.json({ success: true, data: { plans } });
  } catch (error) {
    next(error);
  }
};

// ─── PUT /api/admin/plans ─────────────────────────────────────────────────────

const updatePlans = async (req, res, next) => {
  try {
    const { plans } = req.body;

    if (!Array.isArray(plans) || plans.length === 0) {
      return res.status(400).json({ success: false, message: 'Se requiere un array de planes' });
    }

    for (const p of plans) {
      if (!p.id || !p.name || p.priceGs === undefined) {
        return res.status(400).json({
          success: false,
          message: 'Plan inválido: se requiere id, name y priceGs',
        });
      }
    }

    // Actualizar cada plan con upsert
    const results = [];
    for (const p of plans) {
      const updated = await prisma.planConfig.upsert({
        where: { id: p.id },
        update: {
          name: p.name,
          priceGs: p.priceGs,
          highlight: p.highlight ?? false,
          employeeLimit: p.employeeLimit ?? 100,
          predictionFrequency: p.predictionFrequency ?? 'Mensual',
          dashboardType: p.dashboardType ?? 'Basico',
          features: p.features ?? [],
          cta: p.cta ?? 'Contratar',
          active: p.active ?? true,
        },
        create: {
          id: p.id,
          name: p.name,
          priceGs: p.priceGs,
          highlight: p.highlight ?? false,
          employeeLimit: p.employeeLimit ?? 100,
          predictionFrequency: p.predictionFrequency ?? 'Mensual',
          dashboardType: p.dashboardType ?? 'Basico',
          features: p.features ?? [],
          cta: p.cta ?? 'Contratar',
        },
      });
      results.push(updated);
    }

    await logAction({
      userId: req.user.id,
      action: 'PLANS_UPDATED',
      resource: 'plan_configs',
      ipAddress: getIp(req),
      userAgent: getUserAgent(req),
      status: 'SUCCESS',
      newValue: { plans: results.map((r) => r.id) },
    });

    res.json({ success: true, data: { plans: results } });
  } catch (error) {
    next(error);
  }
};

// ─── Empresas ─────────────────────────────────────────────────────────────────

/**
 * GET /api/admin/companies
 */
const getCompanies = async (req, res, next) => {
  try {
    const { plan, active } = req.query;

    const where = {};
    if (plan) where.plan = plan.toUpperCase();
    if (active !== undefined) where.active = active === 'true';

    const companies = await prisma.company.findMany({
      where,
      include: {
        _count: {
          select: { users: true, employees: true },
        },
        subscription: {
          select: {
            planId: true,
            status: true,
            currentPeriodEnd: true,
            canceledAt: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Formatear para incluir conteos y estado de suscripcion (vencimiento)
    const data = companies.map((c) => ({
      id: c.id,
      name: c.name,
      plan: c.plan,
      status: c.status,
      active: c.active,
      employeeCount: c._count.employees,
      userCount: c._count.users,
      subscription: c.subscription
        ? {
            planId:           c.subscription.planId,
            status:           c.subscription.status,
            currentPeriodEnd: c.subscription.currentPeriodEnd,
            daysRemaining:    daysUntil(c.subscription.currentPeriodEnd),
            canceledAt:       c.subscription.canceledAt,
          }
        : null,
      createdAt: c.createdAt,
      updatedAt: c.updatedAt,
    }));

    res.json({ success: true, data, total: data.length });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/admin/companies/:id
 */
const getCompany = async (req, res, next) => {
  try {
    const company = await prisma.company.findUnique({
      where: { id: req.params.id },
      include: {
        users: {
          select: {
            id: true,
            name: true,
            email: true,
            active: true,
            createdAt: true,
            lockedUntil: true,
            failedAttempts: true,
            userRoles: {
              select: {
                role: { select: { name: true } },
              },
            },
          },
          orderBy: { createdAt: 'asc' },
        },
        _count: { select: { employees: true } },
        subscription: true,
      },
    });

    if (!company) {
      return res.status(404).json({ success: false, message: 'Empresa no encontrada' });
    }

    // Enriquecer suscripcion con dias restantes / si vence pronto
    const subscriptionStatus = await getSubscriptionStatus(company.id);

    // Marcar usuarios bloqueados (lockedUntil en el futuro)
    const now = new Date();
    const users = company.users.map((u) => ({
      ...u,
      isLocked: !!u.lockedUntil && new Date(u.lockedUntil) > now,
    }));

    res.json({
      success: true,
      data: {
        ...company,
        users,
        employeeCount: company._count.employees,
        subscriptionStatus,
        _count: undefined,
      },
    });
  } catch (error) {
    next(error);
  }
};

// ─── Desbloqueo de cuentas de usuario (SUPER_ADMIN) ───────────────────────────

/**
 * POST /api/admin/users/:id/unlock
 * Resetea el bloqueo por intentos fallidos de un usuario (lockedUntil / failedAttempts).
 */
const unlockUser = async (req, res, next) => {
  try {
    const { id } = req.params;

    const user = await prisma.user.findUnique({
      where: { id },
      select: { id: true, email: true, companyId: true, lockedUntil: true, failedAttempts: true },
    });

    if (!user) {
      return res.status(404).json({ success: false, message: 'Usuario no encontrado' });
    }

    const updated = await prisma.user.update({
      where: { id },
      data:  { lockedUntil: null, failedAttempts: 0 },
      select: { id: true, name: true, email: true, active: true, lockedUntil: true, failedAttempts: true },
    });

    await logAction({
      tenantId:   user.companyId,
      userId:     req.user.id,
      action:     'USER_UNLOCKED',
      resource:   'users',
      resourceId: id,
      ipAddress:  getIp(req),
      userAgent:  getUserAgent(req),
      status:     'SUCCESS',
      oldValue:   { lockedUntil: user.lockedUntil, failedAttempts: user.failedAttempts },
      newValue:   { lockedUntil: null, failedAttempts: 0 },
    });

    res.json({ success: true, message: 'Cuenta desbloqueada', data: { ...updated, isLocked: false } });
  } catch (error) {
    next(error);
  }
};

// ─── Gestion de plan / suscripcion (SUPER_ADMIN) ──────────────────────────────

/**
 * PATCH /api/admin/companies/:id/plan
 * Cambia el plan de una empresa manualmente (sin pasar por pago).
 * Body: { plan } donde plan es un plan_config.id (ESTANDAR|PROFESIONAL|CORPORATIVO)
 *        o directamente el enum (BASICO|PROFESIONAL|CORPORATIVO).
 */
const changeCompanyPlan = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { plan } = req.body;

    const validEnums = ['BASICO', 'PROFESIONAL', 'CORPORATIVO'];
    // Aceptar tanto plan_config.id como el enum directo
    const planEnum = validEnums.includes(plan) ? plan : planIdToEnum(plan, null);

    if (!plan || !planEnum) {
      return res.status(400).json({
        success: false,
        message: `Plan invalido. Opciones: ESTANDAR/PROFESIONAL/CORPORATIVO o ${validEnums.join('/')}`,
      });
    }

    const company = await prisma.company.findUnique({ where: { id } });
    if (!company) {
      return res.status(404).json({ success: false, message: 'Empresa no encontrada' });
    }

    const updated = await prisma.company.update({
      where: { id },
      data:  { plan: planEnum },
    });

    // Reflejar el planId en la suscripcion si existe
    if (company.subscription || (await prisma.subscription.findUnique({ where: { companyId: id } }))) {
      await prisma.subscription.update({
        where: { companyId: id },
        data:  { planId: validEnums.includes(plan) ? plan : plan },
      }).catch(() => {});
    }

    await logAction({
      tenantId:   id,
      userId:     req.user.id,
      action:     'COMPANY_PLAN_CHANGED',
      resource:   'companies',
      resourceId: id,
      ipAddress:  getIp(req),
      userAgent:  getUserAgent(req),
      status:     'SUCCESS',
      oldValue:   { plan: company.plan },
      newValue:   { plan: updated.plan },
    });

    res.json({ success: true, data: updated });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/admin/companies/:id/subscription/extend
 * Extiende (renueva) manualmente el vencimiento de la suscripcion.
 * Body: { months = 1, fromCurrentEnd = false }
 */
const extendCompanySubscription = async (req, res, next) => {
  try {
    const { id } = req.params;
    const months = parseInt(req.body.months, 10) || 1;
    const fromCurrentEnd = req.body.fromCurrentEnd === true;

    if (months < 1 || months > 36) {
      return res.status(400).json({ success: false, message: 'months debe estar entre 1 y 36' });
    }

    const before = await prisma.subscription.findUnique({ where: { companyId: id } });
    if (!before) {
      return res.status(404).json({ success: false, message: 'La empresa no tiene una suscripción' });
    }

    const updated = await extendSubscription({ companyId: id, months, fromCurrentEnd });

    await logAction({
      tenantId:   id,
      userId:     req.user.id,
      action:     'SUBSCRIPTION_EXTENDED_MANUAL',
      resource:   'subscriptions',
      resourceId: updated.id,
      ipAddress:  getIp(req),
      userAgent:  getUserAgent(req),
      status:     'SUCCESS',
      oldValue:   { currentPeriodEnd: before.currentPeriodEnd, status: before.status },
      newValue:   { currentPeriodEnd: updated.currentPeriodEnd, status: updated.status, months },
    });

    res.json({
      success: true,
      data: { ...updated, daysRemaining: daysUntil(updated.currentPeriodEnd) },
    });
  } catch (error) {
    next(error);
  }
};

// ─── Stats globales ───────────────────────────────────────────────────────────

/**
 * GET /api/admin/stats
 */
const getAdminStats = async (_req, res, next) => {
  try {
    const [totalCompanies, activeCompanies, totalEmployees, totalUsers, byPlan] = await Promise.all([
      prisma.company.count(),
      prisma.company.count({ where: { active: true } }),
      prisma.employee.count(),
      // Usuarios que NO tienen el rol SUPER_ADMIN (rol vive en UserRole → Role)
      prisma.user.count({
        where: {
          NOT: {
            userRoles: {
              some: {
                role: { name: 'SUPER_ADMIN', companyId: null },
              },
            },
          },
        },
      }),
      prisma.company.groupBy({
        by: ['plan'],
        _count: { plan: true },
      }),
    ]);

    const byPlanMap = {};
    for (const item of byPlan) {
      byPlanMap[item.plan] = item._count.plan;
    }

    res.json({
      success: true,
      data: {
        totalCompanies,
        activeCompanies,
        totalEmployees,
        totalUsers,
        byPlan: byPlanMap,
      },
    });
  } catch (error) {
    next(error);
  }
};

// ─── Audit logs ───────────────────────────────────────────────────────────────

/**
 * GET /api/admin/audit-logs
 * Filtros: action, status, tenantId, userId, dateFrom, dateTo
 * Paginacion: page (default 1), pageSize (default 50, max 100)
 */
const getAdminAuditLogs = async (req, res, next) => {
  try {
    const {
      action, status, tenantId, userId,
      dateFrom, dateTo,
      page = '1', pageSize = '50',
    } = req.query;

    const pg   = Math.max(1, parseInt(page, 10) || 1);
    const size = Math.min(100, Math.max(1, parseInt(pageSize, 10) || 50));

    const where = {};
    if (action)   where.action   = action;
    if (status)   where.status   = status;
    if (tenantId) where.tenantId = tenantId;
    if (userId)   where.userId   = userId;
    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) where.createdAt.gte = new Date(dateFrom);
      if (dateTo)   where.createdAt.lte = new Date(dateTo);
    }

    const [data, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (pg - 1) * size,
        take: size,
        include: {
          user:    { select: { name: true, email: true } },
          company: { select: { name: true } },
        },
      }),
      prisma.auditLog.count({ where }),
    ]);

    // ── Enriquecer con el nombre legible del recurso afectado ──
    // resourceId no tiene relación en el schema (apunta a distintas tablas
    // segun `resource`), asi que resolvemos los nombres por lotes.
    const enriched = await attachResourceLabels(data);

    const totalPages = Math.ceil(total / size) || 1;

    res.json({
      success: true,
      data: enriched,
      total,
      page: pg,
      pageSize: size,
      total_pages: totalPages,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Resuelve el nombre legible del recurso (resourceId) de cada log segun su tipo.
 * Agrupa los IDs por tabla y hace una sola consulta por tipo para evitar N+1.
 * Devuelve los logs con un campo extra `resourceLabel`.
 */
const attachResourceLabels = async (logs) => {
  // Agrupar resourceIds por tipo de recurso
  const idsByResource = {};
  for (const log of logs) {
    if (!log.resourceId || !log.resource) continue;
    const key = log.resource.toLowerCase();
    (idsByResource[key] ??= new Set()).add(log.resourceId);
  }

  // Mapa final: `${resource}:${id}` -> label
  const labelMap = {};

  const loaders = {
    employees: async (ids) => {
      const rows = await prisma.employee.findMany({
        where: { id: { in: ids } },
        select: { id: true, nombre: true, apellido: true, codigo_empleado: true },
      });
      for (const r of rows) {
        const full = [r.nombre, r.apellido].filter(Boolean).join(' ').trim();
        labelMap[`employees:${r.id}`] = full || r.codigo_empleado || null;
      }
    },
    users: async (ids) => {
      const rows = await prisma.user.findMany({
        where: { id: { in: ids } },
        select: { id: true, name: true, email: true },
      });
      for (const r of rows) {
        labelMap[`users:${r.id}`] = r.name || r.email || null;
      }
    },
    subscriptions: async (ids) => {
      const rows = await prisma.subscription.findMany({
        where: { id: { in: ids } },
        select: { id: true, company: { select: { name: true } } },
      });
      for (const r of rows) {
        labelMap[`subscriptions:${r.id}`] = r.company?.name ? `Suscripción de ${r.company.name}` : null;
      }
    },
  };

  await Promise.all(
    Object.entries(idsByResource).map(([resource, idSet]) => {
      const loader = loaders[resource];
      if (!loader) return null;
      return loader([...idSet]).catch(() => {}); // nunca romper la respuesta por un fallo de resolucion
    })
  );

  return logs.map((log) => ({
    ...log,
    resourceLabel: log.resourceId ? (labelMap[`${log.resource?.toLowerCase()}:${log.resourceId}`] ?? null) : null,
  }));
};

// ─── System logs (logs de la aplicacion / contenedor) ──────────────────────────

/**
 * GET /api/admin/system-logs
 * Devuelve las ultimas lineas del log de la aplicacion (logs/app.log).
 * Query: limit (default 200, max 1000), level (INFO|WARN|ERROR|HTTP).
 * Solo SUPER_ADMIN (protegido a nivel de router).
 */
const getSystemLogs = async (req, res, next) => {
  try {
    const { limit = '200', level } = req.query;
    const entries = readRecentLogs({
      limit: parseInt(limit, 10) || 200,
      level: level || undefined,
    });

    res.json({
      success: true,
      data: entries,
      total: entries.length,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getCompanies,
  getCompany,
  changeCompanyPlan,
  extendCompanySubscription,
  unlockUser,
  getAdminStats,
  getPlans,
  updatePlans,
  getPublicPlans,
  getAdminAuditLogs,
  getSystemLogs,
};
