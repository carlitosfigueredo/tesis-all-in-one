const { Router } = require('express');
const {
  getRetentionReport, exportRetentionPdf, exportRetentionExcel,
} = require('../controllers/reports.controller');
const { protect } = require('../middlewares/auth.middleware');
const { requireActiveCompany } = require('../middlewares/companyStatus.middleware');
const { requirePermission } = require('../middlewares/permission.middleware');

const router = Router();

router.use(protect, requireActiveCompany);

// GET /api/reports/retention — dataset del reporte (JSON, para previsualizar)
router.get('/retention', requirePermission('reports.view'), getRetentionReport);

// GET /api/reports/retention/pdf — descarga PDF
router.get('/retention/pdf', requirePermission('reports.view'), exportRetentionPdf);

// GET /api/reports/retention/excel — descarga Excel
router.get('/retention/excel', requirePermission('reports.view'), exportRetentionExcel);

module.exports = router;
