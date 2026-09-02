// Subscription Service — Lógica centralizada de suscripciones
// ─────────────────────────────────────────
// Centraliza:
//  - Mapeo plan_config.id → enum Plan (antes duplicado en 4 archivos)
//  - Cálculo de fin de período (vencimiento)
//  - Estado de suscripción con días restantes / si está por vencer
//  - Expiración automática de suscripciones vencidas
// ─────────────────────────────────────────

const prisma = require('../lib/prisma');
const { logAction } = require('./audit.service');

// Mapeo de plan_config.id (ESTANDAR, PROFESIONAL, CORPORATIVO)
// al enum Plan de la tabla companies (BASICO, PROFESIONAL, CORPORATIVO).
const PLAN_ID_TO_ENUM = {
  ESTANDAR:    'BASICO',
  PROFESIONAL: 'PROFESIONAL',
  CORPORATIVO: 'CORPORATIVO',
};

// Días antes del vencimiento en que se considera que el plan "está por vencer".
const EXPIRING_SOON_DAYS = 7;

// Un día en milisegundos.
const ONE_DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Convierte un plan_config.id al enum Plan de la tabla companies.
 * @param {string} planId - ESTANDAR | PROFESIONAL | CORPORATIVO
 * @param {string} [fallback='BASICO']
 * @returns {string} enum Plan
 */
const planIdToEnum = (planId, fallback = 'BASICO') => {
  return PLAN_ID_TO_ENUM[planId] || fallback;
};

/**
 * Calcula la fecha de fin de período sumando meses a una fecha base.
 * @param {Date} [from=new Date()] - Fecha base
 * @param {number} [months=1] - Meses a sumar
 * @returns {Date}
 */
const computePeriodEnd = (from = new Date(), months = 1) => {
  const end = new Date(from);
  end.setMonth(end.getMonth() + months);
  return end;
};

/**
 * Calcula los días restantes hasta una fecha (redondeados hacia arriba).
 * Negativo si la fecha ya pasó.
 * @param {Date|string} periodEnd
 * @returns {number}
 */
const daysUntil = (periodEnd) => {
  if (!periodEnd) return 0;
  const end = new Date(periodEnd).getTime();
  const now = Date.now();
  return Math.ceil((end - now) / ONE_DAY_MS);
};

/**
 * Devuelve el estado de suscripción de una empresa enriquecido con:
 *  - daysRemaining: días hasta el vencimiento (negativo si venció)
 *  - isExpired: si la fecha de fin ya pasó
 *  - isExpiringSoon: si vence dentro de EXPIRING_SOON_DAYS días
 *
 * @param {string} companyId
 * @returns {Promise<object|null>} null si la empresa no tiene suscripción
 */
const getSubscriptionStatus = async (companyId) => {
  if (!companyId) return null;

  const subscription = await prisma.subscription.findUnique({
    where: { companyId },
  });

  if (!subscription) return null;

  const daysRemaining  = daysUntil(subscription.currentPeriodEnd);
  const isExpired      = daysRemaining < 0;
  const isExpiringSoon = !isExpired && daysRemaining <= EXPIRING_SOON_DAYS;

  return {
    id:                 subscription.id,
    planId:             subscription.planId,
    status:             subscription.status,
    currentPeriodStart: subscription.currentPeriodStart,
    currentPeriodEnd:   subscription.currentPeriodEnd,
    canceledAt:         subscription.canceledAt,
    scheduledPlanId:    subscription.scheduledPlanId ?? null,
    daysRemaining,
    isExpired,
    isExpiringSoon,
    expiringSoonThreshold: EXPIRING_SOON_DAYS,
  };
};

/**
 * Marca como EXPIRED todas las suscripciones cuya fecha de fin ya pasó
 * y que siguen en estado ACTIVE o PAST_DUE, y suspende las empresas
 * correspondientes (salvo que ya estén suspendidas).
 *
 * Es idempotente: solo actúa sobre suscripciones que aún no están EXPIRED/CANCELED.
 *
 * @returns {Promise<{expiredCount: number, suspendedCompanyIds: string[]}>}
 */
const expireOverdueSubscriptions = async () => {
  const now = new Date();

  // Buscar suscripciones vencidas que todavía figuran como vigentes
  const overdue = await prisma.subscription.findMany({
    where: {
      currentPeriodEnd: { lt: now },
      status: { in: ['ACTIVE', 'PAST_DUE'] },
    },
    select: { id: true, companyId: true, planId: true, currentPeriodEnd: true },
  });

  if (overdue.length === 0) {
    return { expiredCount: 0, suspendedCompanyIds: [] };
  }

  const suspendedCompanyIds = [];

  for (const sub of overdue) {
    try {
      await prisma.$transaction([
        prisma.subscription.update({
          where: { id: sub.id },
          data:  { status: 'EXPIRED' },
        }),
        prisma.company.update({
          where: { id: sub.companyId },
          data:  { status: 'SUSPENDED' },
        }),
      ]);

      suspendedCompanyIds.push(sub.companyId);

      await logAction({
        tenantId:   sub.companyId,
        action:     'SUBSCRIPTION_EXPIRED_AUTO',
        resource:   'subscriptions',
        resourceId: sub.id,
        status:     'SUCCESS',
        oldValue:   { status: 'ACTIVE_OR_PAST_DUE', currentPeriodEnd: sub.currentPeriodEnd },
        newValue:   { status: 'EXPIRED', companyStatus: 'SUSPENDED' },
      });
    } catch (err) {
      // No interrumpir el lote por un fallo puntual
      console.error(`[Subscription] Error expirando suscripción ${sub.id}:`, err.message);
    }
  }

  return { expiredCount: suspendedCompanyIds.length, suspendedCompanyIds };
};

/**
 * Extiende (renueva) manualmente el período de una suscripción.
 * Reactiva la empresa y la suscripción. Usado por el superadmin.
 *
 * @param {object} params
 * @param {string} params.companyId
 * @param {number} [params.months=1] - Meses a extender desde hoy o desde el fin vigente
 * @param {boolean} [params.fromCurrentEnd=false] - Si true, extiende desde currentPeriodEnd (si es futuro); si no, desde hoy
 * @returns {Promise<object>} la suscripción actualizada
 */
const extendSubscription = async ({ companyId, months = 1, fromCurrentEnd = false }) => {
  const subscription = await prisma.subscription.findUnique({ where: { companyId } });
  if (!subscription) {
    throw Object.assign(new Error('La empresa no tiene una suscripción'), { statusCode: 404 });
  }

  // Base: desde el fin vigente si aún es futuro y se pidió, sino desde hoy
  const now  = new Date();
  const base = fromCurrentEnd && new Date(subscription.currentPeriodEnd) > now
    ? new Date(subscription.currentPeriodEnd)
    : now;

  const newEnd = computePeriodEnd(base, months);

  const updated = await prisma.subscription.update({
    where: { companyId },
    data:  {
      currentPeriodEnd: newEnd,
      status:           'ACTIVE',
      canceledAt:       null,
    },
  });

  await prisma.company.update({
    where: { id: companyId },
    data:  { status: 'ACTIVE' },
  });

  return updated;
};

// ─── Migración de planes (upgrade prorrateado / downgrade programado) ─────────

/**
 * Calcula el prorrateo para migrar de plan.
 *
 * Reglas de negocio:
 *  - UPGRADE (plan más caro): se cobra la DIFERENCIA = precioNuevo - créditoNoUsado.
 *    Aplica de inmediato tras el pago, reiniciando el ciclo a 1 mes.
 *  - DOWNGRADE (plan más barato o igual precio): NO se cobra nada.
 *    Se programa para el próximo ciclo (scheduledPlanId).
 *
 * El crédito no usado del plan actual = precioActual * (díasRestantes / díasDelCiclo).
 *
 * @param {string} companyId
 * @param {string} targetPlanId - plan_config.id destino (ESTANDAR|PROFESIONAL|CORPORATIVO)
 * @returns {Promise<object>} detalle del cálculo
 */
const computeProration = async (companyId, targetPlanId) => {
  const subscription = await prisma.subscription.findUnique({ where: { companyId } });
  if (!subscription) {
    throw Object.assign(new Error('La empresa no tiene una suscripción activa'), { statusCode: 404 });
  }

  const [currentPlan, targetPlan] = await Promise.all([
    prisma.planConfig.findUnique({ where: { id: subscription.planId } }),
    prisma.planConfig.findUnique({ where: { id: targetPlanId } }),
  ]);

  if (!targetPlan) {
    throw Object.assign(new Error('Plan destino no encontrado'), { statusCode: 404 });
  }
  if (!currentPlan) {
    throw Object.assign(new Error('Plan actual no encontrado en la configuración'), { statusCode: 409 });
  }

  if (subscription.planId === targetPlanId) {
    throw Object.assign(new Error('La empresa ya está en ese plan'), { statusCode: 400 });
  }

  const now       = new Date();
  const periodEnd = new Date(subscription.currentPeriodEnd);
  const periodStart = new Date(subscription.currentPeriodStart);

  // Días totales del ciclo y días restantes (piso en 0)
  const cycleDays     = Math.max(1, Math.round((periodEnd - periodStart) / ONE_DAY_MS));
  const daysRemaining = Math.max(0, Math.ceil((periodEnd - now) / ONE_DAY_MS));

  // Crédito no usado del plan actual (solo si la suscripción sigue vigente)
  const isActive = subscription.status === 'ACTIVE' && periodEnd > now;
  const unusedCredit = isActive
    ? Math.round(currentPlan.priceGs * (daysRemaining / cycleDays))
    : 0;

  const isUpgrade = targetPlan.priceGs > currentPlan.priceGs;

  // Para upgrade: diferencia a pagar (nunca negativa)
  const amountToPay = isUpgrade
    ? Math.max(0, targetPlan.priceGs - unusedCredit)
    : 0;

  return {
    type: isUpgrade ? 'UPGRADE' : 'DOWNGRADE',
    currentPlanId:   subscription.planId,
    currentPriceGs:  currentPlan.priceGs,
    targetPlanId,
    targetPriceGs:   targetPlan.priceGs,
    cycleDays,
    daysRemaining,
    unusedCreditGs:  unusedCredit,
    amountToPayGs:   amountToPay,
    // Downgrade se aplica al próximo ciclo; upgrade es inmediato tras pago
    effective: isUpgrade ? 'IMMEDIATE' : 'NEXT_CYCLE',
    currentPeriodEnd: subscription.currentPeriodEnd,
  };
};

/**
 * Programa un cambio de plan para el próximo ciclo (downgrade).
 * No cobra ni cambia el plan actual.
 *
 * @param {string} companyId
 * @param {string} targetPlanId
 * @returns {Promise<object>} suscripción actualizada
 */
const schedulePlanChange = async (companyId, targetPlanId) => {
  return prisma.subscription.update({
    where: { companyId },
    data:  { scheduledPlanId: targetPlanId },
  });
};

/**
 * Cancela un cambio de plan programado.
 * @param {string} companyId
 */
const clearScheduledPlanChange = async (companyId) => {
  return prisma.subscription.update({
    where: { companyId },
    data:  { scheduledPlanId: null },
  });
};

/**
 * Aplica un cambio de plan programado (si existe) al renovar el ciclo.
 * Actualiza subscription.planId, company.plan y limpia scheduledPlanId.
 * Idempotente: si no hay cambio programado, no hace nada.
 *
 * @param {string} companyId
 * @param {object} [tx=prisma] - cliente Prisma (para usar dentro de una transacción)
 * @returns {Promise<string|null>} el nuevo planId aplicado, o null
 */
const applyScheduledPlanChange = async (companyId, tx = prisma) => {
  const subscription = await tx.subscription.findUnique({ where: { companyId } });
  if (!subscription || !subscription.scheduledPlanId) return null;

  const newPlanId = subscription.scheduledPlanId;

  await tx.subscription.update({
    where: { companyId },
    data:  { planId: newPlanId, scheduledPlanId: null },
  });

  await tx.company.update({
    where: { id: companyId },
    data:  { plan: planIdToEnum(newPlanId) },
  });

  return newPlanId;
};

module.exports = {
  PLAN_ID_TO_ENUM,
  EXPIRING_SOON_DAYS,
  planIdToEnum,
  computePeriodEnd,
  daysUntil,
  getSubscriptionStatus,
  expireOverdueSubscriptions,
  extendSubscription,
  computeProration,
  schedulePlanChange,
  clearScheduledPlanChange,
  applyScheduledPlanChange,
};
