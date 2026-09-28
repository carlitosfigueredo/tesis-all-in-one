const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');

const router = require('./routes');
const errorHandler = require('./middlewares/errorHandler');
const logger = require('./lib/logger');

const app = express();

// Confia en el primer proxy (nginx/docker) para que req.ip refleje la IP real
// del cliente (X-Forwarded-For). Necesario para que el rate limiting por IP
// no agrupe a todos los usuarios bajo la IP del proxy.
app.set('trust proxy', 1);

// ─────────────────────────────────────────
// Middlewares globales
// ─────────────────────────────────────────

// Seguridad HTTP headers.
// HSTS explicito: fuerza HTTPS en el navegador por 1 anio (RNF de cifrado en transito).
app.use(helmet({
  hsts: { maxAge: 31536000, includeSubDomains: true, preload: true },
}));

// CORS: permite peticiones desde el frontend
app.use(
  cors({
    origin: process.env.NODE_ENV === 'production'
      ? process.env.FRONTEND_URL
      : ['http://localhost:5173', 'http://frontend:5173'],
    credentials: true,
  })
);

// Parseo de JSON y URL-encoded
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Logger de peticiones HTTP — a consola y a archivo (logs/app.log)
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
app.use(morgan('combined', { stream: logger.stream }));

// ─────────────────────────────────────────
// Rutas
// ─────────────────────────────────────────
app.use('/api', router);

// Ruta raíz de health check
app.get('/', (_req, res) => {
  res.json({
    status: 'ok',
    message: 'Sistema BI - API de Retención de Talento',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
  });
});

// Ruta no encontrada (404)
app.use((_req, res) => {
  res.status(404).json({ success: false, message: 'Ruta no encontrada' });
});

// Manejador de errores centralizado (debe ir al final)
app.use(errorHandler);

module.exports = app;
