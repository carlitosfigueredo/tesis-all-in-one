const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');

const router = require('./routes');
const errorHandler = require('./middlewares/errorHandler');

const app = express();

// ─────────────────────────────────────────
// Middlewares globales
// ─────────────────────────────────────────

// Seguridad HTTP headers
app.use(helmet());

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

// Logger de peticiones HTTP
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

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
