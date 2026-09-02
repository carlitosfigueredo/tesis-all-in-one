// Subscription Expiry Job — Expiración automática de suscripciones vencidas
// ─────────────────────────────────────────
// Corre periódicamente (por defecto cada 6 horas) y también una vez al
// arrancar el servidor. Marca como EXPIRED las suscripciones cuyo período
// venció y suspende las empresas correspondientes.
//
// No usa dependencias externas (node-cron): setInterval nativo es suficiente
// para esta cadencia y mantiene el stack liviano.
// ─────────────────────────────────────────

const { expireOverdueSubscriptions } = require('../services/subscription.service');

// Intervalo configurable por env (en minutos). Default: 360 min (6 horas).
const INTERVAL_MINUTES = parseInt(process.env.SUBSCRIPTION_EXPIRY_INTERVAL_MIN, 10) || 360;
const INTERVAL_MS = INTERVAL_MINUTES * 60 * 1000;

let _timer = null;
let _running = false;

/**
 * Ejecuta una pasada de expiración. Evita solaparse consigo misma.
 */
const runExpiryPass = async () => {
  if (_running) return; // evitar ejecuciones concurrentes
  _running = true;
  try {
    const { expiredCount, suspendedCompanyIds } = await expireOverdueSubscriptions();
    if (expiredCount > 0) {
      console.log(`[SubscriptionExpiry] ${expiredCount} suscripción(es) expirada(s). Empresas suspendidas: ${suspendedCompanyIds.join(', ')}`);
    } else if (process.env.NODE_ENV !== 'production') {
      console.log('[SubscriptionExpiry] Sin suscripciones vencidas.');
    }
  } catch (err) {
    console.error('[SubscriptionExpiry] Error en la pasada de expiración:', err.message);
  } finally {
    _running = false;
  }
};

/**
 * Inicia el scheduler: una pasada inmediata + pasadas periódicas.
 * Idempotente: si ya está corriendo, no crea un segundo timer.
 */
const startSubscriptionExpiryJob = () => {
  if (_timer) return _timer;

  console.log(`[SubscriptionExpiry] Job iniciado (cada ${INTERVAL_MINUTES} min).`);

  // Pasada inicial al arrancar (no bloquea el arranque del server)
  runExpiryPass();

  _timer = setInterval(runExpiryPass, INTERVAL_MS);
  // No mantener el proceso vivo solo por este timer
  if (_timer.unref) _timer.unref();

  return _timer;
};

/**
 * Detiene el scheduler (útil para tests o shutdown limpio).
 */
const stopSubscriptionExpiryJob = () => {
  if (_timer) {
    clearInterval(_timer);
    _timer = null;
  }
};

module.exports = {
  startSubscriptionExpiryJob,
  stopSubscriptionExpiryJob,
  runExpiryPass,
};
