const { Router } = require('express');
const { adminLogin, me } = require('../controllers/auth.controller');
const { protect, requirePortal } = require('../middlewares/auth.middleware');

const router = Router();

// POST /api/admin/auth/login  — solo SUPER_ADMIN
router.post('/login', adminLogin);

// GET  /api/admin/auth/me     — requiere token de portal admin
router.get('/me', protect, requirePortal('admin'), me);

module.exports = router;
