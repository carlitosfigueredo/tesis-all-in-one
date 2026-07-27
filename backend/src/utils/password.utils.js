// src/utils/password.utils.js
// Politica de contrasenas — NIST SP 800-63B + OWASP ASVS
// Retorna { valid: boolean, errors: string[] }

const COMMON_PASSWORDS = [
  'password', 'password1', '123456789', '12345678', 'qwerty123',
  'iloveyou', 'admin123', 'letmein1', 'welcome1', 'monkey123',
];

/**
 * Valida la politica de contrasenas.
 * @param {string} password - Contrasena a validar
 * @param {object} [user]   - Usuario (para verificar que no contenga el email)
 * @param {string[]} [previousHashes] - Hashes de contrasenas anteriores (bcrypt)
 * @returns {{ valid: boolean, errors: string[] }}
 */
const validatePasswordPolicy = (password, user = null, previousHashes = []) => {
  const errors = [];

  if (typeof password !== 'string') {
    return { valid: false, errors: ['La contrasena es invalida'] };
  }

  // Longitud
  if (password.length < 8) {
    errors.push('La contrasena tiene que tener al menos 8 caracteres');
  }
  if (password.length > 128) {
    errors.push('La contrasena no puede tener mas de 128 caracteres');
  }

  // Mayuscula
  if (!/[A-Z]/.test(password)) {
    errors.push('La contrasena tiene que tener al menos una letra mayuscula');
  }

  // Minuscula
  if (!/[a-z]/.test(password)) {
    errors.push('La contrasena tiene que tener al menos una letra minuscula');
  }

  // Numero
  if (!/[0-9]/.test(password)) {
    errors.push('La contrasena tiene que tener al menos un numero');
  }

  // Caracter especial
  if (!/[!@#$%^&*()\-_=+\[\]{}|;:'",.<>?/\\`~]/.test(password)) {
    errors.push('La contrasena tiene que tener al menos un caracter especial (!@#$%^&*)');
  }

  // No puede contener el email del usuario
  if (user?.email) {
    const emailLocal = user.email.split('@')[0].toLowerCase();
    if (emailLocal.length > 3 && password.toLowerCase().includes(emailLocal)) {
      errors.push('La contrasena no puede contener tu direccion de correo');
    }
  }

  // No puede ser una contrasena comun
  if (COMMON_PASSWORDS.includes(password.toLowerCase())) {
    errors.push('La contrasena es demasiado comun. Elegi una mas segura');
  }

  // Nota: la verificacion contra historial de contrasenas requiere bcrypt.compare
  // y se hace de forma async en el controller, no aqui.

  return {
    valid: errors.length === 0,
    errors,
  };
};

/**
 * Calcula el nivel de fortaleza de una contrasena (0-4).
 * 0 = muy debil, 4 = muy fuerte.
 * Util para el indicador visual en el frontend.
 */
const getPasswordStrength = (password) => {
  if (!password || password.length < 4) return 0;
  let score = 0;
  if (password.length >= 8)  score++;
  if (password.length >= 12) score++;
  if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[!@#$%^&*()\-_=+\[\]{}|;:'",.<>?/\\`~]/.test(password)) score++;
  return Math.min(score, 4);
};

module.exports = { validatePasswordPolicy, getPasswordStrength };
