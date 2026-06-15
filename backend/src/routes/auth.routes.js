const { Router } = require('express');
const { login, me } = require('../controllers/auth.controller');
const { protect } = require('../middlewares/auth.middleware');

const router = Router();

// POST /api/auth/login
router.post('/login', login);

// GET /api/auth/me  (ruta protegida - requiere JWT)
router.get('/me', protect, me);

module.exports = router;
