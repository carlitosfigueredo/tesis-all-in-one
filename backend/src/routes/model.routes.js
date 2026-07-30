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
 * Dispara el entrenamiento del modelo y devuelve las metricas completas.
 * Solo disponible para plan CORPORATIVO o SUPER_ADMIN (bajo demanda).
 */
router.post('/train', async (req, res, next) => {
  try {
    // Verificar plan: solo CORPORATIVO o SUPER_ADMIN
    const isSuperAdmin = req.user.roleNames?.includes('SUPER_ADMIN');
    const plan = req.user.companyPlan;

    if (!isSuperAdmin && plan !== 'CORPORATIVO') {
      const msg = plan === 'PROFESIONAL'
        ? 'Tu plan Profesional actualiza predicciones semanalmente. Actualiza al plan Corporativo para entrenar bajo demanda.'
        : 'Tu plan Estandar actualiza predicciones mensualmente. Actualiza tu plan para entrenar bajo demanda.';
      return res.status(403).json({ success: false, message: msg });
    }

    const metrics = await trainModel();
    res.json({ success: true, data: metrics });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
