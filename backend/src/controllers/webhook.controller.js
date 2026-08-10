// ─────────────────────────────────────────
// webhook.controller.js — PayPal Webhooks
// Recibe eventos de PayPal y los procesa de forma asíncrona.
// Endpoint: POST /api/webhooks/paypal
//
// IMPORTANTE: esta ruta NO debe tener middleware de auth (JWT).
// PayPal llama directamente sin token de usuario.
// La seguridad se garantiza verificando la firma del webhook.
//
// Docs: https://developer.paypal.com/api/rest/webhooks/
// ─────────────────────────────────────────

const prisma  = require('../lib/prisma');
const { getAccessToken } = require('../services/paypal.service');
const { getPygToUsdRate } = require('../services/systemConfig.service');

// Eventos que nos interesan manejar
const HANDLED_EVENTS = [
  'PAYMENT.CAPTURE.COMPLETED',   // Pago capturado y completado
  'PAYMENT.CAPTURE.DENIED',      // Pago denegado
  'PAYMENT.CAPTURE.PENDING',     // Pago en revision
  'PAYMENT.CAPTURE.REVERSED',    // Pago revertido / disputa
  'BILLING.SUBSCRIPTION.EXPIRED',    // Suscripcion expirada
  'BILLING.SUBSCRIPTION.CANCELLED',  // Suscripcion cancelada
  'CUSTOMER.DISPUTE.CREATED',        // Disputa/chargeback iniciada
];

// ─── Verificacion de firma de PayPal ─────────────────────────────────────────
/**
 * Verifica que el webhook realmente viene de PayPal usando su API de verificacion.
 * Esto previene que atacantes falsifiquen eventos.
 * Docs: https://developer.paypal.com/api/rest/webhooks/rest/#link-verifywebhooksignature
 */
const verifyWebhookSignature = async (req) => {
  const webhookId = process.env.PAYPAL_WEBHOOK_ID;

  // Si no hay WEBHOOK_ID configurado, saltear verificacion (solo dev sin ngrok)
  if (!webhookId) {
    console.warn('[Webhook] PAYPAL_WEBHOOK_ID no configurado — saltando verificacion de firma');
    return true;
  }

  const PAYPAL_BASE_URL = process.env.PAYPAL_ENVIRONMENT === 'PRODUCTION'
    ? 'https://api-m.paypal.com'
    : 'https://api-m.sandbox.paypal.com';

  const token = await getAccessToken();

  const verifyBody = {
    auth_algo:         req.headers['paypal-auth-algo'],
    cert_url:          req.headers['paypal-cert-url'],
    transmission_id:   req.headers['paypal-transmission-id'],
    transmission_sig:  req.headers['paypal-transmission-sig'],
    transmission_time: req.headers['paypal-transmission-time'],
    webhook_id:        webhookId,
    webhook_event:     req.body,
  };

  const response = await fetch(
    `${PAYPAL_BASE_URL}/v1/notifications/verify-webhook-signature`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type':  'application/json',
      },
      body: JSON.stringify(verifyBody),
    }
  );

  if (!response.ok) {
    console.error('[Webhook] Error verificando firma con PayPal:', response.status);
    return false;
  }

  const result = await response.json();
  // PayPal devuelve "SUCCESS" cuando la firma es valida
  return result.verification_status === 'SUCCESS';
};

// ─── Handlers por tipo de evento ─────────────────────────────────────────────

/**
 * PAYMENT.CAPTURE.COMPLETED
 * El pago fue completado. Activar empresa si no lo estaba.
 */
const handleCaptureCompleted = async (resource) => {
  const customId = resource.custom_id; // formato: "companyId:planId:userId"
  if (!customId) return;

  const [companyId, planId] = customId.split(':');
  if (!companyId) return;

  const PLAN_ID_TO_ENUM = {
    ESTANDAR: 'BASICO', PROFESIONAL: 'PROFESIONAL', CORPORATIVO: 'CORPORATIVO',
  };

  const company = await prisma.company.findUnique({ where: { id: companyId } });
  if (!company) return;

  // Solo activar si no estaba activa (evitar doble procesamiento)
  if (company.status !== 'ACTIVE') {
    await prisma.company.update({
      where: { id: companyId },
      data: {
        status: 'ACTIVE',
        plan:   PLAN_ID_TO_ENUM[planId] || company.plan,
      },
    });
    console.log(`[Webhook] Empresa ${companyId} activada via PAYMENT.CAPTURE.COMPLETED`);
  }

  // Actualizar el payment en BD con el captureId si existe
  const captureId = resource.id;
  if (captureId) {
    // Buscar el payment por metadata (puede no existir si la captura fue manual)
    await prisma.payment.updateMany({
      where: {
        companyId,
        status: 'PENDING',
      },
      data: { status: 'APPROVED', processedAt: new Date() },
    });
  }
};

/**
 * PAYMENT.CAPTURE.DENIED / REVERSED
 * El pago fue denegado o revertido. Suspender empresa.
 */
const handleCaptureDeniedOrReversed = async (resource, eventType) => {
  const customId = resource.custom_id;
  if (!customId) return;

  const [companyId] = customId.split(':');
  if (!companyId) return;

  await prisma.company.update({
    where: { id: companyId },
    data:  { status: 'SUSPENDED' },
  }).catch(() => {}); // ignorar si no existe

  await prisma.payment.updateMany({
    where: { companyId, status: { in: ['PENDING', 'APPROVED'] } },
    data:  {
      status:        'REJECTED',
      failureReason: `PayPal: ${eventType}`,
    },
  }).catch(() => {});

  console.log(`[Webhook] Empresa ${companyId} suspendida via ${eventType}`);
};

/**
 * BILLING.SUBSCRIPTION.EXPIRED / CANCELLED
 * La suscripcion expiro o fue cancelada.
 */
const handleSubscriptionEnded = async (resource, eventType) => {
  const subscriptionId = resource.id;
  if (!subscriptionId) return;

  // Buscar suscripcion por referencia externa de PayPal (si la guardamos)
  // Por ahora actualizamos por companyId si viene en custom_id
  const customId = resource.custom_id || resource.subscriber?.payer_id;
  if (customId) {
    const [companyId] = customId.split(':');
    if (companyId) {
      await prisma.subscription.updateMany({
        where: { companyId },
        data:  { status: 'EXPIRED' },
      }).catch(() => {});
      await prisma.company.update({
        where: { id: companyId },
        data:  { status: 'PENDING_PAYMENT' },
      }).catch(() => {});
      console.log(`[Webhook] Suscripcion de empresa ${companyId} marcada como EXPIRED via ${eventType}`);
    }
  }
};

/**
 * CUSTOMER.DISPUTE.CREATED
 * El comprador abrió una disputa. Registrar en audit logs.
 */
const handleDisputeCreated = async (resource) => {
  console.warn(`[Webhook] Disputa creada — ID: ${resource.dispute_id}, monto: ${JSON.stringify(resource.dispute_amount)}`);
  // Podria suspender acceso o notificar al admin
};

// ─── Controlador principal ────────────────────────────────────────────────────

/**
 * POST /api/webhooks/paypal
 * Endpoint público que recibe eventos de PayPal.
 * Responde 200 inmediatamente y procesa de forma asíncrona.
 */
const handlePayPalWebhook = async (req, res) => {
  // 1. Responder 200 inmediatamente para que PayPal no reintente
  res.status(200).json({ received: true });

  try {
    // 2. Verificar firma (seguridad — evita eventos falsos)
    const isValid = await verifyWebhookSignature(req);
    if (!isValid) {
      console.error('[Webhook] Firma invalida — evento descartado');
      return;
    }

    const eventType = req.body.event_type;
    const resource  = req.body.resource || {};
    const summary   = req.body.summary  || '';

    console.log(`[Webhook] Evento recibido: ${eventType} — ${summary}`);

    // 3. Registrar el evento en audit_logs para trazabilidad
    await prisma.auditLog.create({
      data: {
        action:    `PAYPAL_WEBHOOK_${eventType}`,
        resource:  'webhooks',
        resourceId: req.body.id || resource.id,
        status:    'SUCCESS',
        newValue:  JSON.stringify({
          eventType,
          summary,
          resourceId: resource.id,
          customId:   resource.custom_id,
        }),
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
      },
    }).catch((e) => console.error('[Webhook] Error guardando audit log:', e.message));

    // 4. Procesar segun tipo de evento
    if (!HANDLED_EVENTS.includes(eventType)) {
      console.log(`[Webhook] Evento ${eventType} no manejado — ignorado`);
      return;
    }

    switch (eventType) {
      case 'PAYMENT.CAPTURE.COMPLETED':
        await handleCaptureCompleted(resource);
        break;

      case 'PAYMENT.CAPTURE.DENIED':
      case 'PAYMENT.CAPTURE.REVERSED':
        await handleCaptureDeniedOrReversed(resource, eventType);
        break;

      case 'PAYMENT.CAPTURE.PENDING':
        console.log(`[Webhook] Captura pendiente — resource.id: ${resource.id}`);
        break;

      case 'BILLING.SUBSCRIPTION.EXPIRED':
      case 'BILLING.SUBSCRIPTION.CANCELLED':
        await handleSubscriptionEnded(resource, eventType);
        break;

      case 'CUSTOMER.DISPUTE.CREATED':
        await handleDisputeCreated(resource);
        break;

      default:
        console.log(`[Webhook] Sin handler para ${eventType}`);
    }

  } catch (err) {
    // No lanzar — ya respondimos 200 a PayPal
    console.error('[Webhook] Error procesando evento:', err.message);
  }
};

module.exports = { handlePayPalWebhook };

// ─────────────────────────────────────────
// Handler: AdamsPay Webhook
// AdamsPay llama a POST /api/webhooks/adamspay cuando una deuda cambia de estado.
// No usa firma — la seguridad es por secreto compartido en el header (si lo configuraron)
// o por validar que el docId exista en nuestra BD.
// ─────────────────────────────────────────

const PLAN_ID_TO_ENUM = {
  ESTANDAR: 'BASICO', PROFESIONAL: 'PROFESIONAL', CORPORATIVO: 'CORPORATIVO',
};

/**
 * POST /api/webhooks/adamspay
 */
const handleAdamsPayWebhook = async (req, res) => {
  // Responder 200 inmediatamente
  res.status(200).json({ received: true });

  try {
    const payload = req.body;
    const debt    = payload.debt || payload;
    const docId   = debt.docId || debt.doc_id;
    const status  = debt.status;

    console.log(`[AdamsPay Webhook] docId=${docId} status=${status}`);

    if (!docId) {
      console.warn('[AdamsPay Webhook] Sin docId — ignorado');
      return;
    }

    // Registrar en audit_logs
    await prisma.auditLog.create({
      data: {
        action:     `ADAMSPAY_WEBHOOK_${status || 'UNKNOWN'}`,
        resource:   'webhooks',
        resourceId: docId,
        status:     'SUCCESS',
        newValue:   JSON.stringify({ docId, status, payload }),
        ipAddress:  req.ip,
        userAgent:  req.headers['user-agent'],
      },
    }).catch((e) => console.error('[AdamsPay Webhook] Error audit log:', e.message));

    // Solo procesar si fue PAID
    // AdamsPay no tiene campo status — detectamos pago por amount.paid >= amount.value
    const amountValue = parseFloat(debt.amount?.value || '0');
    const amountPaid  = parseFloat(debt.amount?.paid  || '0');
    const debtIsPaid  = (amountPaid >= amountValue && amountValue > 0) || status === 'PAID';

    if (!debtIsPaid) {
      console.log(`[AdamsPay Webhook] No pagado — amountPaid=${amountPaid} amountValue=${amountValue} status=${status}`);
      return;
    }

    // Extraer companyId del docId (formato: companyId-planId-timestamp)
    // El companyId es un UUID (5 partes con guiones), el planId está después
    // Ejemplo: "ee95653b-4e6f-415c-9c5c-802e3407875a-ESTANDAR-1720000000000"
    const uuidRegex = /^([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})-(\w+)-\d+$/i;
    const match     = docId.match(uuidRegex);

    if (!match) {
      console.warn(`[AdamsPay Webhook] docId con formato inesperado: ${docId}`);
      return;
    }

    const companyId = match[1];
    const planId    = match[2];

    const company = await prisma.company.findUnique({ where: { id: companyId } });
    if (!company) {
      console.warn(`[AdamsPay Webhook] Empresa ${companyId} no encontrada`);
      return;
    }

    // Solo activar si no estaba activa (idempotente)
    if (company.status !== 'ACTIVE') {
      const periodEnd = new Date();
      periodEnd.setMonth(periodEnd.getMonth() + 1);

      let subscription = await prisma.subscription.findUnique({ where: { companyId } });
      if (!subscription) {
        subscription = await prisma.subscription.create({
          data: { companyId, planId, status: 'ACTIVE', currentPeriodEnd: periodEnd },
        });
      } else {
        await prisma.subscription.update({
          where: { id: subscription.id },
          data:  { status: 'ACTIVE', planId, currentPeriodEnd: periodEnd },
        });
      }

      await prisma.payment.create({
        data: {
          companyId,
          subscriptionId: subscription.id,
          amount:         debt.amount?.value || 0,
          currency:       'PYG',
          status:         'APPROVED',
          paymentMethod:  'adamspay',
          description:    debt.label || `Suscripcion plan ${planId} via AdamsPay`,
          processedAt:    new Date(),
        },
      });

      await prisma.company.update({
        where: { id: companyId },
        data:  { status: 'ACTIVE', plan: PLAN_ID_TO_ENUM[planId] || company.plan },
      });

      console.log(`[AdamsPay Webhook] Empresa ${companyId} activada (plan ${planId})`);
    }

  } catch (err) {
    console.error('[AdamsPay Webhook] Error procesando evento:', err.message);
  }
};

module.exports = { handlePayPalWebhook, handleAdamsPayWebhook };
