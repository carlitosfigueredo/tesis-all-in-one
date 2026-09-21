const { Router } = require('express');
const {
  getTrend, getConfig, saveConfig, resetConfig,
} = require('../controllers/dashboard.controller');
const { protect } = require('../middlewares/auth.middleware');
const { requireActiveCompany } = require('../middlewares/companyStatus.middleware');
const { requirePermission } = require('../middlewares/permission.middleware');

const router = Router();

router.use(protect, requireActiveCompany);

// GET /api/dashboard/trend — tendencia histórica real (desde RiskSnapshot)
router.get('/trend', requirePermission('dashboard.view'), getTrend);

// GET /api/dashboard/config — configuración de widgets del usuario
router.get('/config', requirePermission('dashboard.view'), getConfig);

// PUT /api/dashboard/config — guardar personalización
router.put('/config', requirePermission('dashboard.config'), saveConfig);

// DELETE /api/dashboard/config — restaurar por defecto
router.delete('/config', requirePermission('dashboard.config'), resetConfig);

module.exports = router;
