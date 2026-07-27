// ─────────────────────────────────────────
// Employees Controller — CRUD con Prisma
// Los datos de empleados se persisten en PostgreSQL.
// Las predicciones ML se obtienen del servicio Python.
// ─────────────────────────────────────────

const prisma = require('../lib/prisma');
const { logAction }  = require('../services/audit.service');
const { getIp, getUserAgent } = require('../utils/request.utils');
const mlService = require('../services/ml.service');

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Determina el filtro de companyId segun el rol del usuario.
 * SUPER_ADMIN ve todo, los demas solo ven su empresa.
 */
const getCompanyFilter = (user) => {
  if (user.role === 'SUPER_ADMIN') return {};
  return { companyId: user.companyId };
};

// ─── GET /api/employees ───────────────────────────────────────────────────────

const getAllEmployees = async (req, res, next) => {
  try {
    const { page = '1', page_size = '20', department, risk_level, search, attrition, status } = req.query;

    const pg   = Math.max(1, parseInt(page, 10) || 1);
    const size = Math.min(100, Math.max(1, parseInt(page_size, 10) || 20));

    const where = { ...getCompanyFilter(req.user) };

    if (department)  where.department = department;
    if (risk_level)  where.risk_level = risk_level.toUpperCase();
    if (status)      where.status = status.toUpperCase();
    if (attrition !== undefined) where.attrition = attrition === 'true' || attrition === 'Yes';

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { job_role: { contains: search, mode: 'insensitive' } },
        { department: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [data, total] = await Promise.all([
      prisma.employee.findMany({
        where,
        orderBy: { flight_risk: 'desc' },
        skip: (pg - 1) * size,
        take: size,
      }),
      prisma.employee.count({ where }),
    ]);

    const totalPages = Math.ceil(total / size) || 1;

    // Auditar si hay filtros activos
    if (department || risk_level || search) {
      await logAction({
        tenantId:  req.user.companyId ?? null,
        userId:    req.user.id,
        action:    'EMPLOYEE_LIST_FILTERED',
        resource:  'employees',
        ipAddress: getIp(req),
        userAgent: getUserAgent(req),
        status:    'SUCCESS',
        newValue:  { filters: { department, risk_level, search, attrition } },
      });
    }

    res.json({
      success: true,
      data,
      total,
      page: pg,
      page_size: size,
      total_pages: totalPages,
    });
  } catch (error) {
    next(error);
  }
};

// ─── GET /api/employees/stats ─────────────────────────────────────────────────

const getEmployeesStats = async (req, res, next) => {
  try {
    const companyFilter = getCompanyFilter(req.user);

    const [total, highRisk, medRisk, lowRisk, avgIncome, avgPerformance, byDepartment, attritionCount] = await Promise.all([
      prisma.employee.count({ where: companyFilter }),
      prisma.employee.count({ where: { ...companyFilter, risk_level: 'ALTO' } }),
      prisma.employee.count({ where: { ...companyFilter, risk_level: 'MEDIO' } }),
      prisma.employee.count({ where: { ...companyFilter, risk_level: 'BAJO' } }),
      prisma.employee.aggregate({ where: companyFilter, _avg: { monthly_income: true } }),
      prisma.employee.aggregate({ where: companyFilter, _avg: { performance_rating: true } }),
      prisma.employee.groupBy({
        by: ['department'],
        where: companyFilter,
        _count: { department: true },
        _avg: { flight_risk: true },
      }),
      prisma.employee.count({ where: { ...companyFilter, attrition: true } }),
    ]);

    // Distribucion por nivel de riesgo (para graficos)
    const riskDistribution = [
      { name: 'Bajo', value: lowRisk, color: '#22c55e' },
      { name: 'Medio', value: medRisk, color: '#f59e0b' },
      { name: 'Alto', value: highRisk, color: '#ef4444' },
    ];

    // Stats por departamento
    const departmentStats = byDepartment.map((d) => ({
      department: d.department,
      count: d._count.department,
      avg_risk: Math.round((d._avg.flight_risk ?? 0) * 100) / 100,
    }));

    res.json({
      success: true,
      data: {
        total,
        high_risk: highRisk,
        med_risk: medRisk,
        low_risk: lowRisk,
        avg_monthly_income: avgIncome._avg.monthly_income ?? 0,
        avg_performance: avgPerformance._avg.performance_rating ?? 0,
        attrition_count: attritionCount,
        attrition_rate: total > 0 ? Math.round((attritionCount / total) * 100 * 10) / 10 : 0,
        risk_distribution: riskDistribution,
        department_stats: departmentStats,
      },
    });
  } catch (error) {
    next(error);
  }
};

// ─── GET /api/employees/:id ───────────────────────────────────────────────────

const getEmployeeById = async (req, res, next) => {
  try {
    const where = { id: req.params.id, ...getCompanyFilter(req.user) };

    const employee = await prisma.employee.findFirst({ where });

    if (!employee) {
      await logAction({
        tenantId:   req.user.companyId ?? null,
        userId:     req.user.id,
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

    await logAction({
      tenantId:   req.user.companyId ?? null,
      userId:     req.user.id,
      action:     'EMPLOYEE_VIEWED',
      resource:   'employees',
      resourceId: employee.id,
      ipAddress:  getIp(req),
      userAgent:  getUserAgent(req),
      status:     'SUCCESS',
    });

    res.json({ success: true, data: employee });
  } catch (error) {
    next(error);
  }
};

// ─── POST /api/employees ──────────────────────────────────────────────────────

const createEmployee = async (req, res, next) => {
  try {
    const {
      name, job_role, department, age, gender, marital_status,
      education, education_field, monthly_income, job_satisfaction,
      environment_satisfaction, work_life_balance, performance_rating,
      years_at_company, years_in_current_role, years_since_last_promotion,
      total_working_years, num_companies_worked, distance_from_home,
      overtime, business_travel, attrition,
    } = req.body;

    // Validaciones basicas
    if (!job_role || !department || !age || !gender || !monthly_income || job_satisfaction === undefined || !years_at_company) {
      return res.status(400).json({
        success: false,
        message: 'Campos obligatorios: job_role, department, age, gender, monthly_income, job_satisfaction, years_at_company',
      });
    }

    // Determinar companyId: SUPER_ADMIN puede especificarlo, los demas usan el propio
    const companyId = req.user.role === 'SUPER_ADMIN'
      ? (req.body.companyId || null)
      : req.user.companyId;

    const employee = await prisma.employee.create({
      data: {
        name: name || null,
        job_role,
        department,
        age: parseInt(age, 10),
        gender,
        marital_status: marital_status || null,
        education: education ? parseInt(education, 10) : null,
        education_field: education_field || null,
        monthly_income: parseFloat(monthly_income),
        job_satisfaction: parseInt(job_satisfaction, 10),
        environment_satisfaction: environment_satisfaction ? parseInt(environment_satisfaction, 10) : null,
        work_life_balance: work_life_balance ? parseInt(work_life_balance, 10) : null,
        performance_rating: performance_rating ? parseInt(performance_rating, 10) : null,
        years_at_company: parseInt(years_at_company, 10),
        years_in_current_role: years_in_current_role ? parseInt(years_in_current_role, 10) : null,
        years_since_last_promotion: years_since_last_promotion ? parseInt(years_since_last_promotion, 10) : null,
        total_working_years: total_working_years ? parseInt(total_working_years, 10) : null,
        num_companies_worked: num_companies_worked ? parseInt(num_companies_worked, 10) : null,
        distance_from_home: distance_from_home ? parseInt(distance_from_home, 10) : null,
        overtime: overtime === true || overtime === 'yes' || overtime === 'Yes',
        business_travel: business_travel || null,
        attrition: attrition === true || attrition === 'yes' || attrition === 'Yes',
        companyId,
      },
    });

    await logAction({
      tenantId:   companyId,
      userId:     req.user.id,
      action:     'EMPLOYEE_CREATED',
      resource:   'employees',
      resourceId: employee.id,
      ipAddress:  getIp(req),
      userAgent:  getUserAgent(req),
      status:     'SUCCESS',
      newValue:   { name: employee.name, department: employee.department },
    });

    res.status(201).json({ success: true, data: employee });
  } catch (error) {
    next(error);
  }
};

// ─── PUT /api/employees/:id ───────────────────────────────────────────────────

const updateEmployee = async (req, res, next) => {
  try {
    const where = { id: req.params.id, ...getCompanyFilter(req.user) };
    const existing = await prisma.employee.findFirst({ where });

    if (!existing) {
      return res.status(404).json({ success: false, message: 'Empleado no encontrado' });
    }

    // Campos actualizables
    const allowedFields = [
      'name', 'job_role', 'department', 'age', 'gender', 'marital_status',
      'education', 'education_field', 'monthly_income', 'job_satisfaction',
      'environment_satisfaction', 'work_life_balance', 'performance_rating',
      'years_at_company', 'years_in_current_role', 'years_since_last_promotion',
      'total_working_years', 'num_companies_worked', 'distance_from_home',
      'overtime', 'business_travel', 'attrition', 'status',
      'flight_risk', 'risk_level',
    ];

    const data = {};
    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        let value = req.body[field];

        // Parsear tipos
        if (['age', 'education', 'job_satisfaction', 'environment_satisfaction',
             'work_life_balance', 'performance_rating', 'years_at_company',
             'years_in_current_role', 'years_since_last_promotion',
             'total_working_years', 'num_companies_worked', 'distance_from_home'].includes(field)) {
          value = value !== null && value !== '' ? parseInt(value, 10) : null;
        } else if (['monthly_income', 'flight_risk'].includes(field)) {
          value = value !== null && value !== '' ? parseFloat(value) : null;
        } else if (field === 'overtime' || field === 'attrition') {
          value = value === true || value === 'yes' || value === 'Yes';
        } else if (field === 'status') {
          value = value.toUpperCase();
        } else if (field === 'risk_level') {
          value = value.toUpperCase();
        }

        data[field] = value;
      }
    }

    const updated = await prisma.employee.update({
      where: { id: existing.id },
      data,
    });

    await logAction({
      tenantId:   req.user.companyId ?? null,
      userId:     req.user.id,
      action:     'EMPLOYEE_UPDATED',
      resource:   'employees',
      resourceId: updated.id,
      ipAddress:  getIp(req),
      userAgent:  getUserAgent(req),
      status:     'SUCCESS',
      oldValue:   existing,
      newValue:   updated,
    });

    res.json({ success: true, data: updated });
  } catch (error) {
    next(error);
  }
};

// ─── DELETE /api/employees/:id ────────────────────────────────────────────────

const deleteEmployee = async (req, res, next) => {
  try {
    const where = { id: req.params.id, ...getCompanyFilter(req.user) };
    const existing = await prisma.employee.findFirst({ where });

    if (!existing) {
      return res.status(404).json({ success: false, message: 'Empleado no encontrado' });
    }

    await prisma.employee.delete({ where: { id: existing.id } });

    await logAction({
      tenantId:   req.user.companyId ?? null,
      userId:     req.user.id,
      action:     'EMPLOYEE_DELETED',
      resource:   'employees',
      resourceId: existing.id,
      ipAddress:  getIp(req),
      userAgent:  getUserAgent(req),
      status:     'SUCCESS',
      oldValue:   { name: existing.name, department: existing.department },
    });

    res.json({ success: true, message: 'Empleado eliminado correctamente' });
  } catch (error) {
    next(error);
  }
};

// ─── POST /api/employees/import ───────────────────────────────────────────────

const importEmployees = async (req, res, next) => {
  try {
    const { rows } = req.body;

    if (!Array.isArray(rows) || rows.length === 0) {
      return res.status(400).json({ success: false, message: 'No se recibieron filas para importar' });
    }

    if (rows.length > 5000) {
      return res.status(400).json({ success: false, message: 'El limite por importacion es de 5000 filas' });
    }

    const REQUIRED = ['department', 'job_role', 'age', 'gender', 'monthly_income', 'job_satisfaction', 'years_at_company', 'overtime', 'attrition'];
    const VALID_DEPTS    = ['Sales', 'Research & Development', 'Human Resources'];
    const VALID_TRAVEL   = ['Non-Travel', 'Travel_Rarely', 'Travel_Frequently'];

    const validationErrors = [];
    const validRows = [];

    const companyId = req.user.role === 'SUPER_ADMIN'
      ? (req.body.companyId || null)
      : req.user.companyId;

    rows.forEach((row, idx) => {
      const line = idx + 2; // +2 porque linea 1 es header
      const rowErrors = [];

      // Verificar campos obligatorios
      for (const field of REQUIRED) {
        if (row[field] === undefined || row[field] === null || row[field] === '') {
          rowErrors.push(`Campo obligatorio "${field}" vacio`);
        }
      }

      if (row.department && !VALID_DEPTS.includes(row.department)) {
        rowErrors.push(`Departamento invalido: "${row.department}"`);
      }

      if (row.business_travel && !VALID_TRAVEL.includes(row.business_travel)) {
        rowErrors.push(`business_travel invalido: "${row.business_travel}"`);
      }

      if (row.age && (parseInt(row.age, 10) < 18 || parseInt(row.age, 10) > 70)) {
        rowErrors.push(`Edad fuera de rango (18-70): ${row.age}`);
      }

      if (rowErrors.length > 0) {
        validationErrors.push({ line, errors: rowErrors });
      } else {
        validRows.push({
          name: row.name || null,
          job_role: row.job_role,
          department: row.department,
          age: parseInt(row.age, 10),
          gender: row.gender,
          marital_status: row.marital_status || null,
          education: row.education ? parseInt(row.education, 10) : null,
          education_field: row.education_field || null,
          monthly_income: parseFloat(row.monthly_income),
          job_satisfaction: parseInt(row.job_satisfaction, 10),
          environment_satisfaction: row.environment_satisfaction ? parseInt(row.environment_satisfaction, 10) : null,
          work_life_balance: row.work_life_balance ? parseInt(row.work_life_balance, 10) : null,
          performance_rating: row.performance_rating ? parseInt(row.performance_rating, 10) : null,
          years_at_company: parseInt(row.years_at_company, 10),
          years_in_current_role: row.years_in_current_role ? parseInt(row.years_in_current_role, 10) : null,
          years_since_last_promotion: row.years_since_last_promotion ? parseInt(row.years_since_last_promotion, 10) : null,
          total_working_years: row.total_working_years ? parseInt(row.total_working_years, 10) : null,
          num_companies_worked: row.num_companies_worked ? parseInt(row.num_companies_worked, 10) : null,
          distance_from_home: row.distance_from_home ? parseInt(row.distance_from_home, 10) : null,
          overtime: row.overtime === 'yes' || row.overtime === 'Yes' || row.overtime === true,
          business_travel: row.business_travel || null,
          attrition: row.attrition === 'yes' || row.attrition === 'Yes' || row.attrition === true,
          companyId,
        });
      }
    });

    // Si hay errores de validacion, rechazar todo el lote
    if (validationErrors.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Se encontraron ${validationErrors.length} fila(s) con errores`,
        errors: validationErrors.slice(0, 50), // Limitar a 50 errores en la respuesta
      });
    }

    // Insertar en batch
    const result = await prisma.employee.createMany({ data: validRows });

    await logAction({
      tenantId:  companyId,
      userId:    req.user.id,
      action:    'EMPLOYEES_IMPORTED',
      resource:  'employees',
      ipAddress: getIp(req),
      userAgent: getUserAgent(req),
      status:    'SUCCESS',
      newValue:  { count: result.count },
    });

    res.status(201).json({
      success: true,
      message: `${result.count} empleado(s) importado(s) correctamente`,
      data: { imported: result.count },
    });
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
