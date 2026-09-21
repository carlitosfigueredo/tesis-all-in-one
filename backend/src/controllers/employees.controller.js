// ─────────────────────────────────────────
// Employees Controller — CRUD con Prisma
// Modelo actualizado: variables de desercion para software PY
// Las predicciones ML se obtienen del servicio Python.
// ─────────────────────────────────────────

const prisma = require('../lib/prisma');
const { logAction }  = require('../services/audit.service');
const { getIp, getUserAgent } = require('../utils/request.utils');
const mlService = require('../services/ml.service');
const { evaluateRecalcPolicy } = require('../services/recalcPolicy.service');
const { processCompany } = require('../services/autoRetention.service');

// ─── Constantes de validacion ────────────────────────────────────────────────

const VALID_ROLES = ['Frontend', 'Backend', 'Fullstack', 'Mobile', 'DevOps', 'QA', 'Data'];
const VALID_SENIORITY = ['Trainee', 'Junior', 'Semi-Senior', 'Senior', 'Lead'];
const VALID_MODALIDAD = ['Presencial', 'Hibrido', 'Remoto'];
const VALID_CONTRATO = ['Indefinido', 'Plazo fijo', 'Eventual'];
const VALID_FORMACION = ['Secundaria', 'Tecnico', 'Universitario', 'Posgrado'];

const REQUIRED_FIELDS = [
  'codigo_empleado', 'nombre', 'apellido',
  'edad', 'nivel_formacion', 'rol_tecnologico', 'seniority',
  'antiguedad_meses', 'modalidad_trabajo', 'tipo_contrato', 'salario_mensual',
];

// Umbral de seguridad para bajas masivas: si un import daria de baja a MAS
// de este porcentaje de los empleados activos, se exige confirmacion explicita
// (protege contra subir un CSV parcial por error).
const BULK_DEACTIVATION_THRESHOLD = 0.30; // 30%

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
    codigo_empleado: String(row.codigo_empleado).trim(),
    nombre: String(row.nombre).trim(),
    apellido: String(row.apellido).trim(),
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

// ─── GET /api/employees/:id/history ───────────────────────────────────────────

/**
 * Devuelve el historial de riesgo de un empleado (snapshots ordenados por fecha),
 * para graficar como evoluciono su probabilidad de desercion en el tiempo.
 */
const getEmployeeHistory = async (req, res, next) => {
  try {
    // Verificar que el empleado pertenezca a la empresa del usuario (tenant)
    const where = { id: req.params.id, ...getCompanyFilter(req.user) };
    const employee = await prisma.employee.findFirst({ where, select: { id: true } });

    if (!employee) {
      return res.status(404).json({ success: false, message: 'Empleado no encontrado' });
    }

    const snapshots = await prisma.riskSnapshot.findMany({
      where: { employeeId: employee.id },
      orderBy: { createdAt: 'asc' },
      select: { riesgo_desercion: true, nivel_riesgo: true, createdAt: true },
    });

    res.json({ success: true, data: snapshots });
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
        message: 'Errores de validación',
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

    // Primer snapshot de riesgo (historial)
    await prisma.riskSnapshot.create({
      data: {
        employeeId: employee.id,
        riesgo_desercion: employee.riesgo_desercion,
        nivel_riesgo: employee.nivel_riesgo,
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

    // Snapshot del riesgo recalculado (historial)
    await prisma.riskSnapshot.create({
      data: {
        employeeId: final.id,
        riesgo_desercion: final.riesgo_desercion,
        nivel_riesgo: final.nivel_riesgo,
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
      return res.status(400).json({ success: false, message: 'El límite por importación es de 5000 filas' });
    }

    const companyId = req.user.roleNames?.includes('SUPER_ADMIN')
      ? (req.body.companyId || null)
      : req.user.companyId;

    const validationErrors = [];
    const validRows = [];
    const codigosVistos = new Map(); // codigo_empleado -> lineNum (para detectar duplicados en el CSV)

    rows.forEach((row, idx) => {
      const lineNum = idx + 2; // +2 porque linea 1 es header
      const { data, errors } = parseEmployeeRow(row, lineNum);

      if (errors.length > 0) {
        validationErrors.push({ line: lineNum, errors });
        return;
      }

      // Un mismo codigo no puede repetirse dentro del mismo archivo:
      // no sabriamos cual de las dos filas es la version correcta.
      const codigo = data.codigo_empleado;
      if (codigosVistos.has(codigo)) {
        validationErrors.push({
          line: lineNum,
          errors: [`Linea ${lineNum}: codigo_empleado "${codigo}" duplicado (ya aparece en la linea ${codigosVistos.get(codigo)})`],
        });
        return;
      }
      codigosVistos.set(codigo, lineNum);
      validRows.push({ ...data, companyId });
    });

    // Si hay errores, rechazar el lote
    if (validationErrors.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Se encontraron ${validationErrors.length} fila(s) con errores`,
        errors: validationErrors.slice(0, 50),
      });
    }

    // ── Política de recálculo según el plan ───────────────────────────────────
    // Los datos SIEMPRE se importan y se acumula historial. Pero el RIESGO solo se
    // recalcula con la frecuencia del plan (Estándar mensual / Profesional semanal /
    // Corporativo bajo demanda). Si no toca recalcular, se importan los datos pero
    // se conserva el riesgo previo del empleado (los nuevos quedan "pendientes").
    const isSuperAdmin = req.user.roleNames?.includes('SUPER_ADMIN');
    const company = companyId
      ? await prisma.company.findUnique({
          where: { id: companyId },
          select: { plan: true, lastRecalculatedAt: true },
        })
      : null;

    const policy = evaluateRecalcPolicy({
      plan: company?.plan ?? 'BASICO',
      lastRecalculatedAt: company?.lastRecalculatedAt ?? null,
      isSuperAdmin,
    });

    // Solo llamamos al modelo ML si la ventana del plan lo permite.
    let predictions = null;
    if (policy.canRecalculate) {
      predictions = await mlService.calcularRiesgoBatch(validRows);
    }

    const codigosDelCsv = validRows.map((r) => r.codigo_empleado);

    // Opciones de baja (llegan del frontend):
    //  - deactivateAbsent: el usuario opto por dar de baja a los ausentes (checkbox)
    //  - confirmDeactivation: el usuario ya confirmo una baja masiva que supero el umbral
    const deactivateAbsent   = req.body.deactivateAbsent === true;
    const confirmDeactivation = req.body.confirmDeactivation === true;

    // ── Upsert por (companyId, codigo_empleado) + snapshots ──
    // El upsert de datos SIEMPRE se aplica. El riesgo solo se actualiza (y se crea
    // snapshot) si la política del plan permitió recalcular en esta importación.
    let creados = 0;
    let actualizados = 0;
    const savedEmployees = [];

    await prisma.$transaction(async (tx) => {
      for (let i = 0; i < validRows.length; i++) {
        const { codigo_empleado, ...rest } = validRows[i];
        const pred = predictions ? predictions[i] : null;

        const existing = await tx.employee.findFirst({
          where: { companyId, codigo_empleado },
          select: { id: true },
        });

        // Campos de riesgo a escribir:
        //  - si recalculamos → usamos la predicción nueva
        //  - si NO recalculamos → conservamos el riesgo previo (empleado existente)
        //    o dejamos el default (0/BAJO) para uno nuevo, que quedará "pendiente".
        const riskData = pred
          ? { riesgo_desercion: pred.riesgo_desercion, nivel_riesgo: pred.nivel_riesgo }
          : {};

        let saved;
        if (existing) {
          saved = await tx.employee.update({
            where: { id: existing.id },
            data: { ...rest, codigo_empleado, status: 'ACTIVE', ...riskData },
          });
          actualizados += 1;
        } else {
          saved = await tx.employee.create({
            data: { ...rest, codigo_empleado, companyId, status: 'ACTIVE', ...riskData },
          });
          creados += 1;
        }

        // Snapshot solo cuando hubo recálculo real (evita puntos falsos en el historial).
        if (pred) {
          await tx.riskSnapshot.create({
            data: {
              employeeId: saved.id,
              riesgo_desercion: saved.riesgo_desercion,
              nivel_riesgo: saved.nivel_riesgo,
            },
          });
        }

        savedEmployees.push(saved);
      }

      // Si recalculamos, registrar el momento para respetar la ventana del plan.
      if (policy.canRecalculate && companyId) {
        await tx.company.update({
          where: { id: companyId },
          data: { lastRecalculatedAt: new Date() },
        });
      }
    });

    // ── Generación automática de estrategias + alerta por correo ──────────────
    // Solo si hubo recálculo real (los niveles de riesgo están actualizados).
    // No bloquea la respuesta al usuario si algo falla.
    if (policy.canRecalculate && companyId) {
      processCompany(companyId, { assignedToUserId: req.user.id, notify: true })
        .catch((e) => console.error('[AutoRetention] Error tras importación:', e.message));
    }

    // ── Manejo de bajas (empleados activos que NO vinieron en el CSV) ──
    let dadosDeBaja = 0;
    let bajasPendientes = [];          // lista para preview (cuando no se aplican todavia)
    let needsConfirmation = false;     // true si supera el umbral y falta confirmar

    if (deactivateAbsent) {
      // ¿Quienes quedarian de baja? (activos que no estan en el CSV)
      const ausentes = await prisma.employee.findMany({
        where: {
          companyId,
          status: 'ACTIVE',
          codigo_empleado: { notIn: codigosDelCsv },
        },
        select: { id: true, codigo_empleado: true, nombre: true, apellido: true, rol_tecnologico: true, seniority: true },
      });

      // Base para el umbral: cuantos empleados activos hay en total ahora.
      const totalActivos = await prisma.employee.count({ where: { companyId, status: 'ACTIVE' } });
      const proporcion = totalActivos > 0 ? ausentes.length / totalActivos : 0;
      const superaUmbral = proporcion > BULK_DEACTIVATION_THRESHOLD;

      if (ausentes.length > 0 && superaUmbral && !confirmDeactivation) {
        // Baja masiva sin confirmar: NO aplicar, pedir confirmacion mostrando a quienes afecta.
        needsConfirmation = true;
        bajasPendientes = ausentes;
      } else if (ausentes.length > 0) {
        // Dentro del umbral, o ya confirmado: aplicar bajas.
        const baja = await prisma.employee.updateMany({
          where: { id: { in: ausentes.map((a) => a.id) } },
          data: { status: 'INACTIVE' },
        });
        dadosDeBaja = baja.count;
      }
    }

    await logAction({
      tenantId:  companyId,
      userId:    req.user.id,
      action:    'EMPLOYEES_IMPORTED',
      resource:  'employees',
      ipAddress: getIp(req),
      userAgent: getUserAgent(req),
      status:    'SUCCESS',
      newValue:  { creados, actualizados, dadosDeBaja, bajasPendientes: bajasPendientes.length },
    });

    // Resumen de riesgo del lote recien importado (para la pantalla de resultados).
    const summary = { total: savedEmployees.length, critico: 0, alto: 0, medio: 0, bajo: 0 };
    for (const emp of savedEmployees) {
      const nivel = emp.nivel_riesgo ?? 'BAJO';
      if (nivel === 'CRITICO') summary.critico += 1;
      else if (nivel === 'ALTO') summary.alto += 1;
      else if (nivel === 'MEDIO') summary.medio += 1;
      else summary.bajo += 1;
    }

    // Devolvemos los empleados con su prediccion para que el frontend pueda
    // explicar el "por que" de cada caso. Limitamos el payload a 500 registros.
    const employees = savedEmployees.slice(0, 500);

    const partes = [];
    if (creados) partes.push(`${creados} nuevo(s)`);
    if (actualizados) partes.push(`${actualizados} actualizado(s)`);
    if (dadosDeBaja) partes.push(`${dadosDeBaja} dado(s) de baja`);
    if (needsConfirmation) partes.push(`${bajasPendientes.length} baja(s) pendiente(s) de confirmar`);
    const resumenTexto = partes.length ? partes.join(', ') : 'sin cambios';

    res.status(201).json({
      success: true,
      message: `Importación completada: ${resumenTexto}.`,
      data: {
        creados,
        actualizados,
        dadosDeBaja,
        summary,
        employees,
        // Preview de bajas que superan el umbral y requieren confirmacion explicita.
        needsConfirmation,
        bajasPendientes,
        umbralPorcentaje: Math.round(BULK_DEACTIVATION_THRESHOLD * 100),
        // Estado del recálculo según el plan (para que el frontend lo explique).
        recalculo: {
          aplicado: policy.canRecalculate,
          frecuencia: policy.frecuencia,
          proximaFecha: policy.nextAvailableAt,
          diasParaProxima: policy.daysUntilNext,
          motivo: policy.reason,
        },
      },
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
    const isSuperAdmin = req.user.roleNames?.includes('SUPER_ADMIN');
    const companyId = req.user.companyId;

    // ── Política de recálculo según el plan ───────────────────────────────────
    // Bloquea el recálculo manual si aún no pasó la ventana del plan.
    if (!isSuperAdmin && companyId) {
      const company = await prisma.company.findUnique({
        where: { id: companyId },
        select: { plan: true, lastRecalculatedAt: true },
      });
      const policy = evaluateRecalcPolicy({
        plan: company?.plan ?? 'BASICO',
        lastRecalculatedAt: company?.lastRecalculatedAt ?? null,
        isSuperAdmin,
      });
      if (!policy.canRecalculate) {
        return res.status(429).json({
          success: false,
          message: policy.reason,
          code: 'RECALC_NOT_AVAILABLE',
          data: {
            frecuencia: policy.frecuencia,
            proximaFecha: policy.nextAvailableAt,
            diasParaProxima: policy.daysUntilNext,
          },
        });
      }
    }

    const companyFilter = getCompanyFilter(req.user);
    const employees = await prisma.employee.findMany({ where: companyFilter });

    if (employees.length === 0) {
      return res.json({ success: true, message: 'No hay empleados para recalcular', data: { updated: 0 } });
    }

    // Predecir en batch
    const predictions = await mlService.calcularRiesgoBatch(employees);

    // Actualizar cada empleado con su nueva prediccion + snapshot al historial
    let updated = 0;
    for (let i = 0; i < employees.length; i++) {
      const emp = await prisma.employee.update({
        where: { id: employees[i].id },
        data: {
          riesgo_desercion: predictions[i].riesgo_desercion,
          nivel_riesgo: predictions[i].nivel_riesgo,
        },
      });
      await prisma.riskSnapshot.create({
        data: {
          employeeId: emp.id,
          riesgo_desercion: emp.riesgo_desercion,
          nivel_riesgo: emp.nivel_riesgo,
        },
      });
      updated++;
    }

    // Registrar el momento del recálculo para respetar la ventana del plan.
    if (companyId) {
      await prisma.company.update({
        where: { id: companyId },
        data: { lastRecalculatedAt: new Date() },
      });
    }

    // ── Generación automática de estrategias + alerta por correo ──────────────
    // Con los niveles de riesgo ya actualizados. No bloquea la respuesta.
    if (companyId) {
      processCompany(companyId, { assignedToUserId: req.user.id, notify: true })
        .catch((e) => console.error('[AutoRetention] Error tras recálculo:', e.message));
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

// ─── POST /api/employees/deactivate-absent ────────────────────────────────────

/**
 * Segundo paso del flujo de bajas: aplica las bajas que el usuario confirmo
 * despues de superar el umbral de seguridad. Recibe la lista de codigos a dar
 * de baja y los marca INACTIVE (solo dentro de la empresa del usuario).
 */
const deactivateAbsentEmployees = async (req, res, next) => {
  try {
    const { codigos } = req.body;

    if (!Array.isArray(codigos) || codigos.length === 0) {
      return res.status(400).json({ success: false, message: 'No se recibieron empleados para dar de baja' });
    }

    const companyId = req.user.roleNames?.includes('SUPER_ADMIN')
      ? (req.body.companyId || null)
      : req.user.companyId;

    // Solo se dan de baja empleados ACTIVOS de la empresa cuyos codigos fueron enviados.
    const baja = await prisma.employee.updateMany({
      where: {
        companyId,
        status: 'ACTIVE',
        codigo_empleado: { in: codigos },
      },
      data: { status: 'INACTIVE' },
    });

    await logAction({
      tenantId:  companyId,
      userId:    req.user.id,
      action:    'EMPLOYEES_DEACTIVATED',
      resource:  'employees',
      ipAddress: getIp(req),
      userAgent: getUserAgent(req),
      status:    'SUCCESS',
      newValue:  { dadosDeBaja: baja.count },
    });

    res.json({
      success: true,
      message: `${baja.count} empleado(s) dado(s) de baja`,
      data: { dadosDeBaja: baja.count },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAllEmployees,
  getEmployeeById,
  getEmployeeHistory,
  getEmployeesStats,
  createEmployee,
  updateEmployee,
  deleteEmployee,
  importEmployees,
  recalculateRisk,
  deactivateAbsentEmployees,
};
