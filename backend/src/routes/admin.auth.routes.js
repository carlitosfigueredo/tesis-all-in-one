const { Router } = require('express');
const { adminLogin, me, forgotPassword, resetPassword } = require('../controllers/auth.controller');
const { protect, requirePortal } = require('../middlewares/auth.middleware');
const { verifyRecaptcha } = require('../middlewares/recaptcha.middleware');
const { validate, forgotPasswordSchema, resetPasswordSchema } = require('../schemas/auth.schema');

const router = Router();

// POST /api/admin/auth/login  — solo SUPER_ADMIN
router.post('/login', verifyRecaptcha, adminLogin);

// POST /api/admin/auth/forgot-password — recuperar contrasena admin
router.post('/forgot-password', verifyRecaptcha, validate(forgotPasswordSchema), forgotPassword);

// POST /api/admin/auth/reset-password — resetear contrasena admin
router.post('/reset-password', validate(resetPasswordSchema), resetPassword);

// GET  /api/admin/auth/me     — requiere token de portal admin
router.get('/me', protect, requirePortal('admin'), me);

module.exports = router;
