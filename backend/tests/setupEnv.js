/**
 * Variables de entorno mínimas para el entorno de pruebas.
 * Se cargan ANTES de importar la app (ver jest.config.js -> setupFiles).
 *
 * Importante:
 *  - No definimos RECAPTCHA_SECRET_KEY: así el middleware verifyRecaptcha
 *    hace pass-through y no llama a Google durante los tests.
 *  - JWT_SECRET es un valor de prueba, NO usar en producción.
 */
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret-solo-para-pruebas';
process.env.JWT_EXPIRES_IN = '8h';
process.env.FRONTEND_URL = 'http://localhost:5173';
