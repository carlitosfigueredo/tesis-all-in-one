/**
 * ─────────────────────────────────────────────────────────────────────────────
 * Tests unitarios — Política de recálculo de predicciones por plan
 * ─────────────────────────────────────────────────────────────────────────────
 * Cubre parte de:
 *   RF-05  Importación / recálculo respeta la frecuencia del plan
 *           (Estándar=mensual, Profesional=semanal, Corporativo=bajo demanda)
 *
 * Lógica pura, sin base de datos ni red. Valida la regla de negocio que decide
 * si una empresa puede recalcular el riesgo de sus empleados según su plan y
 * la última fecha de recálculo.
 */

const { evaluateRecalcPolicy } = require('../../src/services/recalcPolicy.service');

const DIA = 24 * 60 * 60 * 1000;

describe('RF-05 — evaluateRecalcPolicy (frecuencia de recálculo por plan)', () => {
  const ahora = new Date('2026-09-14T12:00:00Z');

  test('Plan CORPORATIVO puede recalcular siempre (bajo demanda)', () => {
    const r = evaluateRecalcPolicy({
      plan: 'CORPORATIVO',
      lastRecalculatedAt: new Date(ahora.getTime() - 1000), // recién recalculó
      now: ahora,
    });
    expect(r.canRecalculate).toBe(true);
    expect(r.frecuencia).toBe('bajo demanda');
    expect(r.windowDays).toBeNull();
  });

  test('SUPER_ADMIN nunca tiene límite, cualquier plan', () => {
    const r = evaluateRecalcPolicy({
      plan: 'BASICO',
      lastRecalculatedAt: ahora,
      isSuperAdmin: true,
      now: ahora,
    });
    expect(r.canRecalculate).toBe(true);
  });

  test('Empresa que nunca recalculó puede hacerlo (primer cálculo)', () => {
    const r = evaluateRecalcPolicy({
      plan: 'BASICO',
      lastRecalculatedAt: null,
      now: ahora,
    });
    expect(r.canRecalculate).toBe(true);
    expect(r.windowDays).toBe(30);
  });

  test('Plan BASICO (mensual): bloquea si pasaron menos de 30 días', () => {
    const r = evaluateRecalcPolicy({
      plan: 'BASICO',
      lastRecalculatedAt: new Date(ahora.getTime() - 10 * DIA), // hace 10 días
      now: ahora,
    });
    expect(r.canRecalculate).toBe(false);
    expect(r.frecuencia).toBe('mensual');
    expect(r.daysUntilNext).toBe(20);
    expect(r.reason).toMatch(/mensual/i);
  });

  test('Plan BASICO (mensual): permite si pasaron 30 días o más', () => {
    const r = evaluateRecalcPolicy({
      plan: 'BASICO',
      lastRecalculatedAt: new Date(ahora.getTime() - 30 * DIA),
      now: ahora,
    });
    expect(r.canRecalculate).toBe(true);
  });

  test('Plan PROFESIONAL (semanal): bloquea a los 3 días, permite a los 7', () => {
    const bloqueado = evaluateRecalcPolicy({
      plan: 'PROFESIONAL',
      lastRecalculatedAt: new Date(ahora.getTime() - 3 * DIA),
      now: ahora,
    });
    expect(bloqueado.canRecalculate).toBe(false);
    expect(bloqueado.frecuencia).toBe('semanal');
    expect(bloqueado.daysUntilNext).toBe(4);

    const permitido = evaluateRecalcPolicy({
      plan: 'PROFESIONAL',
      lastRecalculatedAt: new Date(ahora.getTime() - 7 * DIA),
      now: ahora,
    });
    expect(permitido.canRecalculate).toBe(true);
  });

  test('Plan desconocido cae al fallback mensual (BASICO), no ilimitado', () => {
    const r = evaluateRecalcPolicy({
      plan: 'PLAN_INEXISTENTE',
      lastRecalculatedAt: new Date(ahora.getTime() - 1 * DIA),
      now: ahora,
    });
    expect(r.canRecalculate).toBe(false);
    expect(r.windowDays).toBe(30);
  });
});
