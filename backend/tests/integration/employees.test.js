/**
 * ─────────────────────────────────────────────────────────────────────────────
 * Tests de integración — Empleados (CRUD, predicción ML, seguridad)
 * ─────────────────────────────────────────────────────────────────────────────
 * Corre la app real con Supertest. Prisma, ML, auditoría y permisos mockeados.
 *
 * Casos cubiertos:
 *   RF-03  Validación de datos al crear empleado (edad fuera de rango → 400)
 *   RF-04  Al crear un empleado se calcula y guarda su riesgo de deserción (ML)
 *   RNF-01 Aislamiento multi-tenant: un empleado de otra empresa no es accesible
 *   RNF-02 RBAC: sin el permiso requerido el acceso es denegado (403)
 *   RNF-05 Rendimiento/robustez: paginación acota el tamaño de página (máx 100)
 */

jest.mock('../../src/lib/prisma', () => require('../helpers/prismaMock').prismaMock);

jest.mock('../../src/services/audit.service', () => ({
  logAction: jest.fn().mockResolvedValue(undefined),
  getAuditLogs: jest.fn(),
}));

// Servicio ML mockeado: no necesitamos el microservicio Python levantado.
jest.mock('../../src/services/ml.service', () => ({
  calcularRiesgoEmpleado: jest.fn(),
  calcularRiesgoBatch: jest.fn(),
  employeeToFeatures: jest.fn(),
}));

// Carga de permisos controlada por test.
jest.mock('../../src/middlewares/permission.middleware', () => {
  const actual = jest.requireActual('../../src/middlewares/permission.middleware');
  return { ...actual, getUserPermissions: jest.fn() };
});

const request = require('supertest');
const jwt = require('jsonwebtoken');

const app = require('../../src/app');
const { prismaMock } = require('../helpers/prismaMock');
const { getUserPermissions } = require('../../src/middlewares/permission.middleware');
const mlService = require('../../src/services/ml.service');

const COMPANY_ID = 'company-1';
const USER_ID = 'user-1';

// Token para un usuario de empresa (portal company).
const token = jwt.sign(
  { id: USER_ID, roles: ['COMPANY_ADMIN'], companyId: COMPANY_ID, portal: 'company' },
  process.env.JWT_SECRET,
  { expiresIn: '1h' }
);

const auth = (req) => req.set('Authorization', `Bearer ${token}`);

/**
 * Configura los mocks comunes que atraviesan protect + requireActiveCompany.
 * @param {string[]} permissions permisos del usuario para este test
 */
function primeAuthMocks(permissions) {
  // protect -> prisma.user.findUnique
  prismaMock.user.findUnique.mockResolvedValue({
    id: USER_ID,
    name: 'Ana',
    email: 'ana@empresa.com',
    active: true,
    companyId: COMPANY_ID,
    company: { name: 'Acme SA', status: 'ACTIVE', plan: 'BASICO' },
  });
  // protect + requirePermission -> getUserPermissions
  getUserPermissions.mockResolvedValue({ permissions, roleNames: ['COMPANY_ADMIN'] });
  // requireActiveCompany -> prisma.company.findUnique (empresa activa, sin suscripción vencida)
  prismaMock.company.findUnique.mockResolvedValue({
    status: 'ACTIVE',
    name: 'Acme SA',
    subscription: null,
  });
}

const validEmployeeBody = {
  codigo_empleado: 'EMP-001',
  nombre: 'Juan',
  apellido: 'Pérez',
  edad: 30,
  nivel_formacion: 'Universitario',
  rol_tecnologico: 'Backend',
  seniority: 'Senior',
  antiguedad_meses: 24,
  modalidad_trabajo: 'Remoto',
  tipo_contrato: 'Indefinido',
  salario_mensual: 9000000,
};

describe('RF-04 — POST /api/employees (crea empleado + predicción ML)', () => {
  test('CP-RF-04: al crear un empleado se guarda el riesgo calculado por el modelo', async () => {
    primeAuthMocks(['employees.write']);
    mlService.calcularRiesgoEmpleado.mockResolvedValue({ riesgo_desercion: 0.82, nivel_riesgo: 'CRITICO' });
    prismaMock.employee.create.mockResolvedValue({
      id: 'emp-1', ...validEmployeeBody, riesgo_desercion: 0.82, nivel_riesgo: 'CRITICO', companyId: COMPANY_ID,
    });
    prismaMock.riskSnapshot.create.mockResolvedValue({});

    const res = await auth(request(app).post('/api/employees')).send(validEmployeeBody);

    expect(res.status).toBe(201);
    expect(mlService.calcularRiesgoEmpleado).toHaveBeenCalled();
    expect(res.body.data.riesgo_desercion).toBe(0.82);
    expect(res.body.data.nivel_riesgo).toBe('CRITICO');
    // Se guardó el primer snapshot de historial de riesgo
    expect(prismaMock.riskSnapshot.create).toHaveBeenCalled();
  });
});

describe('RF-03 — Validación de datos del empleado', () => {
  test('CP-RF-03: edad fuera de rango (18-65) → 400 con errores de validación', async () => {
    primeAuthMocks(['employees.write']);

    const res = await auth(request(app).post('/api/employees'))
      .send({ ...validEmployeeBody, edad: 15 });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.errors.join(' ')).toMatch(/edad fuera de rango/i);
    // No debe haberse llamado al modelo ni creado el empleado.
    expect(mlService.calcularRiesgoEmpleado).not.toHaveBeenCalled();
    expect(prismaMock.employee.create).not.toHaveBeenCalled();
  });

  test('CP-RF-03b: rol_tecnologico inválido → 400', async () => {
    primeAuthMocks(['employees.write']);

    const res = await auth(request(app).post('/api/employees'))
      .send({ ...validEmployeeBody, rol_tecnologico: 'Astronauta' });

    expect(res.status).toBe(400);
    expect(res.body.errors.join(' ')).toMatch(/rol_tecnologico invalido/i);
  });
});

describe('RNF-02 — Control de acceso por permisos (RBAC)', () => {
  test('CP-RNF-02: usuario sin permiso employees.write no puede crear empleados (403)', async () => {
    primeAuthMocks(['employees.read']); // le falta employees.write

    const res = await auth(request(app).post('/api/employees')).send(validEmployeeBody);

    expect(res.status).toBe(403);
    expect(res.body.message).toMatch(/no tenés permiso/i);
  });

  test('CP-RNF-02b: sin token → 401', async () => {
    const res = await request(app).post('/api/employees').send(validEmployeeBody);
    expect(res.status).toBe(401);
  });
});

describe('RNF-01 — Aislamiento multi-tenant', () => {
  test('CP-RNF-01: un empleado de otra empresa no es accesible (404)', async () => {
    primeAuthMocks(['employees.read']);
    // El controlador filtra por companyId; simulamos que no encuentra nada
    // porque el empleado pertenece a otra empresa.
    prismaMock.employee.findFirst.mockResolvedValue(null);

    const res = await auth(request(app).get('/api/employees/emp-de-otra-empresa'));

    expect(res.status).toBe(404);
    expect(res.body.message).toMatch(/empleado no encontrado/i);
    // Verificamos que la consulta se hizo filtrando por la empresa del usuario.
    const whereArg = prismaMock.employee.findFirst.mock.calls.at(-1)[0].where;
    expect(whereArg.companyId).toBe(COMPANY_ID);
  });
});

describe('RNF-05 — Paginación y robustez de listados', () => {
  test('CP-RNF-05: page_size mayor a 100 se acota a 100', async () => {
    primeAuthMocks(['employees.read']);
    prismaMock.employee.findMany.mockResolvedValue([]);
    prismaMock.employee.count.mockResolvedValue(0);

    const res = await auth(request(app).get('/api/employees?page=1&page_size=999'));

    expect(res.status).toBe(200);
    expect(res.body.page_size).toBe(100);
    // El take enviado a Prisma también se acotó a 100.
    const findArg = prismaMock.employee.findMany.mock.calls.at(-1)[0];
    expect(findArg.take).toBe(100);
  });
});
