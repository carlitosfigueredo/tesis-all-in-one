// ─────────────────────────────────────────
// Politica de contrasenas — frontend
//
// FUENTE DE VERDAD: backend/src/config/passwordPolicy.js
// Si cambias los requisitos, actualiza AMBOS archivos para que
// el indicador visual del frontend coincida con la validacion del backend.
// ─────────────────────────────────────────

export const PASSWORD_POLICY = {
  minLength:        8,
  maxLength:        128,
  requireUppercase: true,
  requireLowercase: true,
  requireNumber:    true,
  requireSpecial:   true,
};

/**
 * Reglas para el indicador visual de fortaleza.
 * Cada regla tiene: label (texto visible) y test (funcion de validacion).
 */
export const PASSWORD_RULES = [
  {
    label: `Al menos ${PASSWORD_POLICY.minLength} caracteres`,
    test:  (p) => p.length >= PASSWORD_POLICY.minLength,
  },
  {
    label: 'Una letra mayúscula',
    test:  (p) => !PASSWORD_POLICY.requireUppercase || /[A-Z]/.test(p),
    skip:  !PASSWORD_POLICY.requireUppercase,
  },
  {
    label: 'Una letra minúscula',
    test:  (p) => !PASSWORD_POLICY.requireLowercase || /[a-z]/.test(p),
    skip:  !PASSWORD_POLICY.requireLowercase,
  },
  {
    label: 'Un número',
    test:  (p) => !PASSWORD_POLICY.requireNumber || /[0-9]/.test(p),
    skip:  !PASSWORD_POLICY.requireNumber,
  },
  {
    label: 'Un carácter especial (!@#$%^&*)',
    test:  (p) => !PASSWORD_POLICY.requireSpecial || /[!@#$%^&*()\-_=+[\]{}|;:'",.<>?/\\`~]/.test(p),
    skip:  !PASSWORD_POLICY.requireSpecial,
  },
].filter((r) => !r.skip);
