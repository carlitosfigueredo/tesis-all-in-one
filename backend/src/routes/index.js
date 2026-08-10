const { Router } = require('express');
const authRoutes      = require('./auth.routes');
const adminAuthRoutes = require('./admin.auth.routes');
const adminRoutes     = require('./admin.routes');
const employeeRoutes  = require('./employees.routes');
const usersRoutes     = require('./users.routes');
const paymentsRoutes  = require('./payments.routes');
const predictRoutes   = require('./predict.routes');
const modelRoutes     = require('./model.routes');
const webhookRoutes   = require('./webhook.routes');
const { getPublicPlans } = require('../controllers/admin.controller');

const router = Router();

// ── Health check ──────────────────────────────────────────────────────────────
router.get('/health', (_req, res) => {
  res.json({
    success: true,
    message: 'API funcionando correctamente',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

// ── Ruta pública de planes (para la landing) ──────────────────────────────────
router.get('/plans', getPublicPlans);

// ── Webhooks (SIN auth — PayPal llama directamente, seguridad via firma) ──────
router.use('/webhooks', webhookRoutes);

// ── Portal de empresas ────────────────────────────────────────────────────────
router.use('/auth',      authRoutes);
router.use('/employees', employeeRoutes);
router.use('/users',     usersRoutes);
router.use('/payments',  paymentsRoutes);
router.use('/predict',   predictRoutes);
router.use('/model',     modelRoutes);

// ── Portal super admin ────────────────────────────────────────────────────────
router.use('/admin/auth', adminAuthRoutes);
router.use('/admin',      adminRoutes);

module.exports = router;
