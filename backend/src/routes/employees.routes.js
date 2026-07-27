const { Router } = require('express');
const {
  getAllEmployees,
  getEmployeeById,
  getEmployeesStats,
  createEmployee,
  updateEmployee,
  deleteEmployee,
  importEmployees,
} = require('../controllers/employees.controller');
const { protect } = require('../middlewares/auth.middleware');
const { requireActiveCompany } = require('../middlewares/companyStatus.middleware');

const router = Router();

// Todas las rutas de empleados requieren autenticacion + empresa activa
router.use(protect, requireActiveCompany);

// GET    /api/employees/stats  — debe ir ANTES de /:id
router.get('/stats', getEmployeesStats);

// POST   /api/employees/import — debe ir ANTES de /:id
router.post('/import', importEmployees);

// GET    /api/employees
router.get('/', getAllEmployees);

// GET    /api/employees/:id
router.get('/:id', getEmployeeById);

// POST   /api/employees
router.post('/', createEmployee);

// PUT    /api/employees/:id
router.put('/:id', updateEmployee);

// DELETE /api/employees/:id
router.delete('/:id', deleteEmployee);

module.exports = router;
