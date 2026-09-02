const { Router } = require('express');
const { protect, requirePortal } = require('../middlewares/auth.middleware');
const { requirePermission } = require('../middlewares/permission.middleware');
const {
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
  getReceipt,
} = require('../controllers/payments.controller');

const router = Router();

// GET /api/payments/plans — publico (se necesita antes de autenticarse en checkout)
router.get('/plans', getCheckoutPlans);

// Todas las demas rutas requieren autenticacion
router.use(protect, requirePortal('company'));

// GET /api/payments/test-cards (solo dev — mock)
router.get('/test-cards', getTestCards);

// ── PayPal Orders API v2 (REAL) ───────────────────────────────────────────────
router.post('/create-order',   requirePermission('payments.process'), createPayPalOrder);
router.post('/capture-order',  requirePermission('payments.process'), capturePayPalOrder);

// ── AdamsPay — Pasarela local Paraguay ───────────────────────────────────────
// POST /api/payments/adamspay/create — crea deuda y devuelve payUrl
router.post('/adamspay/create',          requirePermission('payments.process'), createAdamsPayDebt);
// POST /api/payments/adamspay/verify/:docId — verifica si la deuda fue pagada
router.post('/adamspay/verify/:docId',   requirePermission('payments.process'), verifyAdamsPayDebt);

// ── Mock (solo desarrollo) ────────────────────────────────────────────────────
router.post('/process', requirePermission('payments.process'), processCheckout);

// GET /api/payments/history
router.get('/history',      requirePermission('payments.view'), getHistory);

// GET /api/payments/subscription/status — estado enriquecido (días restantes, por vencer)
router.get('/subscription/status', requirePermission('payments.view'), getSubscriptionStatusHandler);

// ── Cambio de plan (upgrade prorrateado / downgrade programado) ───────────────
router.get('/plan-change/preview', requirePermission('payments.view'), previewPlanChange);
router.post('/plan-change',        requirePermission('payments.process'), executePlanChange);
router.delete('/plan-change',      requirePermission('payments.process'), cancelScheduledPlanChange);

// GET /api/payments/subscription
router.get('/subscription', requirePermission('payments.view'), getActiveSubscription);

// GET /api/payments/receipt/:paymentId
router.get('/receipt/:paymentId', requirePermission('payments.view'), getReceipt);

module.exports = router;
