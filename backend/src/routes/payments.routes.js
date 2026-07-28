const { Router } = require('express');
const { protect, requireRole } = require('../middlewares/auth.middleware');
const {
  getCheckoutPlans,
  processCheckout,
  getHistory,
  getActiveSubscription,
  getTestCards,
} = require('../controllers/payments.controller');

const router = Router();

// Todas las rutas de pagos requieren autenticacion
router.use(protect);

// GET /api/payments/plans — planes disponibles para checkout
router.get('/plans', getCheckoutPlans);

// GET /api/payments/test-cards — tarjetas de prueba (solo dev)
router.get('/test-cards', getTestCards);

// POST /api/payments/process — procesar pago con tarjeta
router.post('/process', processCheckout);

// GET /api/payments/history — historial de pagos de la empresa
router.get('/history', getHistory);

// GET /api/payments/subscription — suscripcion activa
router.get('/subscription', getActiveSubscription);

module.exports = router;
