const { Router } = require('express');
const { login, me, forgotPassword, resetPassword } = require('../controllers/auth.controller');
const { protect, requirePortal }                    = require('../middlewares/auth.middleware');
const { validate, forgotPasswordSchema,
        resetPasswordSchema, loginSchema }          = require('../schemas/auth.schema');

const router = Router();

// POST /api/auth/login
router.post('/login', validate(loginSchema), login);

// GET  /api/auth/me
router.get('/me', protect, requirePortal('company'), me);

// POST /api/auth/forgot-password
router.post('/forgot-password', validate(forgotPasswordSchema), forgotPassword);

// POST /api/auth/reset-password
router.post('/reset-password', validate(resetPasswordSchema), resetPassword);

module.exports = router;
