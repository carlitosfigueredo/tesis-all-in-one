// ─────────────────────────────────────────
// Retention Scan Job — Generación automática semanal de estrategias
// ─────────────────────────────────────────
// Corre periódicamente (por defecto cada 7 días) y también una vez al arrancar.
// Recorre todas las empresas activas, genera estrategias de retención para los
// empleados en riesgo ALTO/CRÍTICO (sin duplicar) y notifica por correo a los
// COMPANY_ADMIN cuando hay novedades.
//
// Mismo enfoque liviano que subscriptionExpiry.job: setInterval nativo, sin
// dependencias externas, idempotente.
// ─────────────────────────────────────────

const prisma = require('../lib/prisma');
const { processCompany } = require('../services/autoRetention.service');

// Intervalo configurable por env (en minutos). Default: 10080 min (7 días).
const INTERVAL_MINUTES = parseInt(process.env.RETENTION_SCAN_INTERVAL_MIN, 10) || 7 * 24 * 60;
const INTERVAL_MS = INTERVAL_MINUTES * 60 * 1000;

let _timer = null;
let _running = false;

/**
 * Ejecuta una pasada de scan sobre todas las empresas activas.
 * Evita solaparse consigo misma.
 */
const runScanPass = async () => {
  if (_running) return;
  _running = true;
  try {
    const companies = await prisma.company.findMany({
      where: { active: true, status: 'ACTIVE' },
      select: { id: true, name: true },
    });

    let totalCreadas = 0;
    let empresasNotificadas = 0;

    for (const c of companies) {
      try {
        const r = await processCompany(c.id, { notify: true });
        totalCreadas += r.estrategiasCreadas;
        if (r.notificado) empresasNotificadas += 1;
      } catch (err) {
        console.error(`[RetentionScan] Error en empresa ${c.name} (${c.id}):`, err.message);
      }
    }

    if (totalCreadas > 0 || process.env.NODE_ENV !== 'production') {
      console.log(`[RetentionScan] Pasada completa: ${companies.length} empresa(s), ` +
        `${totalCreadas} estrategia(s) creada(s), ${empresasNotificadas} notificada(s).`);
    }
  } catch (err) {
    console.error('[RetentionScan] Error en la pasada:', err.message);
  } finally {
    _running = false;
  }
};

/**
 * Inicia el scheduler: una pasada inmediata + pasadas periódicas.
 * Idempotente: si ya está corriendo, no crea un segundo timer.
 */
const startRetentionScanJob = () => {
  if (_timer) return _timer;

  console.log(`[RetentionScan] Job iniciado (cada ${INTERVAL_MINUTES} min).`);

  // Pasada inicial diferida para no competir con el arranque del server.
  setTimeout(runScanPass, 30 * 1000);

  _timer = setInterval(runScanPass, INTERVAL_MS);
  if (_timer.unref) _timer.unref();

  return _timer;
};

/**
 * Detiene el scheduler (útil para tests o shutdown limpio).
 */
const stopRetentionScanJob = () => {
  if (_timer) {
    clearInterval(_timer);
    _timer = null;
  }
};

module.exports = {
  startRetentionScanJob,
  stopRetentionScanJob,
  runScanPass,
};
