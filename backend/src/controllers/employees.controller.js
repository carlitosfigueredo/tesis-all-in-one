// ─────────────────────────────────────────
// Employees Controller — CRUD con Prisma
// Modelo actualizado: variables de desercion para software PY
// Las predicciones ML se obtienen del servicio Python.
// ─────────────────────────────────────────

const prisma = require('../lib/prisma');
const { logAction }  = require('../services/audit.service');
const { getIp, getUserAgent } = require('../utils/request.utils');
const mlService = require('../services/ml.service');

// ─── Constantes de validacion ────────────────────────────────────────────────

const VALID_ROLES = ['Frontend', 'Backend', 'Fullstack', 'Mobile', 'DevOps', 'QA', 'Data'];
const VALID_SENIORITY = ['Trainee', 'Junior', 'Semi-Senior', 'Senior', 'Lead'];
const VALID_MODALIDAD = ['Presencial', 'Hibrido', 'Remoto'];
const VALID_CONTRATO = ['Indefinido', 'Plazo fijo', 'Eventual'];
const VALID_FORMACION = ['Secundaria', 'Tecnico', 'Universitario', 'Posgrado'];

const REQUIRED_FIELDS = [
  'edad', 'nivel_formacion', 'rol_tecnologico', 'seniority',
  'antiguedad_meses', 'modalidad_trabajo', 'tipo_contrato', 'salario_mensual',
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

const getCompanyFilter = (user) => {
  if (user.roleNames?.includes('SUPER_ADMIN')) return {};
  return { companyId: user.companyId };
};

/**
 * Parsea y valida una fila de datos de empleado.
 * Retorna { data, errors } donde data es el objeto listo para Prisma.
 */
const parseEmployeeRow = (row, lineNum = null) => {
  const errors = [];
  const prefix = lineNum ? `Linea ${lineNum}: ` : '';

  // Verificar campos obligatorios
  for (const field of REQUIRED_FIELDS) {
    if (row[field] === undefined || row[field] === null || row[field] === '') {
      errors.push(`${prefix}Campo obligatorio "${field}" vacio`);
    }
  }

  // Validar valores categoricos
  if (row.rol_tecnologico && !VALID_ROLES.includes(row.rol_tecnologico)) {
    errors.push(`${prefix}rol_tecnologico invalido: "${row.rol_tecnologico}". Valores: ${VALID_ROLES.join(', ')}`);
  }
  if (row.seniority && !VALID_SENIORITY.includes(row.seniority)) {
    errors.push(`${prefix}seniority invalido: "${row.seniority}". Valores: ${VALID_SENIORITY.join(', ')}`);
  }
  if (row.modalidad_trabajo && !VALID_MODALIDAD.includes(row.modalidad_trabajo)) {
    errors.push(`${prefix}modalidad_trabajo invalido: "${row.modalidad_trabajo}". Valores: ${VALID_MODALIDAD.join(', ')}`);
  }
  if (row.tipo_contrato && !VALID_CONTRATO.includes(row.tipo_contrato)) {
    errors.push(`${prefix}tipo_contrato invalido: "${row.tipo_contrato}". Valores: ${VALID_CONTRATO.join(', ')}`);
  }
  if (row.nivel_formacion && !VALID_FORMACION.includes(row.nivel_formacion)) {
    errors.push(`${prefix}nivel_formacion invalido: "${row.nivel_formacion}". Valores: ${VALID_FORMACION.join(', ')}`);
  }

  // Validar rangos numericos
  const edad = parseInt(row.edad, 10);
  if (!isNaN(edad) && (edad < 18 || edad > 65)) {
    errors.push(`${prefix}edad fuera de rango (18-65): ${row.edad}`);
  }

  const salario = parseInt(row.salario_mensual, 10);
  if (!isNaN(salario) && salario <= 0) {
    errors.push(`${prefix}salario_mensual debe ser mayor a 0`);
  }

  // Si hay errores, no construir data
  if (errors.length > 0) {
    return { data: null, errors };
  }

  // Construir objeto para Prisma
  const data = {
    edad,
    nivel_formacion: row.nivel_formacion,
    rol_tecnologico: row.rol_tecnologico,
    seniority: row.seniority,
    antiguedad_meses: parseInt(row.antiguedad_meses, 10) || 0,
    modalidad_trabajo: row.modalidad_trabajo,
    tipo_contrato: row.tipo_contrato,
    salario_mensual: salario,
    cantidad_horas_extra_mes: parseInt(row.cantidad_horas_extra_mes, 10) || 0,
    capacitacion_ultimo_anio: row.capacitacion_ultimo_anio === true
      || row.capacitacion_ultimo_anio === 'Si'
      || row.capacitacion_ultimo_anio === 'si'
      || row.capacitacion_ultimo_anio === 'true',
    evaluacion_desempeno: row.evaluacion_desempeno ? parseInt(row.evaluacion_desempeno, 10) : 3,
    cantidad_empresas_anteriores: parseInt(row.cantidad_empresas_anteriores, 10) || 0,
    // Opcionales (encuesta clima)
    satisfaccion_laboral: row.satisfaccion_laboral ? parseInt(row.satisfaccion_laboral, 10) : null,
    satisfaccion_ambiente: row.satisfaccion_ambiente ? parseInt(row.satisfaccion_ambiente, 10) : null,
    equilibrio_vida_trabajo: row.equilibrio_vida_trabajo ? parseInt(row.equilibrio_vida_trabajo, 10) : null,
    estancamiento_carrera: row.estancamiento_carrera ? parseInt(row.estancamiento_carrera, 10) : null,
    feedback_lider: row.feedback_lider ? parseInt(row.feedback_lider, 10) : null,
    // Desercion real (solo si viene en el CSV, para validacion)
    desercion_real: row.desercion === 'Si' || row.desercion === 'si' || row.desercion === true,
  };

  return { data, errors: [] };
};

// ─── GET /api/employees ───────────────────────────────────────────────────────

const getAllEmployees = async (req, res, next) => {
  try {
    const { page = '1', page_size = '20', rol_tecnologico, seniority,
            modalidad, nivel_riesgo, search, desercion, status } = req.query;

    const pg   = Math.max(1, parseInt(page, 10) || 1);
    const size = Math.min(100, Math.max(1, parseInt(page_size, 10) || 20));

    const where = { ...getCompanyFilter(req.user) };

    if (rol_tecnologico) where.rol_tecnologico = rol_tecnologico;
    if (seniority)       where.seniority = seniority;
    if (modalidad)       where.modalidad_trabajo = modalidad;
    if (nivel_riesgo)    where.nivel_riesgo = nivel_riesgo.toUpperCase();
    if (status)          where.status = status.toUpperCase();
    if (desercion !== undefined && desercion !== '') {
      where.desercion_real = desercion === 'true';
    }

    if (search) {
      where.OR = [
        { rol_tecnologico: { contains: search, mode: 'insensitive' } },
        { seniority: { contains: search, mode: 'insensitive' } },
        { nivel_formacion: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [data, total] = await Promise.all([
      prisma.employee.findMany({
        where,
        orderBy: { riesgo_desercion: 'desc' },
        skip: (pg - 1) * size,
        take: size,
      }),
      prisma.employee.count({ where }),
    ]);

    const totalPages = Math.ceil(total / size) || 1;

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

    const [total, critico, alto, medio, bajo, avgSalario, avgSatisf, byRol, bySeniority, byModalidad, desercionCount] = await Promise.all([
      prisma.employee.count({ where: companyFilter }),
      prisma.employee.count({ where: { ...companyFilter, nivel_riesgo: 'CRITICO' } }),
      prisma.employee.count({ where: { ...companyFilter, nivel_riesgo: 'ALTO' } }),
      prisma.employee.count({ where: { ...companyFilter, nivel_riesgo: 'MEDIO' } }),
      prisma.employee.count({ where: { ...companyFilter, nivel_riesgo: 'BAJO' } }),
      prisma.employee.aggregate({ where: companyFilter, _avg: { salario_mensual: true } }),
      prisma.employee.aggregate({ where: companyFilter, _avg: { satisfaccion_laboral: true } }),
      prisma.employee.groupBy({
        by: ['rol_tecnologico'],
        where: companyFilter,
        _count: { rol_tecnologico: true },
        _avg: { riesgo_desercion: true },
      }),
      prisma.employee.groupBy({
        by: ['seniority'],
        where: companyFilter,
        _count: { seniority: true },
        _avg: { riesgo_desercion: true },
      }),
      prisma.employee.groupBy({
        by: ['modalidad_trabajo'],
        where: companyFilter,
        _count: { modalidad_trabajo: true },
        _avg: { riesgo_desercion: true },
      }),
      prisma.employee.count({ where: { ...companyFilter, desercion_real: true } }),
    ]);

    const riskDistribution = [
      { name: 'Critico', value: critico, color: '#dc2626' },
      { name: 'Alto', value: alto, color: '#ef4444' },
      { name: 'Medio', value: medio, color: '#f59e0b' },
      { name: 'Bajo', value: bajo, color: '#22c55e' },
    ];

    const riesgo_por_area = byRol.map((d) => ({
      area: d.rol_tecnologico,
      count: d._count.rol_tecnologico,
      riesgo_promedio: Math.round((d._avg.riesgo_desercion ?? 0) * 100) / 100,
    }));

    const riesgo_por_seniority = bySeniority.map((d) => ({
      seniority: d.seniority,
      count: d._count.seniority,
      riesgo_promedio: Math.round((d._avg.riesgo_desercion ?? 0) * 100) / 100,
    }));

    const riesgo_por_modalidad = byModalidad.map((d) => ({
      modalidad: d.modalidad_trabajo,
      count: d._count.modalidad_trabajo,
      riesgo_promedio: Math.round((d._avg.riesgo_desercion ?? 0) * 100) / 100,
    }));

    res.json({
      success: true,
      data: {
        total,
        riesgo_critico: critico,
        riesgo_alto: alto,
        riesgo_medio: medio,
        riesgo_bajo: bajo,
        salario_promedio: Math.round(avgSalario._avg.salario_mensual ?? 0),
        satisfaccion_promedio: Math.round((avgSatisf._avg.satisfaccion_laboral ?? 0) * 100) / 100,
        tasa_desercion_real: total > 0 ? Math.round((desercionCount / total) * 100 * 10) / 10 : 0,
        risk_distribution: riskDistribution,
        riesgo_por_area,
        riesgo_por_seniority,
        riesgo_por_modalidad,
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
    const { data, errors } = parseEmployeeRow(req.body);

    if (errors.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Errores de validacion',
        errors,
      });
    }

    const companyId = req.user.roleNames?.includes('SUPER_ADMIN')
      ? (req.body.companyId || null)
      : req.user.companyId;

    // Calcular prediccion ML
    const prediction = await mlService.calcularRiesgoEmpleado({ ...data });

    const employee = await prisma.employee.create({
      data: {
        ...data,
        riesgo_desercion: prediction.riesgo_desercion,
        nivel_riesgo: prediction.nivel_riesgo,
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
      newValue:   { rol: employee.rol_tecnologico, seniority: employee.seniority },
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

    const allowedFields = [
      'edad', 'nivel_formacion', 'rol_tecnologico', 'seniority',
      'antiguedad_meses', 'modalidad_trabajo', 'tipo_contrato', 'salario_mensual',
      'cantidad_horas_extra_mes', 'capacitacion_ultimo_anio', 'evaluacion_desempeno',
      'cantidad_empresas_anteriores', 'satisfaccion_laboral', 'satisfaccion_ambiente',
      'equilibrio_vida_trabajo', 'estancamiento_carrera', 'feedback_lider', 'status',
    ];

    const updateData = {};
    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        let value = req.body[field];

        if (['edad', 'antiguedad_meses', 'salario_mensual', 'cantidad_horas_extra_mes',
             'evaluacion_desempeno', 'cantidad_empresas_anteriores', 'satisfaccion_laboral',
             'satisfaccion_ambiente', 'equilibrio_vida_trabajo', 'estancamiento_carrera',
             'feedback_lider'].includes(field)) {
          value = value !== null && value !== '' ? parseInt(value, 10) : null;
        } else if (field === 'capacitacion_ultimo_anio') {
          value = value === true || value === 'Si' || value === 'si';
        } else if (field === 'status') {
          value = value.toUpperCase();
        }

        updateData[field] = value;
      }
    }

    const updated = await prisma.employee.update({
      where: { id: existing.id },
      data: updateData,
    });

    // Recalcular prediccion con los datos actualizados
    const prediction = await mlService.calcularRiesgoEmpleado(updated);
    const final = await prisma.employee.update({
      where: { id: updated.id },
      data: {
        riesgo_desercion: prediction.riesgo_desercion,
        nivel_riesgo: prediction.nivel_riesgo,
      },
    });

    await logAction({
      tenantId:   req.user.companyId ?? null,
      userId:     req.user.id,
      action:     'EMPLOYEE_UPDATED',
      resource:   'employees',
      resourceId: final.id,
      ipAddress:  getIp(req),
      userAgent:  getUserAgent(req),
      status:     'SUCCESS',
    });

    res.json({ success: true, data: final });
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

    const companyId = req.user.roleNames?.includes('SUPER_ADMIN')
      ? (req.body.companyId || null)
      : req.user.companyId;

    const validationErrors = [];
    const validRows = [];

    rows.forEach((row, idx) => {
      const lineNum = idx + 2; // +2 porque linea 1 es header
      const { data, errors } = parseEmployeeRow(row, lineNum);

      if (errors.length > 0) {
        validationErrors.push({ line: lineNum, errors });
      } else {
        validRows.push({ ...data, companyId });
      }
    });

    // Si hay errores, rechazar el lote
    if (validationErrors.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Se encontraron ${validationErrors.length} fila(s) con errores`,
        errors: validationErrors.slice(0, 50),
      });
    }

    // Calcular predicciones ML en batch
    const predictions = await mlService.calcularRiesgoBatch(validRows);

    // Agregar riesgo a cada fila
    const rowsWithPredictions = validRows.map((row, i) => ({
      ...row,
      riesgo_desercion: predictions[i].riesgo_desercion,
      nivel_riesgo: predictions[i].nivel_riesgo,
    }));

    // Insertar en batch
    const result = await prisma.employee.createMany({ data: rowsWithPredictions });

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
      message: `${result.count} empleado(s) importado(s) correctamente con prediccion de riesgo`,
      data: { imported: result.count },
    });
  } catch (error) {
    next(error);
  }
};

// ─── POST /api/employees/recalculate ──────────────────────────────────────────

/**
 * Recalcula las predicciones ML para todos los empleados de la empresa.
 * Util despues de re-entrenar el modelo o actualizar datos de encuesta clima.
 */
const recalculateRisk = async (req, res, next) => {
  try {
    const companyFilter = getCompanyFilter(req.user);
    const employees = await prisma.employee.findMany({ where: companyFilter });

    if (employees.length === 0) {
      return res.json({ success: true, message: 'No hay empleados para recalcular', data: { updated: 0 } });
    }

    // Predecir en batch
    const predictions = await mlService.calcularRiesgoBatch(employees);

    // Actualizar cada empleado con su nueva prediccion
    let updated = 0;
    for (let i = 0; i < employees.length; i++) {
      await prisma.employee.update({
        where: { id: employees[i].id },
        data: {
          riesgo_desercion: predictions[i].riesgo_desercion,
          nivel_riesgo: predictions[i].nivel_riesgo,
        },
      });
      updated++;
    }

    await logAction({
      tenantId:  req.user.companyId ?? null,
      userId:    req.user.id,
      action:    'PREDICTIONS_RECALCULATED',
      resource:  'employees',
      ipAddress: getIp(req),
      userAgent: getUserAgent(req),
      status:    'SUCCESS',
      newValue:  { updated },
    });

    res.json({
      success: true,
      message: `Predicciones recalculadas para ${updated} empleado(s)`,
      data: { updated },
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
  recalculateRisk,
};
