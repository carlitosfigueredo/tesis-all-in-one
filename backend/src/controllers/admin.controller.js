// ─────────────────────────────────────────
// Admin Controller — Panel SUPER_ADMIN
// Todas las queries van contra PostgreSQL via Prisma
// ─────────────────────────────────────────

const prisma = require('../lib/prisma');
const { logAction } = require('../services/audit.service');
const { getIp, getUserAgent } = require('../utils/request.utils');

// ─── Configuracion pay-per-use (estatica por ahora) ──────────────────────────

const PAY_PER_USE = {
  priceGs: 200000,
  collaboratorsBlock: 250,
  description: 'Gs. 200.000 por cada 250 colaboradores adicionales',
};

// ─── GET /api/plans (publico - landing page) ─────────────────────────────────

const getPublicPlans = async (_req, res, next) => {
  try {
    const plans = await prisma.planConfig.findMany({
      where: { active: true },
      orderBy: { priceGs: 'asc' },
    });
    res.json({ success: true, data: { plans, payPerUse: PAY_PER_USE } });
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
    res.json({ success: true, data: { plans, payPerUse: PAY_PER_USE } });
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
          message: 'Plan invalido: se requiere id, name y priceGs',
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

    res.json({ success: true, data: { plans: results, payPerUse: PAY_PER_USE } });
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
      },
      orderBy: { createdAt: 'desc' },
    });

    // Formatear para incluir conteos
    const data = companies.map((c) => ({
      id: c.id,
      name: c.name,
      plan: c.plan,
      active: c.active,
      employeeCount: c._count.employees,
      userCount: c._count.users,
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
            userRoles: {
              select: {
                role: { select: { name: true } },
              },
            },
          },
          orderBy: { createdAt: 'asc' },
        },
        _count: { select: { employees: true } },
      },
    });

    if (!company) {
      return res.status(404).json({ success: false, message: 'Empresa no encontrada' });
    }

    res.json({
      success: true,
      data: {
        ...company,
        employeeCount: company._count.employees,
        _count: undefined,
      },
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
          user: { select: { name: true, email: true } },
        },
      }),
      prisma.auditLog.count({ where }),
    ]);

    const totalPages = Math.ceil(total / size) || 1;

    res.json({
      success: true,
      data,
      total,
      page: pg,
      pageSize: size,
      total_pages: totalPages,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { getCompanies, getCompany, getAdminStats, getPlans, updatePlans, getPublicPlans, getAdminAuditLogs };
