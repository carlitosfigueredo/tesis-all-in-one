/**
 * recalcPolicy.service.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Política de frecuencia de recálculo de predicciones según el plan de la empresa.
 *
 * Modelo de negocio (mensual): el valor que se paga es la FRESCURA de la
 * predicción, no su existencia. Las empresas siempre pueden importar datos y
 * acumular historial, pero el riesgo solo se RECALCULA con la frecuencia del plan:
 *
 *   - Estándar (enum BASICO)  → cada 30 días  (mensual)
 *   - Profesional             → cada 7 días   (semanal)
 *   - Corporativo             → sin límite    (bajo demanda)
 *
 * SUPER_ADMIN nunca tiene límite.
 *
 * La frecuencia se deriva del enum Plan (estable) y NO del string editable
 * PlanConfig.predictionFrequency, para que no se rompa si un admin edita el texto.
 */

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

// Ventana mínima entre recálculos, en días, por plan (enum Plan de la DB).
// null = sin límite (puede recalcular siempre).
const RECALC_WINDOW_DAYS = {
  BASICO: 30,       // Plan Estándar → mensual
  PROFESIONAL: 7,   // Plan Profesional → semanal
  CORPORATIVO: null, // Plan Corporativo → bajo demanda (ilimitado)
};

// Etiqueta legible de la frecuencia por plan, para mensajes al usuario.
const FRECUENCIA_LABEL = {
  BASICO: 'mensual',
  PROFESIONAL: 'semanal',
  CORPORATIVO: 'bajo demanda',
};

/**
 * Evalúa si una empresa puede recalcular ahora, según su plan y la última vez
 * que recalculó.
 *
 * @param {object} params
 * @param {string} params.plan - enum Plan: BASICO | PROFESIONAL | CORPORATIVO
 * @param {Date|string|null} params.lastRecalculatedAt - última vez que recalculó (null = nunca)
 * @param {boolean} [params.isSuperAdmin=false] - SUPER_ADMIN nunca tiene límite
 * @param {Date} [params.now=new Date()]
 * @returns {{
 *   canRecalculate: boolean,
 *   windowDays: number|null,
 *   frecuencia: string,
 *   nextAvailableAt: Date|null,
 *   daysUntilNext: number,
 *   reason: string|null
 * }}
 */
const evaluateRecalcPolicy = ({ plan, lastRecalculatedAt, isSuperAdmin = false, now = new Date() }) => {
  // Ojo: CORPORATIVO tiene ventana `null` (ilimitado) a propósito. No usamos `??`
  // porque trataría ese null como "ausente" y caería al fallback de BASICO.
  // El fallback solo aplica cuando el plan NO está definido en el mapa.
  const planConocido = Object.prototype.hasOwnProperty.call(RECALC_WINDOW_DAYS, plan);
  const windowDays = planConocido ? RECALC_WINDOW_DAYS[plan] : RECALC_WINDOW_DAYS.BASICO;
  const frecuencia = FRECUENCIA_LABEL[plan] ?? FRECUENCIA_LABEL.BASICO;

  // Sin límite: Corporativo o SUPER_ADMIN.
  if (isSuperAdmin || windowDays === null) {
    return {
      canRecalculate: true,
      windowDays: null,
      frecuencia: isSuperAdmin ? 'bajo demanda' : frecuencia,
      nextAvailableAt: null,
      daysUntilNext: 0,
      reason: null,
    };
  }

  // Nunca recalculó → puede hacerlo ahora (primer cálculo).
  if (!lastRecalculatedAt) {
    return {
      canRecalculate: true,
      windowDays,
      frecuencia,
      nextAvailableAt: null,
      daysUntilNext: 0,
      reason: null,
    };
  }

  const last = new Date(lastRecalculatedAt).getTime();
  const nextAvailable = new Date(last + windowDays * ONE_DAY_MS);
  const canRecalculate = now.getTime() >= nextAvailable.getTime();
  const daysUntilNext = canRecalculate
    ? 0
    : Math.ceil((nextAvailable.getTime() - now.getTime()) / ONE_DAY_MS);

  return {
    canRecalculate,
    windowDays,
    frecuencia,
    nextAvailableAt: canRecalculate ? null : nextAvailable,
    daysUntilNext,
    reason: canRecalculate
      ? null
      : `Tu plan actualiza las predicciones de forma ${frecuencia}. ` +
        `Podrás recalcular nuevamente en ${daysUntilNext} día(s) ` +
        `(${nextAvailable.toLocaleDateString('es-PY')}).`,
  };
};

module.exports = {
  RECALC_WINDOW_DAYS,
  FRECUENCIA_LABEL,
  evaluateRecalcPolicy,
};
