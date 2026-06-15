const { Router } = require('express');
const {
  getAllEmployees,
  getEmployeeById,
  createEmployee,
  updateEmployee,
  deleteEmployee,
} = require('../controllers/employees.controller');
const { protect } = require('../middlewares/auth.middleware');

const router = Router();

// Todas las rutas de empleados requieren autenticación
router.use(protect);

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
