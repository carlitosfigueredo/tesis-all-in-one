const { getDatasetEmployees, getDatasetEmployee, getDatasetStats } = require('../services/ml.service');
const { logAction }  = require('../services/audit.service');
const { getIp, getUserAgent } = require('../utils/request.utils');

/**
 * GET /api/employees
 */
const getAllEmployees = async (req, res, next) => {
  try {
    const { page, page_size, department, risk_level, search, attrition } = req.query;
    const result = await getDatasetEmployees({ page, page_size, department, risk_level, search, attrition });

    // Auditar solo si hay filtros activos (no loguear cada listado simple)
    if (department || risk_level || search) {
      await logAction({
        tenantId:  req.user?.companyId ?? null,
        userId:    req.user?.id        ?? null,
        action:    'EMPLOYEE_LIST_FILTERED',
        resource:  'employees',
        ipAddress: getIp(req),
        userAgent: getUserAgent(req),
        status:    'SUCCESS',
        newValue:  { filters: { department, risk_level, search, attrition } },
      });
    }

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

    await logAction({
      tenantId:   req.user?.companyId ?? null,
      userId:     req.user?.id        ?? null,
      action:     'EMPLOYEE_VIEWED',
      resource:   'employees',
      resourceId: req.params.id,
      ipAddress:  getIp(req),
      userAgent:  getUserAgent(req),
      status:     'SUCCESS',
    });

    res.json({ success: true, data: employee });
  } catch (error) {
    if (error.message.includes('404')) {
      await logAction({
        tenantId:   req.user?.companyId ?? null,
        userId:     req.user?.id        ?? null,
        action:     'EMPLOYEE_VIEWED',
        resource:   'employees',
        resourceId: req.params.id,
        ipAddress:  getIp(req),
        userAgent:  getUserAgent(req),
        status:     'FAILURE',
        errorMsg:   'Empleado no encontrado',
      });
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

    const VALID_DEPTS    = ['Sales', 'Research & Development', 'Human Resources'];
    const VALID_TRAVEL   = ['Non-Travel', 'Travel_Rarely', 'Travel_Frequently'];
    const VALID_OVERTIME = ['yes', 'no'];
    const VALID_ATTRITION = ['yes', 'no'];

    const validationErrors = [];

    rows.forEach((row, idx) => {
      const line = idx + 2;

      // Campos requeridos
      for (const field of REQUIRED) {
        if (row[field] === undefined || row[field] === '') {
          validationErrors.push(`Línea ${line}: falta el campo "${field}"`);
        }
      }

      // Edad 18-70
      const age = Number(row.age);
      if (row.age !== '' && (isNaN(age) || age < 18 || age > 70)) {
        validationErrors.push(`Línea ${line}: edad fuera de rango (18-70), recibido: "${row.age}"`);
      }

      // Ingreso no negativo
      const income = Number(row.monthly_income);
      if (row.monthly_income !== '' && (isNaN(income) || income < 0)) {
        validationErrors.push(`Línea ${line}: el ingreso mensual debe ser un número positivo`);
      }

      // Satisfacción laboral 1-4
      const sat = Number(row.job_satisfaction);
      if (row.job_satisfaction !== '' && (isNaN(sat) || sat < 1 || sat > 4)) {
        validationErrors.push(`Línea ${line}: job_satisfaction debe ser 1, 2, 3 o 4`);
      }

      // Satisfacción ambiente 1-4
      if (row.environment_satisfaction !== undefined && row.environment_satisfaction !== '') {
        const envSat = Number(row.environment_satisfaction);
        if (isNaN(envSat) || envSat < 1 || envSat > 4) {
          validationErrors.push(`Línea ${line}: environment_satisfaction debe ser 1, 2, 3 o 4`);
        }
      }

      // Balance vida-trabajo 1-4
      if (row.work_life_balance !== undefined && row.work_life_balance !== '') {
        const wlb = Number(row.work_life_balance);
        if (isNaN(wlb) || wlb < 1 || wlb > 4) {
          validationErrors.push(`Línea ${line}: work_life_balance debe ser 1, 2, 3 o 4`);
        }
      }

      // Performance rating 1-4
      if (row.performance_rating !== undefined && row.performance_rating !== '') {
        const perf = Number(row.performance_rating);
        if (isNaN(perf) || perf < 1 || perf > 4) {
          validationErrors.push(`Línea ${line}: performance_rating debe ser 1, 2, 3 o 4`);
        }
      }

      // Educación 1-5
      if (row.education !== undefined && row.education !== '') {
        const edu = Number(row.education);
        if (isNaN(edu) || edu < 1 || edu > 5) {
          validationErrors.push(`Línea ${line}: education debe ser un número entre 1 y 5`);
        }
      }

      // Overtime: Yes / No (case-insensitive)
      if (row.overtime !== undefined && row.overtime !== '') {
        if (!VALID_OVERTIME.includes(row.overtime.toLowerCase())) {
          validationErrors.push(`Línea ${line}: overtime debe ser "Yes" o "No", recibido: "${row.overtime}"`);
        }
      }

      // Attrition: Yes / No (case-insensitive)
      if (row.attrition !== undefined && row.attrition !== '') {
        if (!VALID_ATTRITION.includes(row.attrition.toLowerCase())) {
          validationErrors.push(`Línea ${line}: attrition debe ser "Yes" o "No", recibido: "${row.attrition}"`);
        }
      }

      // Business travel
      if (row.business_travel !== undefined && row.business_travel !== '') {
        if (!VALID_TRAVEL.includes(row.business_travel)) {
          validationErrors.push(`Línea ${line}: business_travel debe ser "Non-Travel", "Travel_Rarely" o "Travel_Frequently"`);
        }
      }

      // Departamento válido
      if (row.department && !VALID_DEPTS.includes(row.department)) {
        validationErrors.push(`Línea ${line}: department inválido "${row.department}" (válidos: Sales, Research & Development, Human Resources)`);
      }
    });

    if (validationErrors.length > 0) {
      return res.status(422).json({
        success: false,
        message: `Se encontraron ${validationErrors.length} error(es) de validación`,
        errors: validationErrors.slice(0, 20), // max 20 para no saturar la respuesta
      });
    }

    // Registrar importación exitosa en auditoría
    await logAction({
      tenantId:  req.user?.companyId ?? null,
      userId:    req.user?.id        ?? null,
      action:    'EMPLOYEE_IMPORT',
      resource:  'employees',
      ipAddress: getIp(req),
      userAgent: getUserAgent(req),
      status:    'SUCCESS',
      newValue:  { imported: rows.length },
    });

    return res.json({
      success:  true,
      imported: rows.length,
      message:  `${rows.length} empleados importados correctamente`,
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
