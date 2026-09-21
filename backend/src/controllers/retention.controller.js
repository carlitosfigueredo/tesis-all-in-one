// ─────────────────────────────────────────
// Retention Controller — Estrategias de retención
// Genera, lista y gestiona el ciclo de vida de las acciones de retención
// sugeridas para cada empleado en riesgo.
// ─────────────────────────────────────────

const prisma = require('../lib/prisma');
const { logAction } = require('../services/audit.service');
const { getIp, getUserAgent } = require('../utils/request.utils');
const { generarEstrategias } = require('../services/retentionFactors');

const VALID_ESTADOS = ['SUGERIDA', 'EN_CURSO', 'COMPLETADA', 'DESCARTADA'];

// Filtro multi-tenant: SUPER_ADMIN ve todo; el resto solo su empresa.
const getCompanyFilter = (user) => {
  if (user.roleNames?.includes('SUPER_ADMIN')) return {};
  return { companyId: user.companyId };
};

// ─── GET /api/retention/strategies ─────────────────────────────────────────────
// Lista las estrategias de la empresa, con filtros opcionales por estado,
// prioridad y empleado. Incluye datos básicos del empleado para la UI.

const listStrategies = async (req, res, next) => {
  try {
    const { estado, prioridad, employeeId, page = '1', page_size = '50' } = req.query;

    const pg = Math.max(1, parseInt(page, 10) || 1);
    const size = Math.min(200, Math.max(1, parseInt(page_size, 10) || 50));

    const where = { ...getCompanyFilter(req.user) };
    if (estado) where.estado = estado.toUpperCase();
    if (prioridad) where.prioridad = prioridad.toUpperCase();
    if (employeeId) where.employeeId = employeeId;

    const [data, total] = await Promise.all([
      prisma.retentionStrategy.findMany({
        where,
        orderBy: [{ estado: 'asc' }, { createdAt: 'desc' }],
        skip: (pg - 1) * size,
        take: size,
        include: {
          employee: {
            select: {
              id: true, codigo_empleado: true, nombre: true, apellido: true,
              rol_tecnologico: true, seniority: true,
              riesgo_desercion: true, nivel_riesgo: true,
            },
          },
        },
      }),
      prisma.retentionStrategy.count({ where }),
    ]);

    res.json({
      success: true,
      data,
      total,
      page: pg,
      page_size: size,
      total_pages: Math.ceil(total / size) || 1,
    });
  } catch (error) {
    next(error);
  }
};

// ─── GET /api/retention/strategies/summary ─────────────────────────────────────
// Conteos por estado/prioridad para tarjetas de resumen.

const strategiesSummary = async (req, res, next) => {
  try {
    const companyFilter = getCompanyFilter(req.user);

    const [total, sugeridas, enCurso, completadas, descartadas, criticas] = await Promise.all([
      prisma.retentionStrategy.count({ where: companyFilter }),
      prisma.retentionStrategy.count({ where: { ...companyFilter, estado: 'SUGERIDA' } }),
      prisma.retentionStrategy.count({ where: { ...companyFilter, estado: 'EN_CURSO' } }),
      prisma.retentionStrategy.count({ where: { ...companyFilter, estado: 'COMPLETADA' } }),
      prisma.retentionStrategy.count({ where: { ...companyFilter, estado: 'DESCARTADA' } }),
      prisma.retentionStrategy.count({
        where: { ...companyFilter, prioridad: 'CRITICA', estado: { in: ['SUGERIDA', 'EN_CURSO'] } },
      }),
    ]);

    res.json({
      success: true,
      data: { total, sugeridas, en_curso: enCurso, completadas, descartadas, criticas_pendientes: criticas },
    });
  } catch (error) {
    next(error);
  }
};

// ─── GET /api/retention/employees/:employeeId/strategies ────────────────────────
// Estrategias ya guardadas de un empleado.

const listEmployeeStrategies = async (req, res, next) => {
  try {
    const { employeeId } = req.params;
    const employee = await prisma.employee.findFirst({
      where: { id: employeeId, ...getCompanyFilter(req.user) },
      select: { id: true },
    });
    if (!employee) {
      return res.status(404).json({ success: false, message: 'Empleado no encontrado' });
    }

    const data = await prisma.retentionStrategy.findMany({
      where: { employeeId },
      orderBy: [{ estado: 'asc' }, { createdAt: 'desc' }],
    });

    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

// ─── POST /api/retention/employees/:employeeId/generate ─────────────────────────
// Genera estrategias a partir de los factores de riesgo ACTUALES del empleado.
// No duplica: solo agrega estrategias para factores que aún no tienen una
// estrategia activa (SUGERIDA o EN_CURSO).

const generateForEmployee = async (req, res, next) => {
  try {
    const { employeeId } = req.params;
    const employee = await prisma.employee.findFirst({
      where: { id: employeeId, ...getCompanyFilter(req.user) },
    });
    if (!employee) {
      return res.status(404).json({ success: false, message: 'Empleado no encontrado' });
    }

    const sugeridas = generarEstrategias(employee);

    // Evitar duplicados: factores que ya tienen una estrategia activa.
    const activas = await prisma.retentionStrategy.findMany({
      where: { employeeId, estado: { in: ['SUGERIDA', 'EN_CURSO'] } },
      select: { factorKey: true },
    });
    const factoresActivos = new Set(activas.map((a) => a.factorKey));

    const nuevas = sugeridas.filter((s) => !factoresActivos.has(s.factorKey));

    if (nuevas.length === 0) {
      return res.json({
        success: true,
        message: 'No hay estrategias nuevas para generar; las sugeridas ya están registradas.',
        data: [],
      });
    }

    const created = await prisma.$transaction(
      nuevas.map((s) =>
        prisma.retentionStrategy.create({
          data: {
            factorKey: s.factorKey,
            titulo: s.titulo,
            descripcion: s.descripcion,
            motivo: s.motivo,
            prioridad: s.prioridad,
            estado: 'SUGERIDA',
            nivelRiesgoAlGenerar: employee.nivel_riesgo,
            employeeId,
            companyId: employee.companyId,
            assignedToUserId: req.user.id,
          },
        })
      )
    );

    await logAction({
      tenantId: employee.companyId ?? null,
      userId: req.user.id,
      action: 'RETENTION_STRATEGIES_GENERATED',
      resource: 'retention',
      resourceId: employeeId,
      ipAddress: getIp(req),
      userAgent: getUserAgent(req),
      status: 'SUCCESS',
      newValue: { generadas: created.length },
    });

    res.status(201).json({
      success: true,
      message: `${created.length} estrategia(s) generada(s).`,
      data: created,
    });
  } catch (error) {
    next(error);
  }
};

// ─── PATCH /api/retention/strategies/:id ────────────────────────────────────────
// Actualiza estado y/o notas de una estrategia (seguimiento).

const updateStrategy = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { estado, notas, prioridad } = req.body;

    const existing = await prisma.retentionStrategy.findFirst({
      where: { id, ...getCompanyFilter(req.user) },
    });
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Estrategia no encontrada' });
    }

    const data = {};
    if (estado !== undefined) {
      const up = String(estado).toUpperCase();
      if (!VALID_ESTADOS.includes(up)) {
        return res.status(400).json({ success: false, message: `Estado inválido. Válidos: ${VALID_ESTADOS.join(', ')}` });
      }
      data.estado = up;
      // Marcar/limpiar fecha de completado según el estado.
      data.completedAt = up === 'COMPLETADA' ? new Date() : null;
    }
    if (notas !== undefined) data.notas = notas === null ? null : String(notas);
    if (prioridad !== undefined) data.prioridad = String(prioridad).toUpperCase();

    if (Object.keys(data).length === 0) {
      return res.status(400).json({ success: false, message: 'No hay cambios para aplicar.' });
    }

    const updated = await prisma.retentionStrategy.update({ where: { id: existing.id }, data });

    await logAction({
      tenantId: existing.companyId ?? null,
      userId: req.user.id,
      action: 'RETENTION_STRATEGY_UPDATED',
      resource: 'retention',
      resourceId: existing.id,
      ipAddress: getIp(req),
      userAgent: getUserAgent(req),
      status: 'SUCCESS',
      oldValue: { estado: existing.estado },
      newValue: { estado: updated.estado },
    });

    res.json({ success: true, data: updated });
  } catch (error) {
    next(error);
  }
};

// ─── DELETE /api/retention/strategies/:id ───────────────────────────────────────

const deleteStrategy = async (req, res, next) => {
  try {
    const { id } = req.params;
    const existing = await prisma.retentionStrategy.findFirst({
      where: { id, ...getCompanyFilter(req.user) },
    });
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Estrategia no encontrada' });
    }

    await prisma.retentionStrategy.delete({ where: { id: existing.id } });

    await logAction({
      tenantId: existing.companyId ?? null,
      userId: req.user.id,
      action: 'RETENTION_STRATEGY_DELETED',
      resource: 'retention',
      resourceId: existing.id,
      ipAddress: getIp(req),
      userAgent: getUserAgent(req),
      status: 'SUCCESS',
    });

    res.json({ success: true, message: 'Estrategia eliminada.' });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  listStrategies,
  strategiesSummary,
  listEmployeeStrategies,
  generateForEmployee,
  updateStrategy,
  deleteStrategy,
};
