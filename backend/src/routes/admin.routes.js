const { Router } = require('express');
const { protect, requireRole, requirePortal } = require('../middlewares/auth.middleware');
const {
  getCompanies, getCompany, getAdminStats,
  getPlans, updatePlans, getAdminAuditLogs,
} = require('../controllers/admin.controller');

const router = Router();

router.use(protect, requirePortal('admin'), requireRole('SUPER_ADMIN'));

router.get('/stats',       getAdminStats);
router.get('/companies',   getCompanies);
router.get('/companies/:id', getCompany);

// Planes — GET y PUT
router.get('/plans',  getPlans);
router.put('/plans',  updatePlans);

router.get('/audit-logs', getAdminAuditLogs);

module.exports = router;
