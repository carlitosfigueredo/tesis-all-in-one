/**
 * autoRetention.service.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Generación AUTOMÁTICA de estrategias de retención + notificación por correo.
 *
 * Se dispara en dos momentos:
 *  1. En cada recálculo de riesgo (importación / recálculo manual).
 *  2. En un job programado semanal (retentionScan.job).
 *
 * Regla: para cada empleado en riesgo ALTO o CRÍTICO de la empresa, genera las
 * estrategias sugeridas a partir de sus factores de riesgo reales, SIN duplicar
 * las que ya tenga activas (SUGERIDA / EN_CURSO). Si se crearon estrategias
 * nuevas, envía UN correo resumen a los COMPANY_ADMIN de la empresa (no un correo
 * por empleado, para no saturar).
 */

const prisma = require('../lib/prisma');
const { generarEstrategias } = require('./retentionFactors');
const { sendRetentionAlertEmail } = require('./email.service');

// Niveles que disparan generación automática + alerta.
const NIVELES_ALERTA = ['ALTO', 'CRITICO'];

/**
 * Genera (persistiendo) las estrategias faltantes para un empleado en riesgo.
 * No duplica: omite factores que ya tienen una estrategia activa.
 *
 * @param {object} tx - cliente Prisma (o transacción)
 * @param {object} emp - empleado (con campos de features + nivel_riesgo + companyId)
 * @param {string|null} assignedToUserId
 * @returns {Promise<number>} cantidad de estrategias creadas
 */
const generarParaEmpleado = async (tx, emp, assignedToUserId = null) => {
  const sugeridas = generarEstrategias(emp);

  const activas = await tx.retentionStrategy.findMany({
    where: { employeeId: emp.id, estado: { in: ['SUGERIDA', 'EN_CURSO'] } },
    select: { factorKey: true },
  });
  const factoresActivos = new Set(activas.map((a) => a.factorKey));
  const nuevas = sugeridas.filter((s) => !factoresActivos.has(s.factorKey));

  if (nuevas.length === 0) return 0;

  await tx.retentionStrategy.createMany({
    data: nuevas.map((s) => ({
      factorKey: s.factorKey,
      titulo: s.titulo,
      descripcion: s.descripcion,
      motivo: s.motivo,
      prioridad: s.prioridad,
      estado: 'SUGERIDA',
      nivelRiesgoAlGenerar: emp.nivel_riesgo,
      employeeId: emp.id,
      companyId: emp.companyId,
      assignedToUserId,
    })),
  });

  return nuevas.length;
};

/**
 * Busca los correos de los COMPANY_ADMIN activos de una empresa.
 * @returns {Promise<Array<{name, email}>>}
 */
const getCompanyAdmins = async (companyId) => {
  if (!companyId) return [];
  const admins = await prisma.user.findMany({
    where: {
      companyId,
      active: true,
      userRoles: { some: { role: { name: 'COMPANY_ADMIN' } } },
    },
    select: { name: true, email: true },
  });
  return admins;
};

/**
 * Procesa una empresa: genera estrategias para sus empleados en riesgo
 * ALTO/CRÍTICO y, si hubo novedades, notifica por correo a los admins.
 *
 * @param {string} companyId
 * @param {object} [opts]
 * @param {string|null} [opts.assignedToUserId] - usuario que originó el recálculo (si aplica)
 * @param {boolean} [opts.notify=true] - enviar correo si hay estrategias nuevas
 * @returns {Promise<{empleadosEnRiesgo:number, estrategiasCreadas:number, empleadosConNuevas:number, notificado:boolean}>}
 */
const processCompany = async (companyId, opts = {}) => {
  const { assignedToUserId = null, notify = true } = opts;

  const enRiesgo = await prisma.employee.findMany({
    where: { companyId, status: 'ACTIVE', nivel_riesgo: { in: NIVELES_ALERTA } },
  });

  const resultado = {
    empleadosEnRiesgo: enRiesgo.length,
    estrategiasCreadas: 0,
    empleadosConNuevas: 0,
    notificado: false,
  };

  if (enRiesgo.length === 0) return resultado;

  // Empleados que efectivamente recibieron estrategias nuevas (para el correo).
  const conNuevas = [];
  for (const emp of enRiesgo) {
    const creadas = await generarParaEmpleado(prisma, emp, assignedToUserId);
    if (creadas > 0) {
      resultado.estrategiasCreadas += creadas;
      resultado.empleadosConNuevas += 1;
      conNuevas.push({
        nombre: `${emp.nombre} ${emp.apellido}`,
        rol: emp.rol_tecnologico,
        seniority: emp.seniority,
        nivel: emp.nivel_riesgo,
        riesgo_pct: Math.round((emp.riesgo_desercion ?? 0) * 100),
        estrategiasNuevas: creadas,
      });
    }
  }

  // Notificar solo si hubo estrategias nuevas (evita correos vacíos).
  if (notify && conNuevas.length > 0) {
    const admins = await getCompanyAdmins(companyId);
    if (admins.length > 0) {
      const company = await prisma.company.findUnique({
        where: { id: companyId },
        select: { name: true },
      });
      // Ordenar por riesgo desc para el resumen.
      conNuevas.sort((a, b) => b.riesgo_pct - a.riesgo_pct);
      await Promise.all(
        admins.map((admin) =>
          sendRetentionAlertEmail({
            to: admin.email,
            name: admin.name,
            companyName: company?.name ?? 'tu empresa',
            empleados: conNuevas,
            totalEnRiesgo: enRiesgo.length,
          }).catch(() => null) // el correo nunca debe romper el flujo
        )
      );
      resultado.notificado = true;
    }
  }

  return resultado;
};

module.exports = {
  NIVELES_ALERTA,
  generarParaEmpleado,
  getCompanyAdmins,
  processCompany,
};
