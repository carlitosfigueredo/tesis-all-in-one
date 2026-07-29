const { Router } = require('express');
const { protect, requireRole, requirePortal } = require('../middlewares/auth.middleware');
const { requirePermission } = require('../middlewares/permission.middleware');
const {
  getCompanies, getCompany, getAdminStats,
  getPlans, updatePlans, getAdminAuditLogs,
} = require('../controllers/admin.controller');
const { getAllPayments, toggleCompanyStatus } = require('../controllers/payments.controller');

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

module.exports = router;
