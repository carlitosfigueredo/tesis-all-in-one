// src/lib/logger.js
// Logger a archivo, sin dependencias externas.
//
// Captura:
//   - Logs HTTP de morgan (via el stream exportado)
//   - console.log / console.warn / console.error (via installConsoleCapture)
//
// Escribe a logs/app.log con rotacion simple por tamano. Expone readRecentLogs()
// para que el panel SUPER_ADMIN pueda leer las ultimas N lineas.

const fs   = require('fs');
const path = require('path');

// Directorio y archivo de log. Configurable por env, con default seguro.
const LOG_DIR  = process.env.LOG_DIR  || path.resolve(__dirname, '../../logs');
const LOG_FILE = path.join(LOG_DIR, 'app.log');

// Rotacion: cuando app.log supera MAX_BYTES se renombra a app.log.1 (1 backup).
const MAX_BYTES = Number(process.env.LOG_MAX_BYTES || 5 * 1024 * 1024); // 5 MB

// Asegurar que el directorio existe (no rompe si ya existe).
try {
  fs.mkdirSync(LOG_DIR, { recursive: true });
} catch (err) {
  // Si no se puede crear el dir, el logger degrada a solo-consola.
  console.error('[Logger] No se pudo crear el directorio de logs:', err.message);
}

/** Rota el archivo si supero el tamano maximo. Best-effort, nunca lanza. */
const rotateIfNeeded = () => {
  try {
    const { size } = fs.statSync(LOG_FILE);
    if (size < MAX_BYTES) return;
    const backup = `${LOG_FILE}.1`;
    fs.rmSync(backup, { force: true });
    fs.renameSync(LOG_FILE, backup);
  } catch {
    // Si el archivo no existe todavia (ENOENT) u otro fallo, no hacemos nada.
  }
};

/** Escribe una linea cruda al archivo. Nunca lanza (un fallo de log no rompe la app). */
const writeRaw = (line) => {
  try {
    rotateIfNeeded();
    fs.appendFileSync(LOG_FILE, line.endsWith('\n') ? line : line + '\n');
  } catch {
    // swallow
  }
};

/**
 * Registra una entrada estructurada como JSON-line (una por linea).
 * @param {'INFO'|'WARN'|'ERROR'|'HTTP'} level
 * @param {string} message
 */
const log = (level, message) => {
  const entry = {
    ts:      new Date().toISOString(),
    level,
    message: String(message).trimEnd(),
  };
  writeRaw(JSON.stringify(entry));
};

// Stream compatible con morgan: morgan llama stream.write(str).
const stream = {
  write: (str) => log('HTTP', str),
};

/**
 * Reemplaza console.log/info/warn/error para que ademas de imprimir en
 * consola, persistan en el archivo. Se llama una sola vez al arrancar.
 */
let consoleCaptured = false;
const installConsoleCapture = () => {
  if (consoleCaptured) return;
  consoleCaptured = true;

  const fmt = (args) =>
    args
      .map((a) => (typeof a === 'string' ? a : (() => { try { return JSON.stringify(a); } catch { return String(a); } })()))
      .join(' ');

  const wrap = (original, level) =>
    (...args) => {
      try { log(level, fmt(args)); } catch { /* swallow */ }
      original(...args);
    };

  /* eslint-disable no-console */
  console.log   = wrap(console.log.bind(console),   'INFO');
  console.info  = wrap(console.info.bind(console),  'INFO');
  console.warn  = wrap(console.warn.bind(console),  'WARN');
  console.error = wrap(console.error.bind(console),  'ERROR');
  /* eslint-enable no-console */
};

/**
 * Lee las ultimas N lineas del log (incluye el backup rotado si hace falta).
 * Devuelve un array de entradas parseadas { ts, level, message }.
 * Opcionalmente filtra por nivel.
 *
 * @param {object} opts
 * @param {number} [opts.limit=200]  Cantidad de lineas a devolver (max 1000).
 * @param {string} [opts.level]      Filtrar por nivel exacto (INFO/WARN/ERROR/HTTP).
 */
const readRecentLogs = ({ limit = 200, level } = {}) => {
  const cap = Math.min(1000, Math.max(1, Number(limit) || 200));

  const readFileSafe = (p) => {
    try { return fs.readFileSync(p, 'utf8'); } catch { return ''; }
  };

  // Concatenar backup + actual para tener continuidad temporal.
  const raw = readFileSafe(`${LOG_FILE}.1`) + readFileSafe(LOG_FILE);
  if (!raw) return [];

  let lines = raw.split('\n').filter(Boolean);

  const parsed = lines.map((l) => {
    try {
      return JSON.parse(l);
    } catch {
      // Linea no-JSON (por si acaso): la envolvemos.
      return { ts: null, level: 'INFO', message: l };
    }
  });

  const filtered = level
    ? parsed.filter((e) => e.level === String(level).toUpperCase())
    : parsed;

  // Ultimas `cap` entradas, mas recientes primero.
  return filtered.slice(-cap).reverse();
};

module.exports = {
  stream,
  installConsoleCapture,
  readRecentLogs,
  LOG_FILE,
};
