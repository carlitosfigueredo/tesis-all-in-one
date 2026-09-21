// ─────────────────────────────────────────
// Dashboard Controller — tendencia real + configuración de widgets
// ─────────────────────────────────────────

const prisma = require('../lib/prisma');

const getCompanyFilter = (user) => {
  if (user.roleNames?.includes('SUPER_ADMIN')) return {};
  return { companyId: user.companyId };
};

// Widgets disponibles y su orden por defecto. El frontend usa estas keys.
const DEFAULT_WIDGETS = [
  { key: 'kpis',              label: 'Indicadores clave (KPIs)',      visible: true,  orden: 0 },
  { key: 'risk_distribution', label: 'Distribución de riesgo',         visible: true,  orden: 1 },
  { key: 'risk_by_dept',      label: 'Riesgo por rol/departamento',    visible: true,  orden: 2 },
  { key: 'trend',             label: 'Tendencia histórica de riesgo',  visible: true,  orden: 3 },
  { key: 'top_risk',          label: 'Empleados con mayor riesgo',     visible: true,  orden: 4 },
  { key: 'strategies',        label: 'Estrategias de retención',       visible: false, orden: 5 },
];

// ─── GET /api/dashboard/trend ────────────────────────────────────────────────────
// Tendencia REAL del riesgo por mes, calculada desde los RiskSnapshot de los
// empleados de la empresa. Reemplaza los datos simulados del dashboard.

const getTrend = async (req, res, next) => {
  try {
    const { months = '6' } = req.query;
    const n = Math.min(24, Math.max(1, parseInt(months, 10) || 6));

    // Rango: desde el primer día de (n-1) meses atrás hasta hoy.
    const now = new Date();
    const desde = new Date(now.getFullYear(), now.getMonth() - (n - 1), 1);

    // Traemos snapshots del período, ya filtrados por empresa a través del empleado.
    const companyFilter = getCompanyFilter(req.user);
    const snapshots = await prisma.riskSnapshot.findMany({
      where: {
        createdAt: { gte: desde },
        employee: { is: companyFilter },
      },
      select: { nivel_riesgo: true, createdAt: true },
      orderBy: { createdAt: 'asc' },
    });

    // Agrupar por mes (YYYY-MM) y contar por nivel.
    const MESES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    const buckets = new Map();
    for (let i = 0; i < n; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - (n - 1) + i, 1);
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      buckets.set(key, { mes: MESES[d.getMonth()], alto: 0, medio: 0, bajo: 0 });
    }

    for (const s of snapshots) {
      const d = new Date(s.createdAt);
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      const b = buckets.get(key);
      if (!b) continue;
      if (s.nivel_riesgo === 'CRITICO' || s.nivel_riesgo === 'ALTO') b.alto += 1;
      else if (s.nivel_riesgo === 'MEDIO') b.medio += 1;
      else b.bajo += 1;
    }

    res.json({
      success: true,
      data: [...buckets.values()],
      // Aviso: si no hay historial suficiente el frontend puede mostrar un hint.
      hasData: snapshots.length > 0,
    });
  } catch (error) {
    next(error);
  }
};

// ─── GET /api/dashboard/config ────────────────────────────────────────────────────
// Devuelve la configuración de widgets del usuario (o la default si no tiene).

const getConfig = async (req, res, next) => {
  try {
    const config = await prisma.dashboardConfig.findUnique({ where: { userId: req.user.id } });
    res.json({
      success: true,
      data: {
        widgets: config?.widgets ?? DEFAULT_WIDGETS,
        available: DEFAULT_WIDGETS,
        isDefault: !config,
      },
    });
  } catch (error) {
    next(error);
  }
};

// ─── PUT /api/dashboard/config ────────────────────────────────────────────────────
// Guarda (upsert) la configuración de widgets del usuario.

const saveConfig = async (req, res, next) => {
  try {
    const { widgets } = req.body;

    if (!Array.isArray(widgets) || widgets.length === 0) {
      return res.status(400).json({ success: false, message: 'widgets debe ser un arreglo no vacío.' });
    }

    // Validar contra las keys conocidas y normalizar la forma de cada widget.
    const validKeys = new Set(DEFAULT_WIDGETS.map((w) => w.key));
    const normalized = [];
    for (const w of widgets) {
      if (!w || !validKeys.has(w.key)) {
        return res.status(400).json({ success: false, message: `Widget inválido: ${w?.key ?? '(sin key)'}` });
      }
      normalized.push({
        key: w.key,
        visible: w.visible !== false,
        orden: Number.isFinite(w.orden) ? w.orden : 0,
      });
    }

    const saved = await prisma.dashboardConfig.upsert({
      where: { userId: req.user.id },
      update: { widgets: normalized },
      create: { userId: req.user.id, companyId: req.user.companyId ?? null, widgets: normalized },
    });

    res.json({ success: true, data: { widgets: saved.widgets } });
  } catch (error) {
    next(error);
  }
};

// ─── DELETE /api/dashboard/config ─────────────────────────────────────────────────
// Restaura la configuración por defecto (borra la personalización).

const resetConfig = async (req, res, next) => {
  try {
    await prisma.dashboardConfig.deleteMany({ where: { userId: req.user.id } });
    res.json({ success: true, data: { widgets: DEFAULT_WIDGETS } });
  } catch (error) {
    next(error);
  }
};

module.exports = { getTrend, getConfig, saveConfig, resetConfig, DEFAULT_WIDGETS };
