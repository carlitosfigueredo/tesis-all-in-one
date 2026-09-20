const { Router } = require('express');
const {
  getAllEmployees, getEmployeeById, getEmployeeHistory, getEmployeesStats,
  createEmployee, updateEmployee, deleteEmployee, importEmployees,
  recalculateRisk, deactivateAbsentEmployees,
} = require('../controllers/employees.controller');
const { protect } = require('../middlewares/auth.middleware');
const { requireActiveCompany } = require('../middlewares/companyStatus.middleware');
const { requirePermission } = require('../middlewares/permission.middleware');

const router = Router();

// Todas las rutas requieren autenticacion + empresa activa
router.use(protect, requireActiveCompany);

// GET /api/employees/stats
router.get('/stats', requirePermission('dashboard.view', 'employees.read'), getEmployeesStats);

// POST /api/employees/import
router.post('/import', requirePermission('employees.import'), importEmployees);

// POST /api/employees/recalculate — recalcula predicciones ML para todos los empleados
router.post('/recalculate', requirePermission('predictions.run'), recalculateRisk);

// POST /api/employees/deactivate-absent — aplica bajas confirmadas (2do paso del flujo)
router.post('/deactivate-absent', requirePermission('employees.import'), deactivateAbsentEmployees);

// GET /api/employees
router.get('/', requirePermission('employees.read'), getAllEmployees);

// GET /api/employees/:id
router.get('/:id', requirePermission('employees.read'), getEmployeeById);

// GET /api/employees/:id/history — historial de riesgo (evolucion en el tiempo)
router.get('/:id/history', requirePermission('employees.read'), getEmployeeHistory);

// POST /api/employees
router.post('/', requirePermission('employees.write'), createEmployee);

// PUT /api/employees/:id
router.put('/:id', requirePermission('employees.write'), updateEmployee);

// DELETE /api/employees/:id
router.delete('/:id', requirePermission('employees.delete'), deleteEmployee);

module.exports = router;
