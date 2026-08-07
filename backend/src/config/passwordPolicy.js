// ─────────────────────────────────────────
// Politica de contrasenas — configuracion central
//
// Para cambiar los requisitos de contrasenas edita SOLO este archivo.
// El backend (password.utils.js, auth.schema.js) y el frontend
// (via endpoint GET /api/auth/password-policy) usan estos valores.
// ─────────────────────────────────────────

const PASSWORD_POLICY = {
  // Longitud minima permitida
  minLength: 8,

  // Longitud maxima permitida (NIST recomienda al menos 64, max 128)
  maxLength: 128,

  // Requiere al menos una letra mayuscula (A-Z)
  requireUppercase: true,

  // Requiere al menos una letra minuscula (a-z)
  requireLowercase: true,

  // Requiere al menos un numero (0-9)
  requireNumber: true,

  // Requiere al menos un caracter especial
  requireSpecial: true,

  // La contrasena no puede contener el nombre de usuario (parte local del email)
  rejectEmail: true,

  // Lista de contrasenas comunes rechazadas
  commonPasswords: [
    'password', 'password1', '123456789', '12345678', 'qwerty123',
    'iloveyou', 'admin123', 'letmein1', 'welcome1', 'monkey123',
  ],
};

module.exports = PASSWORD_POLICY;
