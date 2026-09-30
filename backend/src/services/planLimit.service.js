// ─────────────────────────────────────────
// Limite de empleados por plan
// Cada plan (PlanConfig) define un employeeLimit. Al crear o importar
// empleados se verifica que la empresa no supere ese cupo.
// ─────────────────────────────────────────

const prisma = require('../lib/prisma');

// El enum Plan de Company (BASICO/PROFESIONAL/CORPORATIVO) mapea al id de
// PlanConfig. El plan mas bajo real es ESTANDAR; BASICO se trata como ESTANDAR.
const PLAN_TO_CONFIG_ID = {
  BASICO: 'ESTANDAR',
  PROFESIONAL: 'PROFESIONAL',
  CORPORATIVO: 'CORPORATIVO',
};

// Cupo por defecto si no se encuentra configuracion de plan.
const DEFAULT_LIMIT = 100;

/**
 * Devuelve el limite de empleados del plan de una empresa.
 * @param {string} companyId
 * @returns {Promise<number>} cupo maximo de empleados
 */
async function getEmployeeLimit(companyId) {
  const company = await prisma.company.findUnique({
    where: { id: companyId },
    select: { plan: true },
  });
  if (!company) return DEFAULT_LIMIT;

  const configId = PLAN_TO_CONFIG_ID[company.plan] || company.plan;
  const planConfig = await prisma.planConfig.findUnique({
    where: { id: configId },
    select: { employeeLimit: true },
  });
  return planConfig?.employeeLimit ?? DEFAULT_LIMIT;
}

/**
 * Verifica si la empresa puede agregar `toAdd` empleados nuevos sin superar
 * el cupo de su plan.
 * @param {string} companyId
 * @param {number} toAdd cantidad de empleados que se pretende agregar
 * @returns {Promise<{ allowed: boolean, limit: number, current: number, remaining: number }>}
 */
async function checkEmployeeLimit(companyId, toAdd = 1) {
  const limit = await getEmployeeLimit(companyId);
  const current = await prisma.employee.count({ where: { companyId } });
  const remaining = Math.max(0, limit - current);
  return {
    allowed: current + toAdd <= limit,
    limit,
    current,
    remaining,
  };
}

module.exports = { getEmployeeLimit, checkEmployeeLimit };
