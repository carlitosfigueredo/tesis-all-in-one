const { Router } = require('express');
const authRoutes = require('./auth.routes');
const employeeRoutes = require('./employees.routes');

const router = Router();

// Health check de la API
router.get('/health', (_req, res) => {
  res.json({
    success: true,
    message: 'API funcionando correctamente',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

// Módulos de la aplicación
router.use('/auth', authRoutes);
router.use('/employees', employeeRoutes);

module.exports = router;
