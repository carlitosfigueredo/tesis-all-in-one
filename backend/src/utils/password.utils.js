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
    return { valid: false, errors: ['La contrasena es invalida'] };
  }

  if (password.length < policy.minLength) {
    errors.push(`La contrasena tiene que tener al menos ${policy.minLength} caracteres`);
  }
  if (password.length > policy.maxLength) {
    errors.push(`La contrasena no puede tener mas de ${policy.maxLength} caracteres`);
  }
  if (policy.requireUppercase && !/[A-Z]/.test(password)) {
    errors.push('La contrasena tiene que tener al menos una letra mayuscula');
  }
  if (policy.requireLowercase && !/[a-z]/.test(password)) {
    errors.push('La contrasena tiene que tener al menos una letra minuscula');
  }
  if (policy.requireNumber && !/[0-9]/.test(password)) {
    errors.push('La contrasena tiene que tener al menos un numero');
  }
  if (policy.requireSpecial && !/[!@#$%^&*()\-_=+\[\]{}|;:'",.<>?/\\`~]/.test(password)) {
    errors.push('La contrasena tiene que tener al menos un caracter especial (!@#$%^&*)');
  }
  if (user?.email) {
    const emailLocal = user.email.split('@')[0].toLowerCase();
    if (emailLocal.length > 3 && password.toLowerCase().includes(emailLocal)) {
      errors.push('La contrasena no puede contener tu direccion de correo');
    }
  }

  const COMMON = [
    'password', 'password1', '123456789', '12345678', 'qwerty123',
    'iloveyou', 'admin123', 'letmein1', 'welcome1', 'monkey123',
  ];
  if (COMMON.includes(password.toLowerCase())) {
    errors.push('La contrasena es demasiado comun. Elegi una mas segura');
  }

  return { valid: errors.length === 0, errors };
}

module.exports = { validatePasswordPolicy };
