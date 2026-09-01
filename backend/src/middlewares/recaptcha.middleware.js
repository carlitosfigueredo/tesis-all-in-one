// Middleware de verificacion de reCAPTCHA v2
// Valida el token enviado por el frontend contra la API de Google.
// Si RECAPTCHA_SECRET_KEY no esta configurada, el middleware hace pass-through (desarrollo).

const RECAPTCHA_VERIFY_URL = 'https://www.google.com/recaptcha/api/siteverify';

/**
 * verifyRecaptcha
 * Espera que req.body.recaptchaToken contenga el token del widget.
 * Si la verificacion falla, responde 400.
 * Si no hay secret key configurada (dev sin captcha), permite pasar.
 */
const verifyRecaptcha = async (req, res, next) => {
  const secretKey = process.env.RECAPTCHA_SECRET_KEY;

  // Si no hay secret key, skip (permite desarrollo sin captcha)
  if (!secretKey) {
    return next();
  }

  const { recaptchaToken } = req.body;

  if (!recaptchaToken) {
    return res.status(400).json({
      success: false,
      message: 'Completá la verificación de reCAPTCHA',
      code: 'RECAPTCHA_MISSING',
    });
  }

  try {
    const params = new URLSearchParams({
      secret: secretKey,
      response: recaptchaToken,
      remoteip: req.ip,
    });

    const response = await fetch(RECAPTCHA_VERIFY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString(),
    });

    const data = await response.json();

    if (!data.success) {
      console.warn('[reCAPTCHA] Verificacion fallida:', data['error-codes']);
      return res.status(400).json({
        success: false,
        message: 'La verificación de reCAPTCHA falló. Intentá de nuevo',
        code: 'RECAPTCHA_FAILED',
      });
    }

    // Verificacion exitosa, continuar
    next();
  } catch (error) {
    console.error('[reCAPTCHA] Error al verificar:', error.message);
    // En caso de error de red con Google, dejamos pasar para no bloquear al usuario
    next();
  }
};

module.exports = { verifyRecaptcha };
