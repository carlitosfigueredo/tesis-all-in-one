const { Router } = require('express');
const { predictFlightRisk, predictBatch } = require('../services/ml.service');
const { protect } = require('../middlewares/auth.middleware');

const router = Router();

// Todas las rutas de predicción requieren autenticación
router.use(protect);

/**
 * POST /api/predict
 * Predice el riesgo de fuga para un empleado individual.
 */
router.post('/', async (req, res, next) => {
  try {
    const result = await predictFlightRisk(req.body);
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/predict/batch
 * Predice el riesgo para múltiples empleados.
 */
router.post('/batch', async (req, res, next) => {
  try {
    if (!Array.isArray(req.body) || req.body.length === 0) {
      return res.status(400).json({ success: false, message: 'Se esperaba un array de empleados' });
    }
    const results = await predictBatch(req.body);
    res.json({ success: true, data: results });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
