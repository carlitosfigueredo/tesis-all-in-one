const prisma = require('../lib/prisma');

/**
 * GET /api/consent
 * Devuelve los registros de consentimiento del usuario autenticado.
 */
const getMyConsents = async (req, res, next) => {
  try {
    const consents = await prisma.consentRecord.findMany({
      where: { userId: req.user.id },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        consentType: true,
        documentVersion: true,
        accepted: true,
        acceptedAt: true,
        revokedAt: true,
        purpose: true,
        createdAt: true,
      },
    });

    res.json({ success: true, data: consents });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/consent/revoke
 * Revoca un consentimiento especifico (derecho de oposicion — Ley 7593/2025).
 * Body: { consentType: 'PRIVACY_POLICY' | 'TERMS_AND_CONDITIONS' | 'DATA_PROCESSING' }
 *
 * Nota: revocar la politica de privacidad o terminos implica que el usuario
 * no puede seguir usando el servicio. El frontend debe advertirlo.
 */
const revokeConsent = async (req, res, next) => {
  try {
    const { consentType } = req.body;

    if (!consentType) {
      return res.status(400).json({
        success: false,
        message: 'Debe indicar el tipo de consentimiento a revocar (consentType)',
      });
    }

    const validTypes = ['PRIVACY_POLICY', 'TERMS_AND_CONDITIONS', 'DATA_PROCESSING'];
    if (!validTypes.includes(consentType)) {
      return res.status(400).json({
        success: false,
        message: `consentType invalido. Valores permitidos: ${validTypes.join(', ')}`,
      });
    }

    // Buscar el consentimiento activo mas reciente del usuario
    const record = await prisma.consentRecord.findFirst({
      where: {
        userId: req.user.id,
        consentType,
        accepted: true,
        revokedAt: null,
      },
      orderBy: { acceptedAt: 'desc' },
    });

    if (!record) {
      return res.status(404).json({
        success: false,
        message: 'No se encontro un consentimiento activo de ese tipo',
      });
    }

    // Marcar como revocado
    await prisma.consentRecord.update({
      where: { id: record.id },
      data: {
        accepted: false,
        revokedAt: new Date(),
      },
    });

    res.json({
      success: true,
      message: `Consentimiento "${consentType}" revocado correctamente`,
      data: { consentType, revokedAt: new Date().toISOString() },
    });
  } catch (err) {
    next(err);
  }
};

module.exports = { getMyConsents, revokeConsent };
