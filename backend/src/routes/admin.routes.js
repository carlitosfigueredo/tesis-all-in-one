const { Router } = require('express');
const { protect, requireRole, requirePortal } = require('../middlewares/auth.middleware');
const {
  getCompanies, getCompany, getAdminStats,
  getPlans, updatePlans, getAdminAuditLogs,
} = require('../controllers/admin.controller');
const { getAllPayments, toggleCompanyStatus } = require('../controllers/payments.controller');

const router = Router();

router.use(protect, requirePortal('admin'), requireRole('SUPER_ADMIN'));

router.get('/stats',       getAdminStats);
router.get('/companies',   getCompanies);
router.get('/companies/:id', getCompany);
router.patch('/companies/:id/status', toggleCompanyStatus);

// Planes — GET y PUT
router.get('/plans',  getPlans);
router.put('/plans',  updatePlans);

// Pagos — ver todos los pagos del sistema
router.get('/payments', getAllPayments);

router.get('/audit-logs', getAdminAuditLogs);

module.exports = router;
