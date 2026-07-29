// ─────────────────────────────────────────
// Payments Controller — Pasarela de pagos mock
// ─────────────────────────────────────────

const prisma = require('../lib/prisma');
const { validateCard, processPayment, getPaymentHistory, getSubscription, TEST_CARDS } = require('../services/payment.service');
const { logAction } = require('../services/audit.service');
const { getIp, getUserAgent } = require('../utils/request.utils');

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
      return res.status(501).json({ success: false, message: 'Pasarela de pagos no configurada para produccion' });
    }

    const { planId, cardNumber, expiryMonth, expiryYear, cvv, cardholderName } = req.body;

    // Validar que el usuario tenga empresa
    if (!req.user.companyId) {
      return res.status(400).json({ success: false, message: 'No tenes una empresa asociada' });
    }

    // Validar datos de tarjeta
    const validationErrors = validateCard({ cardNumber, expiryMonth, expiryYear, cvv, cardholderName });
    if (validationErrors.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Datos de tarjeta invalidos',
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
        message: 'Pago procesado exitosamente. Tu empresa ya esta activa!',
        data: result,
      });
    } else if (result.status === 'PENDING') {
      return res.status(202).json({
        success: true,
        message: 'Pago en proceso de verificacion',
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
 * PATCH /api/admin/companies/:id/status
 * Activar/suspender empresa manualmente (SUPER_ADMIN).
 */
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
  getCheckoutPlans,
  processCheckout,
  getHistory,
  getActiveSubscription,
  getTestCards,
  getAllPayments,
  toggleCompanyStatus,
};
