// src/utils/emailDomain.js
// Validación UX del dominio del correo (lado cliente).
// Es solo para feedback inmediato al usuario; la validación autoritativa
// (incluida la verificación MX real) la hace el backend en el registro.

// Errores de tipeo habituales de proveedores populares. Todos en minúscula.
// Debe mantenerse alineado con backend/src/utils/emailDomain.utils.js
const INVALID_DOMAINS = new Set([
  'gmail.com.py', 'gmail.com.ar', 'gmail.com.br', 'gmail.com.mx',
  'gmail.co', 'gmail.cm', 'gmail.con', 'gmail.comm', 'gmail.om',
  'gmial.com', 'gmil.com', 'gmai.com', 'gmaill.com', 'gnail.com',
  'gemail.com', 'gmail.es', 'gmailcom.com',
  'hotmail.com.py', 'hotmail.com.ar', 'hotmail.co', 'hotmail.con',
  'hotmial.com', 'hotmal.com', 'hotmil.com', 'hotmaill.com', 'hormail.com',
  'outlook.com.py', 'outlok.com', 'outllook.com', 'outlook.co', 'outook.com',
  'yahoo.com.py', 'yaho.com', 'yahooo.com', 'yhaoo.com', 'yahoo.co',
  'live.com.py', 'icloud.com.py',
]);

/**
 * Devuelve el dominio (minúscula) del correo, o null si el formato es inválido.
 */
export function getDomain(email) {
  if (typeof email !== 'string') return null;
  const parts = email.trim().toLowerCase().split('@');
  if (parts.length !== 2 || !parts[1]) return null;
  return parts[1];
}

/**
 * true si el dominio es un typo/dominio inexistente conocido.
 */
export function isKnownInvalidDomain(email) {
  const domain = getDomain(email);
  if (!domain) return false;
  return INVALID_DOMAINS.has(domain);
}
