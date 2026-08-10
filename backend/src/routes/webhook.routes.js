// ─────────────────────────────────────────
// webhook.routes.js — Rutas de webhooks
//
// CRITICO: estas rutas NO usan middleware de auth (JWT).
// PayPal llama directamente. La seguridad es via verificacion de firma.
//
// CRITICO: el body debe llegar como JSON crudo (raw) para que
// la verificacion de firma de PayPal funcione correctamente.
// ─────────────────────────────────────────

const { Router } = require('express');
const { handlePayPalWebhook, handleAdamsPayWebhook } = require('../controllers/webhook.controller');

const router = Router();

/**
 * POST /api/webhooks/paypal
 * Recibe eventos de PayPal (sin autenticacion JWT).
 */
router.post('/paypal', handlePayPalWebhook);

/**
 * POST /api/webhooks/adamspay
 * Recibe notificaciones de AdamsPay (sin autenticacion JWT).
 * AdamsPay llama a esta URL cuando una deuda cambia de estado.
 */
router.post('/adamspay', handleAdamsPayWebhook);

module.exports = router;
