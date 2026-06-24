const { Router } = require('express');
const { protect } = require('../middlewares/auth.middleware');
const { getModelStatus, trainModel } = require('../services/ml.service');

const router = Router();

router.use(protect);

/**
 * GET /api/model/status
 * Estado del modelo: si está entrenado, tamaño, métricas del último entrenamiento.
 */
router.get('/status', async (req, res, next) => {
  try {
    const status = await getModelStatus();
    res.json({ success: true, data: status });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/model/train
 * Dispara el entrenamiento del modelo y devuelve las métricas completas.
 */
router.post('/train', async (req, res, next) => {
  try {
    const metrics = await trainModel();
    res.json({ success: true, data: metrics });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
