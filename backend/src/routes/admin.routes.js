const { Router } = require('express');
const { protect, requireRole, requirePortal } = require('../middlewares/auth.middleware');
const { requirePermission } = require('../middlewares/permission.middleware');
const {
  getCompanies, getCompany, getAdminStats,
  getPlans, updatePlans, getAdminAuditLogs,
} = require('../controllers/admin.controller');
const { getAllPayments, toggleCompanyStatus } = require('../controllers/payments.controller');
const { getPasswordPolicy, setConfig, getResetTokenConfig } = require('../services/systemConfig.service');

const router = Router();

// Todas las rutas admin requieren autenticacion + portal admin + rol SUPER_ADMIN
router.use(protect, requirePortal('admin'), requireRole('SUPER_ADMIN'));

router.get('/stats',       requirePermission('admin.companies'), getAdminStats);
router.get('/companies',   requirePermission('admin.companies'), getCompanies);
router.get('/companies/:id', requirePermission('admin.companies'), getCompany);
router.patch('/companies/:id/status', requirePermission('admin.companies'), toggleCompanyStatus);

router.get('/plans',  requirePermission('admin.plans'), getPlans);
router.put('/plans',  requirePermission('admin.plans'), updatePlans);

router.get('/payments', requirePermission('admin.payments'), getAllPayments);

router.get('/audit-logs', requirePermission('admin.audit'), getAdminAuditLogs);

// ─── Configuracion del sistema ────────────────────────────────────────────────

// GET  /api/admin/config/password-policy
router.get('/config/password-policy', async (_req, res, next) => {
  try {
    const policy = await getPasswordPolicy();
    res.json({ success: true, data: policy });
  } catch (err) { next(err); }
});

// PUT  /api/admin/config/password-policy
router.put('/config/password-policy', async (req, res, next) => {
  try {
    const { minLength, maxLength, requireUppercase, requireLowercase, requireNumber, requireSpecial } = req.body;

    // Validaciones basicas
    if (minLength !== undefined && (minLength < 4 || minLength > 32)) {
      return res.status(400).json({ success: false, message: 'minLength debe estar entre 4 y 32' });
    }
    if (maxLength !== undefined && (maxLength < 32 || maxLength > 256)) {
      return res.status(400).json({ success: false, message: 'maxLength debe estar entre 32 y 256' });
    }
    if (minLength && maxLength && minLength > maxLength) {
      return res.status(400).json({ success: false, message: 'minLength no puede ser mayor que maxLength' });
    }

    // Leer politica actual y aplicar solo los campos enviados
    const current = await getPasswordPolicy();
    const updated = {
      minLength:        minLength        ?? current.minLength,
      maxLength:        maxLength        ?? current.maxLength,
      requireUppercase: requireUppercase ?? current.requireUppercase,
      requireLowercase: requireLowercase ?? current.requireLowercase,
      requireNumber:    requireNumber    ?? current.requireNumber,
      requireSpecial:   requireSpecial   ?? current.requireSpecial,
    };

    await setConfig('password_policy', updated, req.user.id);

    res.json({ success: true, data: updated, message: 'Politica de contrasenas actualizada' });
  } catch (err) { next(err); }
});

// ─── Configuracion token de reset ─────────────────────────────────────────────

// GET  /api/admin/config/reset-token
router.get('/config/reset-token', async (_req, res, next) => {
  try {
    const config = await getResetTokenConfig();
    res.json({ success: true, data: config });
  } catch (err) { next(err); }
});

// PUT  /api/admin/config/reset-token
router.put('/config/reset-token', async (req, res, next) => {
  try {
    const { ttlMinutes, maxDailyRequests } = req.body;

    if (ttlMinutes !== undefined && (ttlMinutes < 1 || ttlMinutes > 1440)) {
      return res.status(400).json({ success: false, message: 'ttlMinutes debe estar entre 1 y 1440 (24h)' });
    }
    if (maxDailyRequests !== undefined && (maxDailyRequests < 1 || maxDailyRequests > 20)) {
      return res.status(400).json({ success: false, message: 'maxDailyRequests debe estar entre 1 y 20' });
    }

    const current = await getResetTokenConfig();
    const updated = {
      ttlMinutes:       ttlMinutes       ?? current.ttlMinutes,
      maxDailyRequests: maxDailyRequests ?? current.maxDailyRequests,
    };

    await setConfig('reset_token_config', updated, req.user.id);

    res.json({ success: true, data: updated, message: 'Configuracion de token actualizada' });
  } catch (err) { next(err); }
});

module.exports = router;
