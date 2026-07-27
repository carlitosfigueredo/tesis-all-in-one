// Middleware que verifica el estado de la empresa del usuario.
// Bloquea acceso a recursos cuando la empresa esta en PENDING_PAYMENT o SUSPENDED.
// SUPER_ADMIN nunca se bloquea (no pertenece a ninguna empresa).

const prisma = require('../lib/prisma');

/**
 * requireActiveCompany
 * Debe usarse DESPUES de protect (necesita req.user).
 * Permite pasar si:
 *   - El usuario es SUPER_ADMIN (no tiene empresa)
 *   - La empresa tiene status ACTIVE o TRIAL
 * Bloquea si:
 *   - La empresa tiene status PENDING_PAYMENT o SUSPENDED
 */
const requireActiveCompany = async (req, res, next) => {
  try {
    // SUPER_ADMIN no tiene empresa, siempre pasa
    if (req.user.role === 'SUPER_ADMIN' || !req.user.companyId) {
      return next();
    }

    const company = await prisma.company.findUnique({
      where: { id: req.user.companyId },
      select: { status: true, name: true },
    });

    if (!company) {
      return res.status(403).json({
        success: false,
        message: 'Empresa no encontrada',
        code: 'COMPANY_NOT_FOUND',
      });
    }

    // Empresas activas o en trial pueden acceder
    if (company.status === 'ACTIVE' || company.status === 'TRIAL') {
      req.companyStatus = company.status;
      return next();
    }

    // PENDING_PAYMENT — acaban de registrarse, no pagaron
    if (company.status === 'PENDING_PAYMENT') {
      return res.status(403).json({
        success: false,
        message: 'Tu empresa esta pendiente de activacion. Completa el pago para acceder a todas las funcionalidades',
        code: 'PENDING_PAYMENT',
        companyStatus: company.status,
      });
    }

    // SUSPENDED — empresa suspendida por falta de pago u otro motivo
    if (company.status === 'SUSPENDED') {
      return res.status(403).json({
        success: false,
        message: 'Tu empresa esta suspendida. Contacta soporte para reactivar tu cuenta',
        code: 'COMPANY_SUSPENDED',
        companyStatus: company.status,
      });
    }

    // Cualquier otro estado desconocido
    return res.status(403).json({
      success: false,
      message: 'No se puede acceder en este momento',
      code: 'COMPANY_STATUS_INVALID',
      companyStatus: company.status,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { requireActiveCompany };
