/**
 * ─────────────────────────────────────────────────────────────────────────────
 * Tests de integración — Autenticación y registro
 * ─────────────────────────────────────────────────────────────────────────────
 * Ejecuta la app Express real con Supertest. La base de datos (Prisma), la
 * auditoría, los correos y la carga de permisos se reemplazan por mocks, de
 * modo que se prueba la LÓGICA de los endpoints sin infraestructura externa.
 *
 * Casos cubiertos:
 *   RF-01  Login válido / inválido / bloqueo de cuenta tras 5 intentos
 *   RF-02  Registro de empresa exige aceptar consentimientos (Ley 7593/2025)
 *   RNF-02 Control de acceso: SUPER_ADMIN no puede entrar por el portal empresa
 *   RNF-03 Protección de datos: la respuesta nunca expone el hash de contraseña
 *   RNF-04 Usabilidad: mensajes de error claros y en español
 */

// ── Mocks (deben declararse antes de importar la app) ────────────────────────
jest.mock('../../src/lib/prisma', () => require('../helpers/prismaMock').prismaMock);

// Auditoría y emails: solo efectos secundarios, los anulamos.
jest.mock('../../src/services/audit.service', () => ({
  logAction: jest.fn().mockResolvedValue(undefined),
  getAuditLogs: jest.fn(),
}));
jest.mock('../../src/services/email.service', () => ({
  sendPasswordResetEmail: jest.fn().mockResolvedValue(undefined),
  sendPasswordChangedEmail: jest.fn().mockResolvedValue(undefined),
  sendAccountLockedEmail: jest.fn().mockResolvedValue(undefined),
}));

// Carga de permisos/roles: controlada por test vía este mock.
jest.mock('../../src/middlewares/permission.middleware', () => {
  const actual = jest.requireActual('../../src/middlewares/permission.middleware');
  return {
    ...actual,
    getUserPermissions: jest.fn(),
  };
});

// MX check del dominio de correo: evitar DNS real en registro.
jest.mock('../../src/utils/emailDomain.utils', () => {
  const actual = jest.requireActual('../../src/utils/emailDomain.utils');
  return { ...actual, hasValidMxRecords: jest.fn().mockResolvedValue(true) };
});

const request = require('supertest');
const bcrypt = require('bcryptjs');

const app = require('../../src/app');
const { prismaMock } = require('../helpers/prismaMock');
const { getUserPermissions } = require('../../src/middlewares/permission.middleware');

// Contraseña de prueba y su hash real (bcrypt) para simular la fila del usuario.
const PASSWORD = 'Password123!';
let PASSWORD_HASH;

beforeAll(async () => {
  PASSWORD_HASH = await bcrypt.hash(PASSWORD, 10);
});

const buildUser = (overrides = {}) => ({
  id: 'user-1',
  name: 'Ana Gómez',
  email: 'ana@empresa.com',
  password: PASSWORD_HASH,
  active: true,
  mustChangePassword: false,
  failedAttempts: 0,
  lockedUntil: null,
  companyId: 'company-1',
  company: { id: 'company-1', name: 'Acme SA', status: 'ACTIVE', plan: 'BASICO' },
  ...overrides,
});

describe('RF-01 — POST /api/auth/login', () => {
  test('CP-RF-01: login válido devuelve token y datos del usuario (200)', async () => {
    prismaMock.user.findUnique.mockResolvedValue(buildUser());
    getUserPermissions.mockResolvedValue({ permissions: ['employees.read'], roleNames: ['COMPANY_ADMIN'] });
    prismaMock.user.update.mockResolvedValue({});

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'ana@empresa.com', password: PASSWORD });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.token).toEqual(expect.any(String));
    expect(res.body.data.user.email).toBe('ana@empresa.com');
    expect(res.body.data.user.roles).toContain('COMPANY_ADMIN');
  });

  test('CP-RNF-03: la respuesta de login NO expone el hash de contraseña', async () => {
    prismaMock.user.findUnique.mockResolvedValue(buildUser());
    getUserPermissions.mockResolvedValue({ permissions: [], roleNames: ['COMPANY_ADMIN'] });
    prismaMock.user.update.mockResolvedValue({});

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'ana@empresa.com', password: PASSWORD });

    expect(res.status).toBe(200);
    expect(res.body.data.user).not.toHaveProperty('password');
    expect(res.body.data.user).not.toHaveProperty('failedAttempts');
    expect(res.body.data.user).not.toHaveProperty('lockedUntil');
  });

  test('CP-RF-01b: contraseña incorrecta devuelve 401 y mensaje en español', async () => {
    prismaMock.user.findUnique.mockResolvedValue(buildUser());
    getUserPermissions.mockResolvedValue({ permissions: [], roleNames: ['COMPANY_ADMIN'] });
    prismaMock.user.update.mockResolvedValue({});

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'ana@empresa.com', password: 'clave-incorrecta' });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/correo o la contraseña no son correctos/i);
  });

  test('CP-RF-01c: al 5º intento fallido se bloquea la cuenta (guarda lockedUntil)', async () => {
    // El usuario llega con 4 intentos previos; este es el 5º.
    prismaMock.user.findUnique.mockResolvedValue(buildUser({ failedAttempts: 4 }));
    getUserPermissions.mockResolvedValue({ permissions: [], roleNames: ['COMPANY_ADMIN'] });
    prismaMock.user.update.mockResolvedValue({});

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'ana@empresa.com', password: 'clave-incorrecta' });

    expect(res.status).toBe(401);
    // Debe haberse guardado el bloqueo (lockedUntil como fecha futura).
    const updateArg = prismaMock.user.update.mock.calls.at(-1)[0];
    expect(updateArg.data.failedAttempts).toBe(5);
    expect(updateArg.data.lockedUntil).toBeInstanceOf(Date);
  });

  test('CP-RF-01d: cuenta bloqueada devuelve 423 aunque la contraseña sea correcta', async () => {
    const futuro = new Date(Date.now() + 10 * 60 * 1000);
    prismaMock.user.findUnique.mockResolvedValue(buildUser({ lockedUntil: futuro }));
    getUserPermissions.mockResolvedValue({ permissions: [], roleNames: ['COMPANY_ADMIN'] });

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'ana@empresa.com', password: PASSWORD });

    expect(res.status).toBe(423);
    expect(res.body.message).toMatch(/bloqueada/i);
  });

  test('CP-RNF-02: SUPER_ADMIN no puede iniciar sesión por el portal de empresas', async () => {
    prismaMock.user.findUnique.mockResolvedValue(buildUser({ companyId: null, company: null }));
    getUserPermissions.mockResolvedValue({ permissions: ['*'], roleNames: ['SUPER_ADMIN'] });

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'ana@empresa.com', password: PASSWORD });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  test('CP-RNF-04: faltan credenciales → 400 con mensaje claro en español', async () => {
    const res = await request(app).post('/api/auth/login').send({ email: 'ana@empresa.com' });
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    // La validación de schema (Zod) responde con un mensaje genérico en español
    // y detalla el campo faltante en el arreglo de errores.
    expect(res.body.message).toMatch(/revisá los datos/i);
    const campos = (res.body.errors ?? []).map((e) => e.field);
    expect(campos).toContain('password');
  });
});

describe('RF-02 — POST /api/auth/register (registro con consentimiento)', () => {
  const baseBody = {
    companyName: 'Nueva Empresa SA',
    plan: 'BASICO',
    name: 'Carlos Ruiz',
    email: 'carlos@nuevaempresa.com',
    password: 'Password123!',
    confirmPassword: 'Password123!',
  };

  test('CP-RF-02: sin aceptar la Política de Privacidad → 400', async () => {
    prismaMock.user.findUnique.mockResolvedValue(null); // email no existe
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        ...baseBody,
        consents: {
          privacyPolicy: { accepted: false, version: '1.0' },
          termsAndConditions: { accepted: true, version: '1.0' },
        },
      });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/Política de Privacidad/i);
  });

  test('CP-RF-02b: aceptando ambos consentimientos → 201 y crea empresa+usuario', async () => {
    prismaMock.user.findUnique.mockResolvedValue(null);
    prismaMock.role.findFirst.mockResolvedValue({ id: 'role-company-admin' });
    prismaMock.company.create.mockResolvedValue({ id: 'company-9', name: baseBody.companyName, plan: 'BASICO', status: 'PENDING_PAYMENT' });
    prismaMock.user.create.mockResolvedValue({ id: 'user-9', name: baseBody.name, email: baseBody.email, companyId: 'company-9' });
    prismaMock.userRole.create.mockResolvedValue({});
    prismaMock.consentRecord.createMany.mockResolvedValue({ count: 2 });
    getUserPermissions.mockResolvedValue({ permissions: ['dashboard.view'], roleNames: ['COMPANY_ADMIN'] });

    const res = await request(app)
      .post('/api/auth/register')
      .send({
        ...baseBody,
        consents: {
          privacyPolicy: { accepted: true, version: '1.0' },
          termsAndConditions: { accepted: true, version: '1.0' },
        },
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.token).toEqual(expect.any(String));
    // Se registraron los consentimientos (Ley 7593/2025)
    expect(prismaMock.consentRecord.createMany).toHaveBeenCalled();
    expect(res.body.data.user.companyPlan).toBe('BASICO');
  });

  test('CP-RF-02c: email ya registrado → 409', async () => {
    prismaMock.user.findUnique.mockResolvedValue({ id: 'existe' });
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        ...baseBody,
        consents: {
          privacyPolicy: { accepted: true, version: '1.0' },
          termsAndConditions: { accepted: true, version: '1.0' },
        },
      });

    expect(res.status).toBe(409);
    expect(res.body.message).toMatch(/ya existe una cuenta/i);
  });
});
