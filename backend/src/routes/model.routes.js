const { Router } = require('express');
const { protect } = require('../middlewares/auth.middleware');
const { requireActiveCompany } = require('../middlewares/companyStatus.middleware');
const { getModelStatus, trainModel } = require('../services/ml.service');
const { retrainGlobalModel } = require('../services/globalTraining.service');
const { logAction } = require('../services/audit.service');
const { getIp, getUserAgent } = require('../utils/request.utils');

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

/**
 * POST /api/model/retrain-global
 * Reentrenamiento acumulativo: junta los datos anonimizados de deserción real
 * de TODAS las empresas y reentrena el modelo global.
 * Solo SUPER_ADMIN (es un modelo compartido por todo el sistema).
 */
router.post('/retrain-global', async (req, res, next) => {
  try {
    const isSuperAdmin = req.user.roleNames?.includes('SUPER_ADMIN');
    if (!isSuperAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Solo un administrador del sistema puede reentrenar el modelo global.',
      });
    }

    const result = await retrainGlobalModel();

    await logAction({
      userId:    req.user.id,
      action:    'GLOBAL_MODEL_RETRAINED',
      resource:  'model',
      ipAddress: getIp(req),
      userAgent: getUserAgent(req),
      status:    'SUCCESS',
      newValue:  {
        datasetSize: result.datasetSize,
        positivos:   result.positivos,
        negativos:   result.negativos,
        auc_roc:     result.metrics?.auc_roc,
      },
    });

    res.json({
      success: true,
      message: `Modelo global reentrenado con ${result.datasetSize} registros ` +
               `(${result.positivos} desertaron, ${result.negativos} permanecieron).`,
      data: {
        datasetSize: result.datasetSize,
        positivos:   result.positivos,
        negativos:   result.negativos,
        metrics:     result.metrics,
      },
    });
  } catch (error) {
    // Errores de validación del dataset (datos insuficientes) → 422 con mensaje claro.
    if (error.statusCode === 422) {
      return res.status(422).json({ success: false, message: error.message });
    }
    next(error);
  }
});

module.exports = router;
