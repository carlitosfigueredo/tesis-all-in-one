// ─────────────────────────────────────────
// Admin Controller — Panel SUPER_ADMIN
// Datos mock para desarrollo. En producción
// usar Prisma con los modelos Company/User.
// ─────────────────────────────────────────

const MOCK_COMPANIES = [
  {
    id: 'comp-1',
    name: 'Devsoft S.A.',
    plan: 'PROFESIONAL',
    active: true,
    employeeCount: 120,
    createdAt: '2025-01-15T00:00:00.000Z',
  },
  {
    id: 'comp-2',
    name: 'TechPy Solutions',
    plan: 'BASICO',
    active: true,
    employeeCount: 35,
    createdAt: '2025-03-20T00:00:00.000Z',
  },
  {
    id: 'comp-3',
    name: 'DataCore S.R.L.',
    plan: 'EMPRESARIAL',
    active: true,
    employeeCount: 480,
    createdAt: '2024-11-01T00:00:00.000Z',
  },
  {
    id: 'comp-4',
    name: 'Nexo Digital',
    plan: 'BASICO',
    active: false,
    employeeCount: 18,
    createdAt: '2025-05-10T00:00:00.000Z',
  },
];

const PLAN_PRICES = {
  BASICO:       { price: 0,    currency: 'USD', period: 'mes', employeeLimit: 50  },
  PROFESIONAL:  { price: 49,   currency: 'USD', period: 'mes', employeeLimit: 500 },
  EMPRESARIAL:  { price: null, currency: 'USD', period: 'mes', employeeLimit: null },
};

// ─── Empresas ────────────────────────────

/**
 * GET /api/admin/companies
 */
const getCompanies = (req, res) => {
  const { plan, active } = req.query;

  let result = [...MOCK_COMPANIES];

  if (plan)   result = result.filter((c) => c.plan === plan.toUpperCase());
  if (active !== undefined) {
    result = result.filter((c) => c.active === (active === 'true'));
  }

  res.json({
    success: true,
    data: result,
    total: result.length,
  });
};

/**
 * GET /api/admin/companies/:id
 */
const getCompany = (req, res) => {
  const company = MOCK_COMPANIES.find((c) => c.id === req.params.id);
  if (!company) {
    return res.status(404).json({ success: false, message: 'Empresa no encontrada' });
  }
  res.json({ success: true, data: company });
};

// ─── Stats globales ───────────────────────

/**
 * GET /api/admin/stats
 */
const getAdminStats = (_req, res) => {
  const total      = MOCK_COMPANIES.length;
  const active     = MOCK_COMPANIES.filter((c) => c.active).length;
  const byPlan     = {
    BASICO:      MOCK_COMPANIES.filter((c) => c.plan === 'BASICO').length,
    PROFESIONAL: MOCK_COMPANIES.filter((c) => c.plan === 'PROFESIONAL').length,
    EMPRESARIAL: MOCK_COMPANIES.filter((c) => c.plan === 'EMPRESARIAL').length,
  };
  const totalEmployees = MOCK_COMPANIES.reduce((acc, c) => acc + c.employeeCount, 0);

  res.json({
    success: true,
    data: { totalCompanies: total, activeCompanies: active, byPlan, totalEmployees },
  });
};

// ─── Precios ─────────────────────────────

/**
 * GET /api/admin/plans
 */
const getPlans = (_req, res) => {
  res.json({ success: true, data: PLAN_PRICES });
};

const { getAuditLogs }  = require('../services/audit.service');

// ─── Audit logs ──────────────────────────

/**
 * GET /api/admin/audit-logs
 * Filtros: action, status, tenantId, userId, dateFrom, dateTo
 * Paginación: page (default 1), pageSize (default 50, max 100)
 */
const getAdminAuditLogs = (req, res) => {
  const {
    action, status, tenantId, userId,
    dateFrom, dateTo,
    page = '1', pageSize = '50',
  } = req.query;

  const pg   = Math.max(1, parseInt(page, 10) || 1);
  const size = Math.min(100, Math.max(1, parseInt(pageSize, 10) || 50));

  let logs = getAuditLogs({ tenantId, action, status, limit: 10000 });

  // Filtros adicionales
  if (userId)   logs = logs.filter((l) => l.userId   === userId);
  if (dateFrom) logs = logs.filter((l) => new Date(l.createdAt) >= new Date(dateFrom));
  if (dateTo)   logs = logs.filter((l) => new Date(l.createdAt) <= new Date(dateTo));

  const total      = logs.length;
  const totalPages = Math.ceil(total / size) || 1;
  const data       = logs.slice((pg - 1) * size, pg * size);

  res.json({
    success: true,
    data,
    total,
    page:        pg,
    pageSize:    size,
    total_pages: totalPages,
  });
};

module.exports = { getCompanies, getCompany, getAdminStats, getPlans, getAdminAuditLogs };
