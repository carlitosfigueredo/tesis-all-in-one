const { Router } = require('express');
const {
  listStrategies, strategiesSummary, listEmployeeStrategies,
  generateForEmployee, updateStrategy, deleteStrategy,
} = require('../controllers/retention.controller');
const { protect } = require('../middlewares/auth.middleware');
const { requireActiveCompany } = require('../middlewares/companyStatus.middleware');
const { requirePermission } = require('../middlewares/permission.middleware');

const router = Router();

router.use(protect, requireActiveCompany);

// GET /api/retention/strategies — lista de estrategias de la empresa (con filtros)
router.get('/strategies', requirePermission('retention.read'), listStrategies);

// GET /api/retention/strategies/summary — conteos por estado/prioridad
router.get('/strategies/summary', requirePermission('retention.read'), strategiesSummary);

// GET /api/retention/employees/:employeeId/strategies — estrategias de un empleado
router.get('/employees/:employeeId/strategies', requirePermission('retention.read'), listEmployeeStrategies);

// POST /api/retention/employees/:employeeId/generate — generar desde factores actuales
router.post('/employees/:employeeId/generate', requirePermission('retention.manage'), generateForEmployee);

// PATCH /api/retention/strategies/:id — actualizar estado/notas (seguimiento)
router.patch('/strategies/:id', requirePermission('retention.manage'), updateStrategy);

// DELETE /api/retention/strategies/:id
router.delete('/strategies/:id', requirePermission('retention.manage'), deleteStrategy);

module.exports = router;
