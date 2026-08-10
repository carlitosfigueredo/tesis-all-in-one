const { Router } = require('express');
const { protect, requirePortal } = require('../middlewares/auth.middleware');
const { requirePermission } = require('../middlewares/permission.middleware');
const {
  createPayPalOrder,
  capturePayPalOrder,
  getCheckoutPlans,
  processCheckout,
  getHistory,
  getActiveSubscription,
  getTestCards,
  getReceipt,
} = require('../controllers/payments.controller');

const router = Router();

router.use(protect, requirePortal('company'));

// GET /api/payments/plans
router.get('/plans', getCheckoutPlans);

// GET /api/payments/test-cards (solo dev — mock)
router.get('/test-cards', getTestCards);

// ── PayPal Orders API v2 (REAL) ───────────────────────────────────────────────
// POST /api/payments/create-order — crea la orden, devuelve orderId al frontend
router.post('/create-order', requirePermission('payments.process'), createPayPalOrder);

// POST /api/payments/capture-order — captura el pago tras aprobacion del usuario
router.post('/capture-order', requirePermission('payments.process'), capturePayPalOrder);

// ── Mock (solo desarrollo) ────────────────────────────────────────────────────
// POST /api/payments/process
router.post('/process', requirePermission('payments.process'), processCheckout);

// GET /api/payments/history
router.get('/history', requirePermission('payments.view'), getHistory);

// GET /api/payments/subscription
router.get('/subscription', requirePermission('payments.view'), getActiveSubscription);

// GET /api/payments/receipt/:paymentId — comprobante estructurado (punto 36 Apuntes UNIDA)
router.get('/receipt/:paymentId', requirePermission('payments.view'), getReceipt);

module.exports = router;
