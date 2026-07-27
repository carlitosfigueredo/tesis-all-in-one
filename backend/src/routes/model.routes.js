const { Router } = require('express');
const { protect } = require('../middlewares/auth.middleware');
const { requireActiveCompany } = require('../middlewares/companyStatus.middleware');
const { getModelStatus, trainModel } = require('../services/ml.service');

const router = Router();

router.use(protect, requireActiveCompany);

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
