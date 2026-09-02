// ─────────────────────────────────────────
// Payments Controller — PayPal Orders API v2 (Sandbox)
// ─────────────────────────────────────────

const prisma = require('../lib/prisma');
const { validateCard, processPayment, getPaymentHistory, getSubscription, TEST_CARDS } = require('../services/payment.service');
const { createOrder, captureOrder, refundCapture, pygToUsd } = require('../services/paypal.service');
const { createDebt, getDebt }       = require('../services/adamspay.service');
const {
  PLAN_ID_TO_ENUM,
  getSubscriptionStatus,
  computeProration,
  schedulePlanChange,
  clearScheduledPlanChange,
} = require('../services/subscription.service');
const { logAction } = require('../services/audit.service');
const { getIp, getUserAgent } = require('../utils/request.utils');

/**
 * POST /api/payments/create-order
 * Crea una orden de pago en PayPal y devuelve el orderID al frontend.
 * El frontend usa ese orderID para mostrar el botón PayPal.
 * Body: { planId }
 */
const createPayPalOrder = async (req, res, next) => {
  const ip = getIp(req);
  const ua = getUserAgent(req);

  try {
    const { planId } = req.body;

    if (!planId) {
      return res.status(400).json({ success: false, message: 'Seleccioná un plan' });
    }
    if (!req.user.companyId) {
      return res.status(400).json({ success: false, message: 'No tenes una empresa asociada' });
    }

    const plan = await prisma.planConfig.findUnique({ where: { id: planId } });
    if (!plan) {
      return res.status(404).json({ success: false, message: 'Plan no encontrado' });
    }

    const result = await createOrder({
      planId,
      amountPyg: plan.priceGs,
      companyId: req.user.companyId,
      userId:    req.user.id,
    });

    await logAction({
      tenantId:  req.user.companyId,
      userId:    req.user.id,
      action:    'PAYMENT_ORDER_CREATED',
      resource:  'payments',
      resourceId: result.orderId,
      ipAddress: ip,
      userAgent: ua,
      status:    'SUCCESS',
      newValue:  { planId, orderId: result.orderId, amountUsd: result.amountUsd, amountPyg: result.amountPyg },
    });

    return res.json({
      success: true,
      data: {
        orderId:    result.orderId,
        amountUsd:  result.amountUsd,
        amountPyg:  result.amountPyg,
      },
    });
  } catch (error) {
    await logAction({
      tenantId:  req.user?.companyId,
      userId:    req.user?.id,
      action:    'PAYMENT_ORDER_FAILED',
      resource:  'payments',
      ipAddress: ip,
      userAgent: ua,
      status:    'FAILURE',
      errorMsg:  error.message,
    }).catch(() => {});
    next(error);
  }
};

/**
 * POST /api/payments/capture-order
 * Captura (cobra) la orden ya aprobada por el usuario en el popup de PayPal.
 * Body: { orderId, planId }
 */
const capturePayPalOrder = async (req, res, next) => {
  const ip = getIp(req);
  const ua = getUserAgent(req);

  try {
    const { orderId, planId } = req.body;

    if (!orderId || !planId) {
      return res.status(400).json({ success: false, message: 'orderId y planId son requeridos' });
    }
    if (!req.user.companyId) {
      return res.status(400).json({ success: false, message: 'No tenes una empresa asociada' });
    }

    const result = await captureOrder({
      orderId,
      companyId: req.user.companyId,
      planId,
      userId:    req.user.id,
    });

    const auditAction = result.status === 'APPROVED' ? 'PAYMENT_APPROVED'
      : result.status === 'PENDING' ? 'PAYMENT_PENDING'
      : 'PAYMENT_REJECTED';

    await logAction({
      tenantId:  req.user.companyId,
      userId:    req.user.id,
      action:    auditAction,
      resource:  'payments',
      resourceId: result.paymentId,
      ipAddress: ip,
      userAgent: ua,
      status:    result.status === 'APPROVED' ? 'SUCCESS' : result.status === 'PENDING' ? 'WARNING' : 'FAILURE',
      errorMsg:  result.failureReason,
      newValue:  {
        paypalOrderId:   result.paypalOrderId,
        paypalCaptureId: result.paypalCaptureId,
        amountPyg:       result.amountPyg,
        amountUsd:       result.amountUsd,
        planId,
      },
    });

    if (result.status === 'APPROVED') {
      return res.json({
        success: true,
        message: '¡Pago procesado exitosamente vía PayPal. Tu empresa ya está activa!',
        data: result,
      });
    } else if (result.status === 'PENDING') {
      return res.status(202).json({
        success: true,
        message: 'Pago en proceso de verificación por PayPal',
        data: result,
      });
    } else {
      return res.status(402).json({
        success: false,
        message: result.failureReason || 'El pago fue rechazado por PayPal',
        data: result,
      });
    }
  } catch (error) {
    await logAction({
      tenantId:  req.user?.companyId,
      userId:    req.user?.id,
      action:    'PAYMENT_CAPTURE_FAILED',
      resource:  'payments',
      ipAddress: ip,
      userAgent: ua,
      status:    'FAILURE',
      errorMsg:  error.message,
    }).catch(() => {});
    next(error);
  }
};

/**
 * POST /api/payments/adamspay/create
 * Crea una "Deuda" en AdamsPay y devuelve el payUrl al frontend.
 * El frontend redirige al usuario a ese link para pagar.
 * Body: { planId }
 */
const createAdamsPayDebt = async (req, res, next) => {
  const ip = getIp(req);
  const ua = getUserAgent(req);

  try {
    const { planId, isPlanChange } = req.body;
    if (!planId) {
      return res.status(400).json({ success: false, message: 'Seleccioná un plan' });
    }
    if (!req.user.companyId) {
      return res.status(400).json({ success: false, message: 'No tenes una empresa asociada' });
    }

    const plan = await prisma.planConfig.findUnique({ where: { id: planId } });
    if (!plan) {
      return res.status(404).json({ success: false, message: 'Plan no encontrado' });
    }

    // Monto a cobrar: por defecto el precio del plan. Si es un cambio de plan
    // (upgrade), cobramos la diferencia prorrateada calculada por el servicio.
    let amountPyg = plan.priceGs;
    let label     = `Suscripcion plan ${plan.name} — Sistema BI`;

    if (isPlanChange) {
      const proration = await computeProration(req.user.companyId, planId);
      if (proration.type !== 'UPGRADE') {
        return res.status(400).json({
          success: false,
          message: 'AdamsPay solo aplica para mejoras de plan con costo. Un downgrade se programa sin pago.',
        });
      }
      if (proration.amountToPayGs <= 0) {
        return res.status(400).json({
          success: false,
          message: 'Tu credito cubre el upgrade. No hace falta pagar.',
        });
      }
      amountPyg = proration.amountToPayGs;
      label     = `Upgrade a plan ${plan.name} (prorrateo) — Sistema BI`;
    }

    // docId unico: companyId-planId-timestamp (evita duplicados — punto 14 Apuntes)
    const docId = `${req.user.companyId}-${planId}-${Date.now()}`;

    const debt = await createDebt({
      docId,
      amountPyg,
      label,
      companyId: req.user.companyId,
      planId,
    });

    await logAction({
      tenantId:   req.user.companyId,
      userId:     req.user.id,
      action:     'ADAMSPAY_DEBT_CREATED',
      resource:   'payments',
      resourceId: debt.docId,
      ipAddress:  ip,
      userAgent:  ua,
      status:     'SUCCESS',
      newValue:   { docId: debt.docId, planId, amountPyg, isPlanChange: !!isPlanChange, payUrl: debt.payUrl },
    });

    return res.json({
      success: true,
      data: {
        docId:     debt.docId,
        payUrl:    debt.payUrl,
        amountPyg,
        label,
        expiresAt: debt.expiresAt,
      },
    });
  } catch (error) {
    await logAction({
      tenantId:  req.user?.companyId,
      userId:    req.user?.id,
      action:    'ADAMSPAY_DEBT_FAILED',
      resource:  'payments',
      ipAddress: ip,
      userAgent: ua,
      status:    'FAILURE',
      errorMsg:  error.message,
    }).catch(() => {});
    next(error);
  }
};

/**
 * POST /api/payments/adamspay/verify/:docId
 * Verifica el estado de una deuda de AdamsPay.
 * El frontend llama esto cuando el usuario regresa del link de pago.
 */
const verifyAdamsPayDebt = async (req, res, next) => {
  const ip = getIp(req);
  const ua = getUserAgent(req);

  try {
    const { docId } = req.params;
    if (!docId) {
      return res.status(400).json({ success: false, message: 'docId requerido' });
    }

    const debtData = await getDebt(docId);
    const debt     = debtData.debt || debtData;

    // AdamsPay no tiene campo "status" — el pago se detecta comparando amount.paid vs amount.value
    const amountValue = parseFloat(debt.amount?.value || '0');
    const amountPaid  = parseFloat(debt.amount?.paid  || '0');
    const isPaid      = amountPaid >= amountValue && amountValue > 0;
    const isPending   = !isPaid && amountPaid === 0;
    const isExpired   = ['EXPIRED', 'CANCELLED', 'DELETED'].includes(debt.status);

    console.log(`[AdamsPay verify] docId=${docId} isPaid=${isPaid} amountPaid=${amountPaid} amountValue=${amountValue}`);

    // Verificar que la deuda pertenece a esta empresa
    if (!docId.startsWith(req.user.companyId)) {
      return res.status(403).json({ success: false, message: 'No tenés permiso para ver esta deuda' });
    }

    if (isPaid) {
      // Activar empresa si no lo estaba (PLAN_ID_TO_ENUM centralizado en subscription.service)

      // Extraer planId del docId (formato: UUID(36 chars)-PLANID-TIMESTAMP)
      // UUID siempre tiene 36 chars. Luego viene "-PLANID-timestamp"
      const uuidLen   = 36;
      const afterUuid = docId.length > uuidLen ? docId.slice(uuidLen + 1) : '';
      const planId    = afterUuid.split('-')[0] || null; // "ESTANDAR", "PROFESIONAL", etc.

      const company = await prisma.company.findUnique({ where: { id: req.user.companyId } });

      let subscription = await prisma.subscription.findUnique({ where: { companyId: req.user.companyId } });

      if (!subscription) {
        const periodEnd = new Date();
        periodEnd.setMonth(periodEnd.getMonth() + 1);
        subscription = await prisma.subscription.create({
          data: {
            companyId:       req.user.companyId,
            planId:          planId || company?.plan || 'BASICO',
            status:          'ACTIVE',
            currentPeriodEnd: periodEnd,
          },
        });
      }

      // Registrar pago con datos reales de AdamsPay
      const amountPyg = parseInt(debt.amount?.value, 10) || 0;
      const payment = await prisma.payment.create({
        data: {
          companyId:      req.user.companyId,
          subscriptionId: subscription.id,
          amount:         amountPyg,
          currency:       'PYG',
          status:         'APPROVED',
          paymentMethod:  'adamspay',
          description:    debt.label || `Suscripcion via AdamsPay`,
          processedAt:    new Date(),
          // Guardamos el docId de AdamsPay para trazabilidad
          paypalOrderId:  null,
          paypalCaptureId: null,
          payerEmail:     null,
          payerName:      null,
        },
      });

      // Activar empresa y renovar el periodo (1 mes desde hoy).
      // Consume cualquier downgrade programado que ya no aplique.
      if (planId) {
        const periodEnd = new Date();
        periodEnd.setMonth(periodEnd.getMonth() + 1);

        await prisma.company.update({
          where: { id: req.user.companyId },
          data:  { status: 'ACTIVE', plan: PLAN_ID_TO_ENUM[planId] || company?.plan || 'BASICO' },
        });
        await prisma.subscription.update({
          where: { id: subscription.id },
          data:  {
            status: 'ACTIVE',
            planId,
            currentPeriodStart: new Date(),
            currentPeriodEnd: periodEnd,
            scheduledPlanId: null,
          },
        });
      }

      await logAction({
        tenantId:   req.user.companyId,
        userId:     req.user.id,
        action:     'ADAMSPAY_PAYMENT_APPROVED',
        resource:   'payments',
        resourceId: payment.id,
        ipAddress:  ip,
        userAgent:  ua,
        status:     'SUCCESS',
        newValue:   { docId, amountPyg, planId },
      });

      // Obtener el comprobante directamente desde la BD
      try {
        const receiptPayment = await prisma.payment.findUnique({
          where: { id: payment.id },
          include: { company: { select: { id: true, name: true, plan: true } }, subscription: true },
        });
        const payer = await prisma.user.findUnique({ where: { id: req.user.id }, select: { name: true, email: true } });
        const receiptNumber = `REC-${new Date(payment.createdAt).toISOString().slice(0,7).replace('-','')}-${payment.id.slice(-8).toUpperCase()}`;
        return res.json({ success: true, message: 'Pago confirmado via AdamsPay!', data: { paymentId: payment.id, receiptNumber, status: 'APPROVED', amountPyg: amountPyg } });
      } catch {
        return res.json({ success: true, message: 'Pago confirmado via AdamsPay!', data: { paymentId: payment.id } });
      }
    }

    if (isExpired) {
      return res.status(402).json({ success: false, message: 'La deuda expiró o fue cancelada', data: debt });
    }

    // Pendiente
    return res.status(202).json({
      success: false,
      message: isPending ? 'El pago todavía no fue procesado' : `Estado: ${debt.status}`,
      data: debt,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/payments/plans
 * Devuelve los planes disponibles con precios para el checkout.
 */
const getCheckoutPlans = async (_req, res, next) => {
  try {
    const plans = await prisma.planConfig.findMany({
      where: { active: true },
      orderBy: { priceGs: 'asc' },
    });
    res.json({ success: true, data: plans });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/payments/process
 * Procesa un pago con tarjeta (mock).
 * Body: { planId, cardNumber, expiryMonth, expiryYear, cvv, cardholderName }
 */
const processCheckout = async (req, res, next) => {
  const ip = getIp(req);
  const ua = getUserAgent(req);

  try {
    // Bloquear en produccion (mock no debe usarse en prod)
    if (process.env.NODE_ENV === 'production') {
      return res.status(501).json({ success: false, message: 'Pasarela de pagos no configurada para producción' });
    }

    const { planId, cardNumber, expiryMonth, expiryYear, cvv, cardholderName } = req.body;

    // Validar campos requeridos
    if (!planId) {
      return res.status(400).json({ success: false, message: 'Seleccioná un plan' });
    }

    // Validar que el usuario tenga empresa
    if (!req.user.companyId) {
      return res.status(400).json({ success: false, message: 'No tenes una empresa asociada' });
    }

    // Validar datos de tarjeta
    const validationErrors = validateCard({ cardNumber, expiryMonth, expiryYear, cvv, cardholderName });
    if (validationErrors.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Datos de tarjeta inválidos',
        errors: validationErrors,
      });
    }

    // Obtener plan y su precio
    const plan = await prisma.planConfig.findUnique({ where: { id: planId } });
    if (!plan) {
      return res.status(404).json({ success: false, message: 'Plan no encontrado' });
    }

    // Procesar pago
    const result = await processPayment({
      companyId: req.user.companyId,
      planId,
      amount: plan.priceGs,
      cardData: { cardNumber, expiryMonth, expiryYear, cvv, cardholderName },
    });

    // Auditar
    const auditAction = result.status === 'APPROVED' ? 'PAYMENT_APPROVED'
      : result.status === 'PENDING' ? 'PAYMENT_PENDING'
      : 'PAYMENT_REJECTED';
    const auditStatus = result.status === 'APPROVED' ? 'SUCCESS'
      : result.status === 'PENDING' ? 'WARNING'
      : 'FAILURE';

    await logAction({
      tenantId: req.user.companyId,
      userId: req.user.id,
      action: auditAction,
      resource: 'payments',
      resourceId: result.paymentId,
      ipAddress: ip,
      userAgent: ua,
      status: auditStatus,
      errorMsg: result.failureReason,
      newValue: {
        amount: result.amount,
        cardBrand: result.cardBrand,
        cardLast4: result.cardLast4,
        planId,
      },
    });

    if (result.status === 'APPROVED') {
      return res.json({
        success: true,
        message: '¡Pago procesado exitosamente. Tu empresa ya está activa!',
        data: result,
      });
    } else if (result.status === 'PENDING') {
      return res.status(202).json({
        success: true,
        message: 'Pago en proceso de verificación',
        data: result,
      });
    } else {
      return res.status(402).json({
        success: false,
        message: result.failureReason || 'El pago fue rechazado',
        data: result,
      });
    }
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/payments/history
 * Historial de pagos de la empresa del usuario.
 */
const getHistory = async (req, res, next) => {
  try {
    if (!req.user.companyId) {
      return res.status(400).json({ success: false, message: 'No tenes empresa asociada' });
    }

    const payments = await getPaymentHistory(req.user.companyId);
    res.json({ success: true, data: payments });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/payments/subscription
 * Suscripcion activa de la empresa.
 */
const getActiveSubscription = async (req, res, next) => {
  try {
    if (!req.user.companyId) {
      return res.status(400).json({ success: false, message: 'No tenes empresa asociada' });
    }

    const subscription = await getSubscription(req.user.companyId);
    res.json({ success: true, data: subscription });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/payments/subscription/status
 * Estado de la suscripción enriquecido: días restantes, si está por vencer,
 * si venció. Usado por el frontend para mostrar el banner de vencimiento.
 */
const getSubscriptionStatusHandler = async (req, res, next) => {
  try {
    if (!req.user.companyId) {
      return res.status(400).json({ success: false, message: 'No tenes empresa asociada' });
    }

    const [status, company] = await Promise.all([
      getSubscriptionStatus(req.user.companyId),
      prisma.company.findUnique({
        where: { id: req.user.companyId },
        select: { status: true },
      }),
    ]);

    // companyStatus es el estado de la CUENTA (fresco desde BD), distinto del
    // status de la suscripción. Permite al frontend distinguir SUSPENDED de
    // PENDING_PAYMENT sin depender del token, que puede estar desactualizado.
    const companyStatus = company?.status ?? null;

    if (!status) {
      return res.json({
        success: true,
        data: { hasSubscription: false, companyStatus },
      });
    }

    res.json({ success: true, data: { hasSubscription: true, companyStatus, ...status } });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/payments/plan-change/preview?planId=XXX
 * Previsualiza un cambio de plan: si es upgrade devuelve el monto prorrateado
 * a pagar; si es downgrade indica que se programa para el próximo ciclo.
 */
const previewPlanChange = async (req, res, next) => {
  try {
    if (!req.user.companyId) {
      return res.status(400).json({ success: false, message: 'No tenes empresa asociada' });
    }
    const { planId } = req.query;
    if (!planId) {
      return res.status(400).json({ success: false, message: 'planId es requerido' });
    }

    const proration = await computeProration(req.user.companyId, planId);
    res.json({ success: true, data: proration });
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({ success: false, message: error.message });
    }
    next(error);
  }
};

/**
 * POST /api/payments/plan-change
 * Ejecuta un cambio de plan.
 * Body: { planId }
 *  - DOWNGRADE: se programa para el próximo ciclo (sin cobro). Responde 200.
 *  - UPGRADE: crea una orden PayPal por la diferencia prorrateada. Responde con orderId
 *    para que el frontend abra el botón de PayPal. El plan se aplica al capturar.
 */
const executePlanChange = async (req, res, next) => {
  const ip = getIp(req);
  const ua = getUserAgent(req);

  try {
    if (!req.user.companyId) {
      return res.status(400).json({ success: false, message: 'No tenes empresa asociada' });
    }
    const { planId } = req.body;
    if (!planId) {
      return res.status(400).json({ success: false, message: 'planId es requerido' });
    }

    const proration = await computeProration(req.user.companyId, planId);

    // ── DOWNGRADE: programar para el próximo ciclo ──────────────────────────
    if (proration.type === 'DOWNGRADE') {
      await schedulePlanChange(req.user.companyId, planId);

      await logAction({
        tenantId:   req.user.companyId,
        userId:     req.user.id,
        action:     'PLAN_DOWNGRADE_SCHEDULED',
        resource:   'subscriptions',
        ipAddress:  ip,
        userAgent:  ua,
        status:     'SUCCESS',
        newValue:   { from: proration.currentPlanId, to: planId, effective: proration.currentPeriodEnd },
      });

      return res.json({
        success: true,
        data: {
          type: 'DOWNGRADE',
          scheduled: true,
          effectiveDate: proration.currentPeriodEnd,
          message: `Tu plan cambiará a ${planId} al finalizar el ciclo actual (${new Date(proration.currentPeriodEnd).toLocaleDateString('es-PY')}).`,
        },
      });
    }

    // ── UPGRADE: crear orden PayPal por la diferencia prorrateada ───────────
    // Si la diferencia es 0 (crédito cubre todo), aplicar directo sin cobro.
    if (proration.amountToPayGs <= 0) {
      // Aplicar upgrade inmediato sin cobro
      const periodEnd = new Date();
      periodEnd.setMonth(periodEnd.getMonth() + 1);
      await prisma.subscription.update({
        where: { companyId: req.user.companyId },
        data:  { planId, currentPeriodStart: new Date(), currentPeriodEnd: periodEnd, status: 'ACTIVE', scheduledPlanId: null },
      });
      await prisma.company.update({
        where: { id: req.user.companyId },
        data:  { plan: PLAN_ID_TO_ENUM[planId] || 'BASICO', status: 'ACTIVE' },
      });

      await logAction({
        tenantId: req.user.companyId, userId: req.user.id,
        action: 'PLAN_UPGRADE_FREE', resource: 'subscriptions',
        ipAddress: ip, userAgent: ua, status: 'SUCCESS',
        newValue: { to: planId, creditCoveredFull: true },
      });

      return res.json({
        success: true,
        data: { type: 'UPGRADE', paid: false, applied: true, message: 'Upgrade aplicado sin costo adicional (crédito suficiente).' },
      });
    }

    const order = await createOrder({
      planId,
      amountPyg:  proration.amountToPayGs,
      companyId:  req.user.companyId,
      userId:     req.user.id,
      changeType: 'upgrade',
    });

    await logAction({
      tenantId:   req.user.companyId,
      userId:     req.user.id,
      action:     'PLAN_UPGRADE_ORDER_CREATED',
      resource:   'payments',
      resourceId: order.orderId,
      ipAddress:  ip,
      userAgent:  ua,
      status:     'SUCCESS',
      newValue:   { to: planId, amountToPayGs: proration.amountToPayGs, orderId: order.orderId },
    });

    return res.json({
      success: true,
      data: {
        type: 'UPGRADE',
        paid: false,
        orderId:      order.orderId,
        amountUsd:    order.amountUsd,
        amountPyg:    proration.amountToPayGs,
        unusedCreditGs: proration.unusedCreditGs,
        planId,
      },
    });
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({ success: false, message: error.message });
    }
    next(error);
  }
};

/**
 * DELETE /api/payments/plan-change
 * Cancela un downgrade programado.
 */
const cancelScheduledPlanChange = async (req, res, next) => {
  try {
    if (!req.user.companyId) {
      return res.status(400).json({ success: false, message: 'No tenes empresa asociada' });
    }
    await clearScheduledPlanChange(req.user.companyId);
    res.json({ success: true, message: 'Cambio de plan programado cancelado' });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/payments/test-cards
 * Devuelve las tarjetas de prueba disponibles (solo en desarrollo).
 */
const getTestCards = (_req, res) => {
  if (process.env.NODE_ENV === 'production') {
    return res.status(404).json({ success: false, message: 'No disponible' });
  }

  const cards = Object.entries(TEST_CARDS).map(([number, info]) => ({
    number,
    brand: info.brand,
    expectedResult: info.status,
    reason: info.reason || null,
    name: info.name || null,
  }));

  res.json({ success: true, data: cards });
};

/**
 * GET /api/admin/payments
 * Lista todos los pagos del sistema (SUPER_ADMIN).
 */
const getAllPayments = async (req, res, next) => {
  try {
    const { status, companyId, page = '1', pageSize = '20' } = req.query;
    const pg = Math.max(1, parseInt(page, 10) || 1);
    const size = Math.min(50, Math.max(1, parseInt(pageSize, 10) || 20));

    const where = {};
    if (status) where.status = status;
    if (companyId) where.companyId = companyId;

    const [data, total] = await Promise.all([
      prisma.payment.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (pg - 1) * size,
        take: size,
        include: { company: { select: { name: true } } },
      }),
      prisma.payment.count({ where }),
    ]);

    res.json({
      success: true,
      data,
      total,
      page: pg,
      pageSize: size,
      total_pages: Math.ceil(total / size) || 1,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/payments/receipt/:paymentId
 * Devuelve el comprobante de pago estructurado (punto 36 Apuntes UNIDA).
 * Solo el propietario del pago puede verlo.
 */
const getReceipt = async (req, res, next) => {
  try {
    const { paymentId } = req.params;

    const payment = await prisma.payment.findUnique({
      where: { id: paymentId },
      include: {
        company: {
          select: {
            id: true,
            name: true,
            plan: true,
          },
        },
        subscription: {
          select: {
            id: true,
            planId: true,
            currentPeriodStart: true,
            currentPeriodEnd: true,
          },
        },
      },
    });

    if (!payment) {
      return res.status(404).json({ success: false, message: 'Comprobante no encontrado' });
    }

    // Solo el propietario puede ver su comprobante
    if (payment.companyId !== req.user.companyId) {
      return res.status(403).json({ success: false, message: 'No tenes permiso para ver este comprobante' });
    }

    // Obtener usuario pagador
    const payer = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { name: true, email: true },
    });

    // Formatear numero de recibo: REC-YYYYMM-XXXX (ultimos 8 chars del UUID)
    const receiptNumber = `REC-${new Date(payment.createdAt).toISOString().slice(0, 7).replace('-', '')}-${payment.id.slice(-8).toUpperCase()}`;

    const receipt = {
      // Identificacion del recibo (punto 36)
      receiptNumber,
      receiptId:    payment.id,
      issuedAt:     payment.processedAt || payment.createdAt,
      status:       payment.status, // APPROVED | PENDING | REJECTED

      // Datos del emisor
      emitter: {
        name:  'Sistema BI — Retencion de Talento',
        email: 'noreply@sistema-bi.com',
        note:  'Desarrollado como Trabajo de Tesis — UNIDA Paraguay',
      },

      // Datos del pagador
      payer: {
        companyName: payment.company?.name ?? '',
        contactName: payer?.name ?? '',
        email:       payer?.email ?? '',
      },

      // Detalle del concepto
      concept: {
        description: payment.description || `Suscripcion plan ${payment.subscription?.planId ?? ''}`,
        plan:        payment.subscription?.planId ?? payment.company?.plan ?? '',
        periodStart: payment.subscription?.currentPeriodStart ?? null,
        periodEnd:   payment.subscription?.currentPeriodEnd   ?? null,
      },

      // Informacion del monto
      amount: {
        value:    payment.amount,
        currency: payment.currency,
        inWords:  numberToWords(payment.amount), // helper local
        total:    payment.amount,
      },

      // Forma de pago
      paymentMethod: {
        type:      payment.paymentMethod,
        cardBrand: payment.cardBrand ?? null,
        cardLast4: payment.cardLast4 ?? null,
      },

      // Trazabilidad PayPal
      paypalOrderId:   payment.paypalOrderId   ?? null,
      paypalCaptureId: payment.paypalCaptureId ?? null,
      payerName:       payment.payerName       ?? payer?.name ?? null,
      payerEmail:      payment.payerEmail      ?? payer?.email ?? null,

      // Trazabilidad
      processedAt:   payment.processedAt,
      failureReason: payment.failureReason ?? null,

      // Leyenda legal
      legalNote: 'Este comprobante electronico acredita unicamente la recepcion del importe indicado y ha sido generado por el Sistema BI de Retencion de Talento.',
    };

    res.json({ success: true, data: receipt });
  } catch (error) {
    next(error);
  }
};

// ─── Helper: convierte monto a palabras (PYG) ────────────────────────────────
const numberToWords = (amount) => {
  if (!amount || amount <= 0) return 'cero guaranies';
  const units  = ['', 'un', 'dos', 'tres', 'cuatro', 'cinco', 'seis', 'siete', 'ocho', 'nueve',
                  'diez', 'once', 'doce', 'trece', 'catorce', 'quince', 'dieciseis',
                  'diecisiete', 'dieciocho', 'diecinueve'];
  const tens   = ['', '', 'veinte', 'treinta', 'cuarenta', 'cincuenta', 'sesenta', 'setenta', 'ochenta', 'noventa'];
  const hundreds = ['', 'cien', 'doscientos', 'trescientos', 'cuatrocientos', 'quinientos',
                   'seiscientos', 'setecientos', 'ochocientos', 'novecientos'];

  const convert = (n) => {
    if (n === 0) return '';
    if (n < 20)  return units[n];
    if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 ? ' y ' + units[n % 10] : '');
    if (n < 1000) {
      const h = Math.floor(n / 100);
      const rest = n % 100;
      return (n === 100 ? 'cien' : hundreds[h]) + (rest ? ' ' + convert(rest) : '');
    }
    if (n < 1000000) {
      const m = Math.floor(n / 1000);
      const rest = n % 1000;
      return (m === 1 ? 'mil' : convert(m) + ' mil') + (rest ? ' ' + convert(rest) : '');
    }
    const m = Math.floor(n / 1000000);
    const rest = n % 1000000;
    return (m === 1 ? 'un millon' : convert(m) + ' millones') + (rest ? ' ' + convert(rest) : '');
  };

  return convert(Math.floor(amount)) + ' guaranies';
};

/**
 * POST /api/admin/payments/:id/refund
 * Reembolsa un pago (SUPER_ADMIN). Solo aplica a pagos APPROVED con paypalCaptureId.
 * Body: { amountPyg?, reason?, suspendCompany? }
 *   - amountPyg: monto parcial a reembolsar (en Gs). Si se omite, reembolso total.
 *   - suspendCompany: si true, suspende la empresa tras el reembolso.
 */
const refundPayment = async (req, res, next) => {
  const ip = getIp(req);
  const ua = getUserAgent(req);

  try {
    const { id } = req.params;
    const { amountPyg, reason, suspendCompany } = req.body;

    const payment = await prisma.payment.findUnique({ where: { id } });
    if (!payment) {
      return res.status(404).json({ success: false, message: 'Pago no encontrado' });
    }

    if (payment.status !== 'APPROVED') {
      return res.status(400).json({
        success: false,
        message: `Solo se pueden reembolsar pagos aprobados (estado actual: ${payment.status})`,
      });
    }

    if (!payment.paypalCaptureId) {
      return res.status(400).json({
        success: false,
        message: 'Este pago no tiene captura de PayPal asociada. Reembolso manual requerido para otros metodos.',
      });
    }

    // Validar monto parcial (no puede exceder el total)
    let partialUsd;
    if (amountPyg != null) {
      const partial = parseInt(amountPyg, 10);
      if (isNaN(partial) || partial <= 0 || partial > payment.amount) {
        return res.status(400).json({
          success: false,
          message: `amountPyg debe ser un numero entre 1 y ${payment.amount}`,
        });
      }
      partialUsd = await pygToUsd(partial);
    }

    // Ejecutar el reembolso en PayPal
    const refund = await refundCapture({
      captureId:   payment.paypalCaptureId,
      amountUsd:   partialUsd, // undefined = total
      noteToPayer: reason || 'Reembolso procesado por el administrador',
    });

    // Marcar el pago como REFUNDED en la BD
    const updated = await prisma.payment.update({
      where: { id },
      data:  {
        status:        'REFUNDED',
        failureReason: reason || `Reembolsado (PayPal refund ${refund.id})`,
      },
    });

    // Opcionalmente suspender la empresa
    if (suspendCompany === true) {
      await prisma.company.update({
        where: { id: payment.companyId },
        data:  { status: 'SUSPENDED' },
      }).catch(() => {});
      await prisma.subscription.updateMany({
        where: { companyId: payment.companyId },
        data:  { status: 'CANCELED', canceledAt: new Date() },
      }).catch(() => {});
    }

    await logAction({
      tenantId:   payment.companyId,
      userId:     req.user.id,
      action:     'PAYMENT_REFUNDED',
      resource:   'payments',
      resourceId: id,
      ipAddress:  ip,
      userAgent:  ua,
      status:     'SUCCESS',
      oldValue:   { status: 'APPROVED', amount: payment.amount },
      newValue:   {
        status: 'REFUNDED',
        refundId: refund.id,
        refundStatus: refund.status,
        amountPyg: amountPyg ?? payment.amount,
        suspendCompany: suspendCompany === true,
      },
    });

    res.json({
      success: true,
      message: 'Reembolso procesado correctamente',
      data: {
        payment: updated,
        refund: { id: refund.id, status: refund.status, amount: refund.amount },
      },
    });
  } catch (error) {
    // Registrar fallo de reembolso para trazabilidad
    await logAction({
      userId:    req.user.id,
      action:    'PAYMENT_REFUND_FAILED',
      resource:  'payments',
      resourceId: req.params.id,
      ipAddress: ip,
      userAgent: ua,
      status:    'FAILURE',
      errorMsg:  error.message,
    });
    next(error);
  }
};

const toggleCompanyStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body; // ACTIVE, SUSPENDED, TRIAL

    const validStatuses = ['ACTIVE', 'SUSPENDED', 'TRIAL', 'PENDING_PAYMENT'];
    if (!status || !validStatuses.includes(status)) {
      return res.status(400).json({ success: false, message: `Status invalido. Opciones: ${validStatuses.join(', ')}` });
    }

    const company = await prisma.company.findUnique({ where: { id } });
    if (!company) {
      return res.status(404).json({ success: false, message: 'Empresa no encontrada' });
    }

    const updated = await prisma.company.update({
      where: { id },
      data: { status },
    });

    await logAction({
      userId: req.user.id,
      action: 'COMPANY_STATUS_CHANGED',
      resource: 'companies',
      resourceId: id,
      ipAddress: getIp(req),
      userAgent: getUserAgent(req),
      status: 'SUCCESS',
      oldValue: { status: company.status },
      newValue: { status: updated.status },
    });

    res.json({ success: true, data: updated });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createPayPalOrder,
  capturePayPalOrder,
  createAdamsPayDebt,
  verifyAdamsPayDebt,
  getCheckoutPlans,
  processCheckout,
  getHistory,
  getActiveSubscription,
  getSubscriptionStatusHandler,
  previewPlanChange,
  executePlanChange,
  cancelScheduledPlanChange,
  getTestCards,
  getAllPayments,
  toggleCompanyStatus,
  refundPayment,
  getReceipt,
};
