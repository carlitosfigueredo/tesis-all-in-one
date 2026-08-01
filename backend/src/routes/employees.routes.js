const { Router } = require('express');
const {
  getAllEmployees, getEmployeeById, getEmployeesStats,
  createEmployee, updateEmployee, deleteEmployee, importEmployees,
  recalculateRisk,
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

// GET /api/employees
router.get('/', requirePermission('employees.read'), getAllEmployees);

// GET /api/employees/:id
router.get('/:id', requirePermission('employees.read'), getEmployeeById);

// POST /api/employees
router.post('/', requirePermission('employees.write'), createEmployee);

// PUT /api/employees/:id
router.put('/:id', requirePermission('employees.write'), updateEmployee);

// DELETE /api/employees/:id
router.delete('/:id', requirePermission('employees.delete'), deleteEmployee);

module.exports = router;
