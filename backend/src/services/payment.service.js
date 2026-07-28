// ─────────────────────────────────────────
// Servicio de pagos MOCK
// Simula una pasarela de pagos (Bancard vPos / Mercado Pago)
// con tarjetas de prueba predefinidas.
// ─────────────────────────────────────────

const prisma = require('../lib/prisma');

// ─── Tarjetas de prueba ──────────────────────────────────────────────────────

const TEST_CARDS = {
  // Tarjetas que APRUEBAN el pago
  '4242424242424242': { brand: 'VISA', status: 'APPROVED', name: 'Visa Test Aprobada' },
  '5555555555554444': { brand: 'MASTERCARD', status: 'APPROVED', name: 'Mastercard Test Aprobada' },
  '4000000000000077': { brand: 'VISA', status: 'APPROVED', name: 'Visa Debito Aprobada' },

  // Tarjetas que RECHAZAN el pago
  '4000000000000002': { brand: 'VISA', status: 'REJECTED', reason: 'Tarjeta rechazada por el banco emisor' },
  '4000000000009995': { brand: 'VISA', status: 'REJECTED', reason: 'Fondos insuficientes' },
  '4000000000009987': { brand: 'VISA', status: 'REJECTED', reason: 'Tarjeta vencida' },
  '5555555555554443': { brand: 'MASTERCARD', status: 'REJECTED', reason: 'CVV incorrecto' },

  // Tarjeta que queda PENDIENTE (simula procesamiento lento)
  '4000000000003220': { brand: 'VISA', status: 'PENDING', reason: 'Requiere verificacion adicional' },
};

/**
 * Detecta la marca de la tarjeta por el numero.
 */
const detectCardBrand = (cardNumber) => {
  const clean = cardNumber.replace(/\s/g, '');
  if (clean.startsWith('4')) return 'VISA';
  if (clean.startsWith('5')) return 'MASTERCARD';
  if (clean.startsWith('3')) return 'AMEX';
  return 'DESCONOCIDA';
};

/**
 * Valida el formato basico de la tarjeta.
 */
const validateCard = ({ cardNumber, expiryMonth, expiryYear, cvv, cardholderName }) => {
  const errors = [];
  const clean = (cardNumber || '').replace(/\s/g, '');

  if (!clean || clean.length < 13 || clean.length > 19) {
    errors.push('Numero de tarjeta invalido');
  }
  if (!expiryMonth || !expiryYear) {
    errors.push('Fecha de vencimiento requerida');
  } else {
    const month = parseInt(expiryMonth, 10);
    const year = parseInt(expiryYear, 10);
    const now = new Date();
    const expiry = new Date(year, month);
    if (month < 1 || month > 12) errors.push('Mes invalido');
    if (expiry < now) errors.push('Tarjeta vencida');
  }
  if (!cvv || cvv.length < 3 || cvv.length > 4) {
    errors.push('CVV invalido');
  }
  if (!cardholderName || cardholderName.trim().length < 3) {
    errors.push('Nombre del titular requerido');
  }

  return errors;
};

/**
 * Procesa un pago simulado.
 * Busca la tarjeta en TEST_CARDS y devuelve el resultado correspondiente.
 * Si la tarjeta no esta en la lista, aprueba por defecto.
 */
const processPayment = async ({ companyId, planId, amount, cardData }) => {
  const clean = (cardData.cardNumber || '').replace(/\s/g, '');
  const last4 = clean.slice(-4);
  const brand = detectCardBrand(clean);

  // Buscar en tarjetas de prueba
  const testCard = TEST_CARDS[clean];
  const status = testCard?.status || 'APPROVED';
  const failureReason = testCard?.reason || null;

  // Simular delay de procesamiento (300-800ms)
  await new Promise((resolve) => setTimeout(resolve, 300 + Math.random() * 500));

  // Buscar suscripcion existente o crear nueva
  let subscription = await prisma.subscription.findUnique({
    where: { companyId },
  });

  if (!subscription) {
    const periodEnd = new Date();
    periodEnd.setMonth(periodEnd.getMonth() + 1); // 1 mes

    subscription = await prisma.subscription.create({
      data: {
        companyId,
        planId,
        status: status === 'APPROVED' ? 'ACTIVE' : 'PAST_DUE',
        currentPeriodEnd: periodEnd,
      },
    });
  }

  // Crear registro de pago
  const payment = await prisma.payment.create({
    data: {
      companyId,
      subscriptionId: subscription.id,
      amount,
      currency: 'PYG',
      status: status === 'APPROVED' ? 'APPROVED' : status === 'PENDING' ? 'PENDING' : 'REJECTED',
      paymentMethod: 'card',
      cardLast4: last4,
      cardBrand: brand,
      description: `Suscripcion plan ${planId}`,
      failureReason: failureReason,
      processedAt: status !== 'PENDING' ? new Date() : null,
    },
  });

  // Si el pago fue aprobado, activar la empresa
  if (status === 'APPROVED') {
    await prisma.company.update({
      where: { id: companyId },
      data: { status: 'ACTIVE', plan: planId },
    });

    await prisma.subscription.update({
      where: { id: subscription.id },
      data: { status: 'ACTIVE' },
    });
  }

  return {
    paymentId: payment.id,
    status: payment.status,
    cardBrand: brand,
    cardLast4: last4,
    amount,
    failureReason,
    companyActivated: status === 'APPROVED',
  };
};

/**
 * Obtiene el historial de pagos de una empresa.
 */
const getPaymentHistory = async (companyId) => {
  return prisma.payment.findMany({
    where: { companyId },
    orderBy: { createdAt: 'desc' },
    take: 20,
  });
};

/**
 * Obtiene la suscripcion activa de una empresa.
 */
const getSubscription = async (companyId) => {
  return prisma.subscription.findUnique({
    where: { companyId },
    include: { payments: { orderBy: { createdAt: 'desc' }, take: 5 } },
  });
};

module.exports = {
  TEST_CARDS,
  validateCard,
  processPayment,
  getPaymentHistory,
  getSubscription,
  detectCardBrand,
};
