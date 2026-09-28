// ─────────────────────────────────────────
// Rate limiting (express-rate-limit)
// Mitiga ataques de fuerza bruta y abuso limitando la cantidad de
// peticiones por IP en una ventana de tiempo. Complementa al bloqueo
// logico de cuenta (5 intentos fallidos) operando a nivel HTTP.
// ─────────────────────────────────────────

const rateLimit = require('express-rate-limit');

// Ventana de 15 minutos por defecto (configurable via env).
const WINDOW_MS = parseInt(process.env.RATE_LIMIT_WINDOW_MS, 10) || 15 * 60 * 1000;

// Respuesta estandar del sistema (envoltura { success, message }).
const limitReachedHandler = (req, res) => {
  res.status(429).json({
    success: false,
    message: 'Demasiados intentos. Esperá 15 minutos antes de volver a intentar',
    code: 'RATE_LIMIT_EXCEEDED',
  });
};

/**
 * Limiter para endpoints de autenticacion sensibles (login, register,
 * forgot-password). Permite 5 peticiones por IP cada 15 minutos; la 6ta
 * devuelve 429. Expone los headers estandar RateLimit-* y Retry-After.
 */
const authLimiter = rateLimit({
  windowMs: WINDOW_MS,
  max: parseInt(process.env.RATE_LIMIT_AUTH_MAX, 10) || 5,
  standardHeaders: true,   // RateLimit-Limit, RateLimit-Remaining, RateLimit-Reset
  legacyHeaders: true,     // X-RateLimit-* (compatibilidad)
  handler: limitReachedHandler,
  // En tests automatizados se puede desactivar para no interferir.
  skip: () => process.env.DISABLE_RATE_LIMIT === 'true',
});

/**
 * Limiter mas holgado para el resto de la API (lectura/escritura autenticada).
 * Protege de abuso sin molestar el uso normal del dashboard.
 */
const apiLimiter = rateLimit({
  windowMs: WINDOW_MS,
  max: parseInt(process.env.RATE_LIMIT_API_MAX, 10) || 300,
  standardHeaders: true,
  legacyHeaders: true,
  handler: limitReachedHandler,
  skip: () => process.env.DISABLE_RATE_LIMIT === 'true',
});

module.exports = { authLimiter, apiLimiter };
