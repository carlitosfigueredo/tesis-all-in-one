/**
 * reportData.service.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Reúne los datos que alimentan los reportes (PDF/Excel). Un único punto que
 * consulta la base y devuelve un objeto estructurado, para que los generadores
 * de PDF y Excel compartan exactamente la misma información.
 *
 * Todo es multi-tenant: se filtra por la empresa del usuario (o todas, si es
 * SUPER_ADMIN).
 */

const prisma = require('../lib/prisma');

const getCompanyFilter = (user) => {
  if (user.roleNames?.includes('SUPER_ADMIN')) return {};
  return { companyId: user.companyId };
};

/**
 * Arma el dataset completo del reporte de retención de talento.
 *
 * @param {object} user - req.user
 * @returns {Promise<object>} datos estructurados del reporte
 */
const buildRetentionReport = async (user) => {
  const companyFilter = getCompanyFilter(user);

  const [
    total, critico, alto, medio, bajo,
    avgSalario, avgRiesgo, desercionCount,
    byRol, bySeniority, byModalidad,
    topRiesgo,
    estrategiasPorEstado,
  ] = await Promise.all([
    prisma.employee.count({ where: companyFilter }),
    prisma.employee.count({ where: { ...companyFilter, nivel_riesgo: 'CRITICO' } }),
    prisma.employee.count({ where: { ...companyFilter, nivel_riesgo: 'ALTO' } }),
    prisma.employee.count({ where: { ...companyFilter, nivel_riesgo: 'MEDIO' } }),
    prisma.employee.count({ where: { ...companyFilter, nivel_riesgo: 'BAJO' } }),
    prisma.employee.aggregate({ where: companyFilter, _avg: { salario_mensual: true } }),
    prisma.employee.aggregate({ where: companyFilter, _avg: { riesgo_desercion: true } }),
    prisma.employee.count({ where: { ...companyFilter, desercion_real: true } }),
    prisma.employee.groupBy({
      by: ['rol_tecnologico'], where: companyFilter,
      _count: { rol_tecnologico: true }, _avg: { riesgo_desercion: true },
    }),
    prisma.employee.groupBy({
      by: ['seniority'], where: companyFilter,
      _count: { seniority: true }, _avg: { riesgo_desercion: true },
    }),
    prisma.employee.groupBy({
      by: ['modalidad_trabajo'], where: companyFilter,
      _count: { modalidad_trabajo: true }, _avg: { riesgo_desercion: true },
    }),
    // Top empleados por riesgo (para la sección de foco).
    prisma.employee.findMany({
      where: companyFilter,
      orderBy: { riesgo_desercion: 'desc' },
      take: 20,
      select: {
        codigo_empleado: true, nombre: true, apellido: true,
        rol_tecnologico: true, seniority: true,
        riesgo_desercion: true, nivel_riesgo: true,
      },
    }),
    prisma.retentionStrategy.groupBy({
      by: ['estado'], where: companyFilter, _count: { estado: true },
    }),
  ]);

  const estrategias = { SUGERIDA: 0, EN_CURSO: 0, COMPLETADA: 0, DESCARTADA: 0 };
  for (const g of estrategiasPorEstado) estrategias[g.estado] = g._count.estado;

  return {
    empresa: user.companyName ?? 'Todas las empresas',
    generadoEn: new Date(),
    generadoPor: user.name ?? user.email ?? '—',
    resumen: {
      total,
      criticos: critico,
      altos: alto,
      medios: medio,
      bajos: bajo,
      en_riesgo: critico + alto,
      salario_promedio: Math.round(avgSalario._avg.salario_mensual ?? 0),
      riesgo_promedio: Math.round((avgRiesgo._avg.riesgo_desercion ?? 0) * 1000) / 10, // %
      tasa_desercion_real: total > 0 ? Math.round((desercionCount / total) * 1000) / 10 : 0,
    },
    por_rol: byRol.map((d) => ({
      grupo: d.rol_tecnologico,
      count: d._count.rol_tecnologico,
      riesgo_promedio: Math.round((d._avg.riesgo_desercion ?? 0) * 1000) / 10,
    })),
    por_seniority: bySeniority.map((d) => ({
      grupo: d.seniority,
      count: d._count.seniority,
      riesgo_promedio: Math.round((d._avg.riesgo_desercion ?? 0) * 1000) / 10,
    })),
    por_modalidad: byModalidad.map((d) => ({
      grupo: d.modalidad_trabajo,
      count: d._count.modalidad_trabajo,
      riesgo_promedio: Math.round((d._avg.riesgo_desercion ?? 0) * 1000) / 10,
    })),
    top_riesgo: topRiesgo.map((e) => ({
      codigo: e.codigo_empleado,
      nombre: `${e.nombre} ${e.apellido}`,
      rol: e.rol_tecnologico,
      seniority: e.seniority,
      riesgo_pct: Math.round((e.riesgo_desercion ?? 0) * 1000) / 10,
      nivel: e.nivel_riesgo,
    })),
    estrategias,
  };
};

module.exports = { buildRetentionReport };
