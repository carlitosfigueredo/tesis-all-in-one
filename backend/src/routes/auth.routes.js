const { Router } = require('express');
const { login, me, forgotPassword, resetPassword, changePassword, register } = require('../controllers/auth.controller');
const { protect, requirePortal }                    = require('../middlewares/auth.middleware');
const { validate, forgotPasswordSchema,
        resetPasswordSchema, loginSchema,
        registerSchema }                            = require('../schemas/auth.schema');

const router = Router();

// POST /api/auth/login
router.post('/login', validate(loginSchema), login);

// POST /api/auth/register — registro publico de empresa
router.post('/register', validate(registerSchema), register);

// GET  /api/auth/me
router.get('/me', protect, requirePortal('company'), me);

// POST /api/auth/forgot-password
router.post('/forgot-password', validate(forgotPasswordSchema), forgotPassword);

// POST /api/auth/reset-password
router.post('/reset-password', validate(resetPasswordSchema), resetPassword);

// POST /api/auth/change-password (requiere estar autenticado)
router.post('/change-password', protect, requirePortal('company'), changePassword);

module.exports = router;
