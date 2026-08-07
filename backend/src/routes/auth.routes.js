const { Router } = require('express');
const { login, me, forgotPassword, resetPassword, changePassword, forceChangePassword, register } = require('../controllers/auth.controller');
const { protect, requirePortal }  = require('../middlewares/auth.middleware');
const { verifyRecaptcha }         = require('../middlewares/recaptcha.middleware');
const { validate, forgotPasswordSchema,
        resetPasswordSchema, loginSchema,
        registerSchema }          = require('../schemas/auth.schema');
const { getPasswordPolicy }       = require('../services/systemConfig.service');

const router = Router();

// GET /api/auth/password-policy — expone la politica vigente al frontend (publico)
router.get('/password-policy', async (_req, res, next) => {
  try {
    const policy = await getPasswordPolicy();
    res.json({ success: true, data: policy });
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/login
router.post('/login', verifyRecaptcha, validate(loginSchema), login);

// POST /api/auth/register — registro publico de empresa
router.post('/register', verifyRecaptcha, validate(registerSchema), register);

// GET  /api/auth/me
router.get('/me', protect, requirePortal('company'), me);

// POST /api/auth/forgot-password
router.post('/forgot-password', verifyRecaptcha, validate(forgotPasswordSchema), forgotPassword);

// POST /api/auth/reset-password
router.post('/reset-password', validate(resetPasswordSchema), resetPassword);

// POST /api/auth/change-password (requiere estar autenticado)
router.post('/change-password', protect, requirePortal('company'), changePassword);

// POST /api/auth/force-change-password (primer login, no requiere pass actual)
router.post('/force-change-password', protect, forceChangePassword);

module.exports = router;
