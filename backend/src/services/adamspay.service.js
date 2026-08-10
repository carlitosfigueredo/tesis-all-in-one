// ─────────────────────────────────────────
// adamspay.service.js — Integración AdamsPay
// Pasarela de pagos local de Paraguay
// Ambiente: STAGING (pruebas) / PRODUCTION
//
// Flujo:
//   1. Backend crea una "Deuda" en AdamsPay con docId unico y monto en PYG
//   2. AdamsPay devuelve un payUrl (link de pago)
//   3. Frontend redirige al usuario a ese link
//   4. El usuario paga con tarjeta, Tigo Money, Zimple, etc.
//   5. AdamsPay llama al webhook con el resultado
//   6. Backend confirma el pago consultando GET /debts/:docId
//
// Docs: https://wiki.adamspay.com
// Postman: postman_website_tesis820_test.json
// ─────────────────────────────────────────

const ADAMSPAY_BASE_URL = process.env.ADAMSPAY_ENVIRONMENT === 'PRODUCTION'
  ? 'https://adamspay.com/api/v1'
  : 'https://staging.adamspay.com/api/v1';

/**
 * Helper para llamadas autenticadas a AdamsPay.
 * Auth: header "apikey: <API_KEY>"
 */
const adamsFetch = async (path, options = {}) => {
  const apiKey = process.env.ADAMSPAY_API_KEY;
  if (!apiKey) throw new Error('ADAMSPAY_API_KEY no configurada');

  const response = await fetch(`${ADAMSPAY_BASE_URL}${path}`, {
    ...options,
    headers: {
      'apikey':       apiKey,
      'Content-Type': 'application/json',
      'Accept':       'application/json',
      ...(options.headers || {}),
    },
  });

  const text = await response.text();
  const json = text ? JSON.parse(text) : {};

  if (!response.ok) {
    const detail = json?.message || json?.error || text;
    throw Object.assign(
      new Error(`AdamsPay API error ${response.status}: ${detail}`),
      { statusCode: response.status, adamsError: json }
    );
  }

  return json;
};

/**
 * Crea una "Deuda" en AdamsPay y devuelve el link de pago.
 *
 * @param {object} params
 * @param {string} params.docId      - ID unico del cobro (companyId-planId-timestamp)
 * @param {number} params.amountPyg  - Monto en guaranies
 * @param {string} params.label      - Descripcion visible para el pagador
 * @param {string} params.companyId  - Para trazabilidad interna
 * @param {string} params.planId     - Plan que se esta pagando
 */
const createDebt = async ({ docId, amountPyg, label, companyId, planId }) => {
  // Periodo de validez: desde ahora hasta 24 horas
  const start = new Date();
  const end   = new Date(start.getTime() + 24 * 60 * 60 * 1000);

  const toIso = (d) => d.toISOString().replace(/\.\d{3}Z$/, '+0000');

  const body = {
    debt: {
      docId,
      amount: {
        currency: 'PYG',
        value:    amountPyg,
      },
      label,
      validPeriod: {
        start: toIso(start),
        end:   toIso(end),
      },
    },
  };

  const result = await adamsFetch('/debts', {
    method: 'POST',
    body:   JSON.stringify(body),
  });

  // AdamsPay devuelve la deuda con payUrl para redirigir al usuario
  const debt = result.debt || result;

  return {
    docId:      debt.docId  || docId,
    debtId:     debt.id     || debt.docId || docId,
    payUrl:     debt.payUrl || debt.pay_url || null,
    status:     debt.status || 'PENDING',
    amountPyg,
    label,
    companyId,
    planId,
    expiresAt:  toIso(end),
  };
};

/**
 * Consulta el estado actual de una deuda en AdamsPay.
 * Usar para verificar si fue pagada (status: PAID).
 *
 * @param {string} docId - El docId usado al crear la deuda
 */
const getDebt = async (docId) => {
  return adamsFetch(`/debts/${docId}`);
};

/**
 * Cancela/elimina una deuda pendiente.
 *
 * @param {string} docId
 */
const deleteDebt = async (docId) => {
  return adamsFetch(`/debts/${docId}`, { method: 'DELETE' });
};

/**
 * Consulta el info de la app/comercio (util para verificar credenciales).
 */
const getSelf = async () => {
  return adamsFetch('/apps/self');
};

/**
 * Lista las ultimas notificaciones del webhook (util para debug).
 */
const getNotifications = async () => {
  return adamsFetch('/apps/self/notifications');
};

/**
 * Consulta las transacciones de una deuda.
 *
 * @param {string} docId
 */
const getDebtTransactions = async (docId) => {
  return adamsFetch(`/debts/${docId}/tx`);
};

module.exports = {
  createDebt,
  getDebt,
  deleteDebt,
  getSelf,
  getNotifications,
  getDebtTransactions,
  ADAMSPAY_BASE_URL,
};
