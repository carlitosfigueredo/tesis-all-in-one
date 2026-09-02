// ─────────────────────────────────────────
// PayPal Service — Integración real con PayPal Orders API v2
// Ambiente: SANDBOX (desarrollo/tesis)
// Docs: https://developer.paypal.com/docs/api/orders/v2/
// ─────────────────────────────────────────

const prisma = require('../lib/prisma');

const PAYPAL_BASE_URL = process.env.PAYPAL_ENVIRONMENT === 'PRODUCTION'
  ? 'https://api-m.paypal.com'
  : 'https://api-m.sandbox.paypal.com';

// ─── Cache del access token (se renueva automaticamente) ─────────────────────
let _cachedToken = null;
let _tokenExpiresAt = 0;

/**
 * Obtiene un Bearer token de PayPal via OAuth2 client_credentials.
 * Cachea el token hasta 5 minutos antes de su expiracion.
 */
const getAccessToken = async () => {
  // Reutilizar token si sigue vigente
  if (_cachedToken && Date.now() < _tokenExpiresAt) {
    return _cachedToken;
  }

  const clientId     = process.env.PAYPAL_CLIENT_ID;
  const clientSecret = process.env.PAYPAL_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error('PAYPAL_CLIENT_ID y PAYPAL_CLIENT_SECRET son requeridos');
  }

  const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

  const response = await fetch(`${PAYPAL_BASE_URL}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${credentials}`,
      'Content-Type': 'application/x-www-form-urlencoded',
      'Accept': 'application/json',
    },
    body: 'grant_type=client_credentials',
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Error autenticando con PayPal: ${err}`);
  }

  const data = await response.json();

  // Cachear: expires_in en segundos, restamos 5 minutos de margen
  _cachedToken = data.access_token;
  _tokenExpiresAt = Date.now() + (data.expires_in - 300) * 1000;

  return _cachedToken;
};

/**
 * Helper para llamadas autenticadas a la API de PayPal.
 */
const paypalFetch = async (path, options = {}) => {
  const token = await getAccessToken();
  const response = await fetch(`${PAYPAL_BASE_URL}${path}`, {
    ...options,
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'PayPal-Request-Id': options.requestId || undefined,
      ...(options.headers || {}),
    },
  });

  const text = await response.text();
  const json = text ? JSON.parse(text) : {};

  if (!response.ok) {
    const detail = json?.details?.[0]?.description || json?.message || text;
    throw Object.assign(new Error(`PayPal API error ${response.status}: ${detail}`), {
      statusCode: response.status,
      paypalError: json,
    });
  }

  return json;
};

// Mapeo de plan_config.id al enum Plan de la tabla companies (centralizado)
const { PLAN_ID_TO_ENUM } = require('./subscription.service');

const { getPygToUsdRate } = require('./systemConfig.service');

/**
 * Convierte guaranies (PYG) a USD para PayPal.
 * Lee la tasa desde SystemConfig (BD), con fallback a .env y luego 7500.
 */
const pygToUsd = async (amountPyg) => {
  const rate = await getPygToUsdRate();
  return (amountPyg / rate).toFixed(2);
};

/**
 * Crea una orden de pago en PayPal.
 * Retorna el orderID que el frontend necesita para el botón PayPal.
 *
 * @param {object} params
 * @param {string} params.planId    - ID del plan (ESTANDAR, PROFESIONAL, CORPORATIVO)
 * @param {number} params.amountPyg - Monto en guaranies
 * @param {string} params.companyId - ID de la empresa
 * @param {string} params.userId    - ID del usuario
 */
const createOrder = async ({ planId, amountPyg, companyId, userId, changeType }) => {
  const amountUsd = await pygToUsd(amountPyg);

  // Idempotency key unico por intento (evita doble procesamiento — punto 14 Apuntes UNIDA)
  const requestId = `order-${companyId}-${planId}-${Date.now()}`;

  // custom_id lleva un 4º segmento opcional para señalar un upgrade prorrateado
  const customId = changeType
    ? `${companyId}:${planId}:${userId}:${changeType}`
    : `${companyId}:${planId}:${userId}`;

  const order = await paypalFetch('/v2/checkout/orders', {
    method: 'POST',
    requestId,
    body: JSON.stringify({
      intent: 'CAPTURE',
      purchase_units: [
        {
          reference_id: `${companyId}-${planId}`,
          description: `Suscripcion plan ${planId} — Sistema BI Retencion de Talento`,
          custom_id: customId,
          amount: {
            currency_code: 'USD',
            value: amountUsd,
          },
          soft_descriptor: 'SistemaBI UNIDA',
        },
      ],
      payment_source: {
        paypal: {
          experience_context: {
            payment_method_preference: 'IMMEDIATE_PAYMENT_REQUIRED',
            brand_name: 'Sistema BI — Retencion de Talento',
            locale: 'es-ES',
            landing_page: 'LOGIN',
            user_action: 'PAY_NOW',
            // return_url y cancel_url requeridos por PayPal Sandbox
            return_url: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/checkout`,
            cancel_url: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/checkout`,
          },
        },
      },
    }),
  });

  return {
    orderId:    order.id,
    status:     order.status,       // CREATED
    amountUsd,
    amountPyg,
  };
};

/**
 * Captura (cobra) una orden de PayPal ya aprobada por el usuario.
 * Actualiza la BD: crea payment, suscripción y activa la empresa.
 *
 * @param {string} orderId   - ID de la orden PayPal aprobada
 * @param {string} companyId - ID de la empresa
 * @param {string} planId    - ID del plan
 * @param {string} userId    - ID del usuario
 */
const captureOrder = async ({ orderId, companyId, planId, userId }) => {
  // Capturar el pago en PayPal
  const capture = await paypalFetch(`/v2/checkout/orders/${orderId}/capture`, {
    method: 'POST',
    body: JSON.stringify({}),
  });

  const unit          = capture.purchase_units?.[0];
  const captureResult = unit?.payments?.captures?.[0];

  if (!captureResult) {
    throw new Error('Respuesta de captura invalida de PayPal');
  }

  const captureStatus  = captureResult.status; // COMPLETED | DECLINED | PENDING
  const captureId      = captureResult.id;
  const amountUsd      = parseFloat(captureResult.amount?.value || '0');
  const rate           = await getPygToUsdRate();
  const amountPyg      = Math.round(amountUsd * rate);
  const payerName      = capture.payer?.name?.given_name + ' ' + capture.payer?.name?.surname;
  const payerEmail     = capture.payer?.email_address;

  const isApproved = captureStatus === 'COMPLETED';
  const isPending  = captureStatus === 'PENDING';

  // Buscar suscripcion existente
  let subscription = await prisma.subscription.findUnique({ where: { companyId } });

  if (!subscription) {
    const periodEnd = new Date();
    periodEnd.setMonth(periodEnd.getMonth() + 1);

    subscription = await prisma.subscription.create({
      data: {
        companyId,
        planId,
        status: isApproved ? 'ACTIVE' : 'PAST_DUE',
        currentPeriodEnd: periodEnd,
      },
    });
  }

  // Registrar el pago en la BD con el ID real de PayPal
  const payment = await prisma.payment.create({
    data: {
      companyId,
      subscriptionId: subscription.id,
      amount:         amountPyg,
      currency:       'PYG',
      status:         isApproved ? 'APPROVED' : isPending ? 'PENDING' : 'REJECTED',
      paymentMethod:  'paypal',
      cardLast4:      null,
      cardBrand:      null,
      description:    `Suscripcion plan ${planId} via PayPal`,
      failureReason:  isApproved ? null : `PayPal status: ${captureStatus}`,
      processedAt:    isApproved ? new Date() : null,
      // Trazabilidad PayPal
      paypalOrderId:   orderId,
      paypalCaptureId: captureId,
      payerEmail,
      payerName,
    },
  });

  // Si fue aprobado: activar empresa y renovar suscripcion
  if (isApproved) {
    // Downgrade programado: si el cliente está renovando el MISMO plan que tiene
    // y hay un cambio programado, aplicar ese plan ahora (inicio del nuevo ciclo).
    // Una elección explícita de otro plan (upgrade/cambio directo) tiene prioridad
    // y limpia cualquier downgrade programado.
    const renewingSamePlan = planId === subscription.planId;
    const effectivePlanId = (renewingSamePlan && subscription.scheduledPlanId)
      ? subscription.scheduledPlanId
      : planId;

    const planEnum  = PLAN_ID_TO_ENUM[effectivePlanId] || 'BASICO';
    const periodEnd = new Date();
    periodEnd.setMonth(periodEnd.getMonth() + 1);

    await prisma.company.update({
      where: { id: companyId },
      data:  { status: 'ACTIVE', plan: planEnum },
    });

    await prisma.subscription.update({
      where: { id: subscription.id },
      data:  {
        status: 'ACTIVE',
        planId: effectivePlanId,
        currentPeriodStart: new Date(),
        currentPeriodEnd: periodEnd,
        scheduledPlanId: null, // consumido/limpiado
      },
    });
  }

  return {
    paymentId:       payment.id,
    paypalOrderId:   orderId,
    paypalCaptureId: captureId,
    captureStatus,
    status:          payment.status,
    amountPyg,
    amountUsd,
    payerName,
    payerEmail,
    companyActivated: isApproved,
    failureReason:   payment.failureReason,
  };};

/**
 * Obtiene los detalles de una orden de PayPal (para verificacion).
 */
const getOrderDetails = async (orderId) => {
  return paypalFetch(`/v2/checkout/orders/${orderId}`);
};

/**
 * Reembolsa una captura de PayPal (total o parcial).
 * Docs: https://developer.paypal.com/docs/api/payments/v2/#captures_refund
 *
 * @param {object} params
 * @param {string} params.captureId   - paypalCaptureId almacenado en el Payment
 * @param {number} [params.amountUsd] - Monto a reembolsar en USD. Si se omite, reembolso total.
 * @param {string} [params.noteToPayer] - Nota opcional visible para el comprador
 * @returns {Promise<object>} respuesta del refund de PayPal (id, status, amount, ...)
 */
const refundCapture = async ({ captureId, amountUsd, noteToPayer }) => {
  if (!captureId) {
    throw Object.assign(new Error('captureId requerido para reembolsar'), { statusCode: 400 });
  }

  // Body vacío = reembolso total. Con amount = reembolso parcial.
  const body = {};
  if (amountUsd != null) {
    body.amount = { value: Number(amountUsd).toFixed(2), currency_code: 'USD' };
  }
  if (noteToPayer) {
    body.note_to_payer = noteToPayer;
  }

  return paypalFetch(`/v2/payments/captures/${captureId}/refund`, {
    method: 'POST',
    body: JSON.stringify(body),
  });
};

module.exports = {
  createOrder,
  captureOrder,
  getOrderDetails,
  refundCapture,
  getAccessToken,
  pygToUsd,
};
