const { Router } = require('express');
const { protect, requirePortal } = require('../middlewares/auth.middleware');
const { getMyConsents, revokeConsent } = require('../controllers/consent.controller');

const router = Router();

// GET /api/consent — obtener mis consentimientos activos
router.get('/', protect, requirePortal('company'), getMyConsents);

// POST /api/consent/revoke — revocar un consentimiento (ARCO: derecho de oposicion)
router.post('/revoke', protect, requirePortal('company'), revokeConsent);

module.exports = router;
