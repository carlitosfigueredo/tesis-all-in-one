const { getDatasetEmployees, getDatasetEmployee } = require('../services/ml.service');

/**
 * GET /api/employees
 * Lista empleados del dataset IBM HR con flightRisk calculado.
 * Soporta: page, page_size, department, risk_level, search, attrition
 */
const getAllEmployees = async (req, res, next) => {
  try {
    const { page, page_size, department, risk_level, search, attrition } = req.query;
    const result = await getDatasetEmployees({
      page,
      page_size,
      department,
      risk_level,
      search,
      attrition,
    });
    res.json({ success: true, ...result });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/employees/:id
 */
const getEmployeeById = async (req, res, next) => {
  try {
    const employee = await getDatasetEmployee(req.params.id);
    res.json({ success: true, data: employee });
  } catch (error) {
    if (error.message.includes('404')) {
      return res.status(404).json({ success: false, message: 'Empleado no encontrado' });
    }
    next(error);
  }
};

// Stubs — se implementarán con Prisma cuando se conecte la BD real
const createEmployee = (_req, res) =>
  res.status(501).json({ success: false, message: 'No implementado aún' });

const updateEmployee = (_req, res) =>
  res.status(501).json({ success: false, message: 'No implementado aún' });

const deleteEmployee = (_req, res) =>
  res.status(501).json({ success: false, message: 'No implementado aún' });

module.exports = {
  getAllEmployees,
  getEmployeeById,
  createEmployee,
  updateEmployee,
  deleteEmployee,
};
