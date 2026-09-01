// src/utils/emailDomain.utils.js
// Validación del dominio de un correo electrónico.
//
// Objetivo: rechazar correos con dominios que no existen o que son errores de
// tipeo comunes de proveedores populares (ej. "gmail.com.py", que NO existe).
//
// Estrategia en dos capas:
//   1) Lista negra de dominios inexistentes / typos frecuentes (SÍNCRONA, siempre).
//   2) Verificación de registros MX vía DNS (ASÍNCRONA, tolerante a fallos):
//      si el DNS falla o no responde, NO se bloquea el registro (fail-open),
//      para no rechazar dominios legítimos por problemas de red del servidor.

const dns = require('node:dns').promises;

// ── Capa 1: dominios inválidos conocidos ──────────────────────────────────────
// Errores de tipeo habituales sobre proveedores populares. Todos en minúscula.
const INVALID_DOMAINS = new Set([
  // gmail mal escrito
  'gmail.com.py', 'gmail.com.ar', 'gmail.com.br', 'gmail.com.mx',
  'gmail.co', 'gmail.cm', 'gmail.con', 'gmail.comm', 'gmail.om',
  'gmial.com', 'gmil.com', 'gmai.com', 'gmaill.com', 'gnail.com',
  'gemail.com', 'gmail.es', 'gmailcom.com',
  // hotmail mal escrito
  'hotmail.com.py', 'hotmail.com.ar', 'hotmail.co', 'hotmail.con',
  'hotmial.com', 'hotmal.com', 'hotmil.com', 'hotmaill.com', 'hormail.com',
  // outlook mal escrito
  'outlook.com.py', 'outlok.com', 'outllook.com', 'outlook.co', 'outook.com',
  // yahoo mal escrito
  'yahoo.com.py', 'yaho.com', 'yahooo.com', 'yhaoo.com', 'yahoo.co',
  // otros
  'live.com.py', 'icloud.com.py',
]);

// Dominios legítimos populares: si el dominio es uno de estos, aceptamos directo
// (evita una consulta DNS innecesaria).
const KNOWN_GOOD_DOMAINS = new Set([
  'gmail.com', 'hotmail.com', 'outlook.com', 'yahoo.com', 'live.com',
  'icloud.com', 'proton.me', 'protonmail.com', 'yahoo.es', 'hotmail.es',
]);

/**
 * Extrae el dominio (en minúscula) de un correo. Devuelve null si es inválido.
 */
function getDomain(email) {
  if (typeof email !== 'string') return null;
  const parts = email.trim().toLowerCase().split('@');
  if (parts.length !== 2 || !parts[1]) return null;
  return parts[1];
}

/**
 * Capa 1 (síncrona): ¿el dominio está en la lista negra de typos conocidos?
 * @returns {boolean} true si el dominio es inválido/conocido como typo.
 */
function isKnownInvalidDomain(email) {
  const domain = getDomain(email);
  if (!domain) return false; // el formato lo valida Zod aparte
  return INVALID_DOMAINS.has(domain);
}

/**
 * Capa 2 (asíncrona, fail-open): ¿el dominio tiene registros MX (puede recibir correo)?
 * - Si el dominio es un proveedor conocido bueno → true sin consultar DNS.
 * - Si tiene MX o registros A → true.
 * - Si NO existe el dominio (ENOTFOUND / NXDOMAIN) → false.
 * - Si el DNS falla por otra razón (timeout, red) → true (no bloquear).
 *
 * @returns {Promise<boolean>}
 */
async function hasValidMxRecords(email) {
  const domain = getDomain(email);
  if (!domain) return true; // el formato lo valida Zod; no bloqueamos acá
  if (KNOWN_GOOD_DOMAINS.has(domain)) return true;

  try {
    const mx = await dns.resolveMx(domain);
    if (Array.isArray(mx) && mx.length > 0) return true;
    // Sin MX: algunos dominios reciben correo por su registro A (fallback RFC 5321).
    const a = await dns.resolve(domain).catch(() => []);
    return Array.isArray(a) && a.length > 0;
  } catch (err) {
    // Dominio inexistente → bloquear. Otros errores → fail-open (no bloquear).
    if (err && (err.code === 'ENOTFOUND' || err.code === 'ENODATA')) {
      // ENODATA = existe pero sin MX; reintentamos con A antes de decidir.
      try {
        const a = await dns.resolve(domain);
        return Array.isArray(a) && a.length > 0;
      } catch {
        return false;
      }
    }
    return true; // timeout / SERVFAIL / red caída → no penalizar al usuario
  }
}

module.exports = {
  isKnownInvalidDomain,
  hasValidMxRecords,
  getDomain,
  INVALID_DOMAINS,
  KNOWN_GOOD_DOMAINS,
};
