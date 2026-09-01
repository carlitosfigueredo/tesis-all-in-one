// src/utils/password.utils.js
// Validacion de politica de contrasenas.
// La politica se pasa como parametro (viene de BD via systemConfig.service).

/**
 * Valida la politica de contrasenas.
 * @param {string} password
 * @param {object} policy   - Politica leida de BD (getPasswordPolicy())
 * @param {object} [user]   - Usuario opcional (para verificar que no use su email)
 * @returns {{ valid: boolean, errors: string[] }}
 */
function validatePasswordPolicy(password, policy, user = null) {
  const errors = [];

  if (typeof password !== 'string') {
    return { valid: false, errors: ['La contraseña es inválida'] };
  }

  if (password.length < policy.minLength) {
    errors.push(`La contraseña tiene que tener al menos ${policy.minLength} caracteres`);
  }
  if (password.length > policy.maxLength) {
    errors.push(`La contraseña no puede tener más de ${policy.maxLength} caracteres`);
  }
  if (policy.requireUppercase && !/[A-Z]/.test(password)) {
    errors.push('La contraseña tiene que tener al menos una letra mayúscula');
  }
  if (policy.requireLowercase && !/[a-z]/.test(password)) {
    errors.push('La contraseña tiene que tener al menos una letra minúscula');
  }
  if (policy.requireNumber && !/[0-9]/.test(password)) {
    errors.push('La contraseña tiene que tener al menos un número');
  }
  if (policy.requireSpecial && !/[!@#$%^&*()\-_=+\[\]{}|;:'",.<>?/\\`~]/.test(password)) {
    errors.push('La contraseña tiene que tener al menos un carácter especial (!@#$%^&*)');
  }
  if (user?.email) {
    const emailLocal = user.email.split('@')[0].toLowerCase();
    if (emailLocal.length > 3 && password.toLowerCase().includes(emailLocal)) {
      errors.push('La contraseña no puede contener tu dirección de correo');
    }
  }

  const COMMON = [
    'password', 'password1', '123456789', '12345678', 'qwerty123',
    'iloveyou', 'admin123', 'letmein1', 'welcome1', 'monkey123',
  ];
  if (COMMON.includes(password.toLowerCase())) {
    errors.push('La contraseña es demasiado común. Elegí una más segura');
  }

  return { valid: errors.length === 0, errors };
}

module.exports = { validatePasswordPolicy };
