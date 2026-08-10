// src/services/systemConfig.service.js
// Servicio para leer/escribir configuracion global desde la BD.
// Usa un cache en memoria con TTL para no hacer una query a BD en cada request.

const prisma = require('../lib/prisma');

const CACHE_TTL_MS = 60 * 1000; // 1 minuto

// Estructura del cache: { value, expiresAt }
const cache = {};

// Politica de contrasenas por defecto (fallback si la BD no tiene el registro)
const DEFAULT_PASSWORD_POLICY = {
  minLength:        8,
  maxLength:        128,
  requireUppercase: true,
  requireLowercase: true,
  requireNumber:    true,
  requireSpecial:   true,
};

// Config de reset token por defecto
const DEFAULT_RESET_TOKEN_CONFIG = {
  ttlMinutes:       5,   // Tiempo de vida del token (minutos)
  maxDailyRequests: 3,   // Max solicitudes por dia por usuario (reservado para futuro)
};

/**
 * Lee un valor del sistema desde la BD, con cache en memoria.
 * @param {string} key
 * @returns {Promise<any>}
 */
async function getConfig(key) {
  const now = Date.now();

  // Devolver desde cache si aun es valido
  if (cache[key] && cache[key].expiresAt > now) {
    return cache[key].value;
  }

  try {
    const row = await prisma.systemConfig.findUnique({ where: { key } });
    const value = row?.value ?? null;
    cache[key] = { value, expiresAt: now + CACHE_TTL_MS };
    return value;
  } catch (err) {
    console.error(`[SystemConfig] Error al leer "${key}":`, err.message);
    return cache[key]?.value ?? null; // devolver valor expirado antes que nada
  }
}

/**
 * Escribe un valor en la BD e invalida el cache.
 * @param {string} key
 * @param {any} value  - Objeto serializable a JSON
 * @param {string} [updatedBy] - userId del admin
 */
async function setConfig(key, value, updatedBy = null) {
  await prisma.systemConfig.upsert({
    where: { key },
    update: { value, updatedBy },
    create: { key, value, updatedBy },
  });
  // Invalidar cache
  delete cache[key];
}

/**
 * Devuelve la politica de contrasenas vigente.
 * Si no esta en BD usa los valores por defecto.
 * @returns {Promise<typeof DEFAULT_PASSWORD_POLICY>}
 */
async function getPasswordPolicy() {
  const stored = await getConfig('password_policy');
  return { ...DEFAULT_PASSWORD_POLICY, ...(stored ?? {}) };
}

/**
 * Devuelve la configuracion del token de reset de contrasena.
 * @returns {Promise<typeof DEFAULT_RESET_TOKEN_CONFIG>}
 */
async function getResetTokenConfig() {
  const stored = await getConfig('reset_token_config');
  return { ...DEFAULT_RESET_TOKEN_CONFIG, ...(stored ?? {}) };
}

/**
 * Devuelve la tasa de conversion PYG → USD vigente.
 * Primero busca en BD (SystemConfig key: exchange_rates).
 * Fallback: variable de entorno PYG_TO_USD_RATE, luego 7500.
 */
async function getPygToUsdRate() {
  const stored = await getConfig('exchange_rates');
  if (stored?.PYG_TO_USD && stored.PYG_TO_USD > 0) {
    return parseFloat(stored.PYG_TO_USD);
  }
  // Fallback a variable de entorno o valor por defecto
  return parseFloat(process.env.PYG_TO_USD_RATE || '7500');
}

module.exports = { getConfig, setConfig, getPasswordPolicy, getResetTokenConfig, getPygToUsdRate, DEFAULT_PASSWORD_POLICY, DEFAULT_RESET_TOKEN_CONFIG };
