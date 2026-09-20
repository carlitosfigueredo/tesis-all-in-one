/**
 * Configuración de Jest para el backend de la tesis.
 * Los tests corren en Node y cargan variables de entorno de prueba
 * desde tests/setupEnv.js ANTES de importar cualquier módulo de la app.
 */
module.exports = {
  testEnvironment: 'node',
  // Carga variables de entorno de test antes de que se importe la app.
  setupFiles: ['<rootDir>/tests/setupEnv.js'],
  // Solo buscamos tests dentro de la carpeta tests/
  testMatch: ['<rootDir>/tests/**/*.test.js'],
  // No cubrimos el arranque del servidor ni prisma generado.
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/index.js',
  ],
  clearMocks: true,
  verbose: true,
  // Algunos módulos (email.service) abren conexiones al cargarse; forzamos la
  // salida limpia tras terminar los tests para no colgar el proceso.
  forceExit: true,
};
