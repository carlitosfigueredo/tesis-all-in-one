const { getDatasetEmployees, getDatasetEmployee, getDatasetStats } = require('../services/ml.service');

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

/**
 * POST /api/employees/import
 * Importación masiva de empleados desde CSV (ya parseado por el frontend).
 * Valida cada fila y rechaza el lote completo si hay errores críticos.
 */
const importEmployees = (req, res, next) => {
  try {
    const { rows } = req.body;

    if (!Array.isArray(rows) || rows.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No se recibieron filas para importar',
      });
    }

    if (rows.length > 5000) {
      return res.status(400).json({
        success: false,
        message: 'El límite por importación es de 5000 filas',
      });
    }

    // Campos obligatorios que deben venir del CSV
    const REQUIRED = [
      'department', 'job_role', 'age', 'gender',
      'monthly_income', 'job_satisfaction', 'years_at_company',
      'overtime', 'attrition',
    ];

    const VALID_DEPTS = ['Sales', 'Research & Development', 'Human Resources'];

    const validationErrors = [];

    rows.forEach((row, idx) => {
      const line = idx + 2; // fila 1 = headers

      // Campos requeridos
      for (const field of REQUIRED) {
        if (row[field] === undefined || row[field] === '') {
          validationErrors.push(`Línea ${line}: falta el campo "${field}"`);
        }
      }

      // Rango de edad
      const age = Number(row.age);
      if (!isNaN(age) && (age < 18 || age > 70)) {
        validationErrors.push(`Línea ${line}: edad fuera de rango (18-70), recibido: ${row.age}`);
      }

      // Ingreso no negativo
      const income = Number(row.monthly_income);
      if (!isNaN(income) && income < 0) {
        validationErrors.push(`Línea ${line}: el ingreso mensual no puede ser negativo`);
      }

      // Satisfacción 1-4
      const sat = Number(row.job_satisfaction);
      if (row.job_satisfaction !== '' && (isNaN(sat) || sat < 1 || sat > 4)) {
        validationErrors.push(`Línea ${line}: job_satisfaction debe ser 1, 2, 3 o 4`);
      }

      // Departamento válido
      if (row.department && !VALID_DEPTS.includes(row.department)) {
        validationErrors.push(`Línea ${line}: departamento inválido "${row.department}"`);
      }
    });

    if (validationErrors.length > 0) {
      return res.status(422).json({
        success: false,
        message: `Se encontraron ${validationErrors.length} error(es) de validación`,
        errors: validationErrors.slice(0, 20), // max 20 para no saturar la respuesta
      });
    }

    // TODO: cuando esté la BD real, usar Prisma para insertar en bulk
    // Por ahora retorna éxito simulado con el conteo recibido
    return res.json({
      success: true,
      imported: rows.length,
      message: `${rows.length} empleados importados correctamente`,
    });

  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/employees/stats
 * Estadísticas globales para el Dashboard (totales reales, sin paginación).
 */
const getEmployeesStats = async (req, res, next) => {
  try {
    const stats = await getDatasetStats();
    res.json({ success: true, data: stats });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAllEmployees,
  getEmployeeById,
  getEmployeesStats,
  createEmployee,
  updateEmployee,
  deleteEmployee,
  importEmployees,
};
