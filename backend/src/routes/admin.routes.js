const { Router } = require('express');
const { protect, requireRole, requirePortal } = require('../middlewares/auth.middleware');
const {
  getCompanies, getCompany, getAdminStats,
  getPlans, getAdminAuditLogs,
} = require('../controllers/admin.controller');

const router = Router();

// Todas las rutas requieren: JWT válido + portal admin + rol SUPER_ADMIN
router.use(protect, requirePortal('admin'), requireRole('SUPER_ADMIN'));

// GET /api/admin/stats
router.get('/stats', getAdminStats);

// GET /api/admin/companies
// GET /api/admin/companies/:id
router.get('/companies',     getCompanies);
router.get('/companies/:id', getCompany);

// GET /api/admin/plans
router.get('/plans', getPlans);

// GET /api/admin/audit-logs
router.get('/audit-logs', getAdminAuditLogs);

module.exports = router;
