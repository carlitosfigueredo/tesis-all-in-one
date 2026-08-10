const { Router } = require('express');
const { protect, requirePortal } = require('../middlewares/auth.middleware');
const { requirePermission } = require('../middlewares/permission.middleware');
const {
  getCheckoutPlans, processCheckout, getHistory, getActiveSubscription, getTestCards, getReceipt,
} = require('../controllers/payments.controller');

const router = Router();

router.use(protect, requirePortal('company'));

// GET /api/payments/plans
router.get('/plans', getCheckoutPlans);

// GET /api/payments/test-cards (solo dev)
router.get('/test-cards', getTestCards);

// POST /api/payments/process
router.post('/process', requirePermission('payments.process'), processCheckout);

// GET /api/payments/history
router.get('/history', requirePermission('payments.view'), getHistory);

// GET /api/payments/subscription
router.get('/subscription', requirePermission('payments.view'), getActiveSubscription);

// GET /api/payments/receipt/:paymentId — comprobante estructurado (punto 36 Apuntes UNIDA)
router.get('/receipt/:paymentId', requirePermission('payments.view'), getReceipt);

module.exports = router;
