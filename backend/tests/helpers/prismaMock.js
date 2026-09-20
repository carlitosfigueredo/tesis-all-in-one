/**
 * Mock de Prisma Client para tests de integración.
 *
 * Reemplaza src/lib/prisma.js con un objeto de funciones jest.fn(), de modo que
 * los controladores corran su lógica real (validaciones, flujos, respuestas)
 * pero SIN tocar una base de datos real. Cada test define qué devuelve cada
 * método según el escenario que quiere probar.
 *
 * Uso (en el test, ANTES de importar la app):
 *   jest.mock('../../src/lib/prisma', () => require('../helpers/prismaMock').prismaMock);
 */

const makeModel = () => ({
  findUnique: jest.fn(),
  findFirst: jest.fn(),
  findMany: jest.fn(),
  create: jest.fn(),
  createMany: jest.fn(),
  update: jest.fn(),
  updateMany: jest.fn(),
  delete: jest.fn(),
  count: jest.fn(),
  aggregate: jest.fn(),
  groupBy: jest.fn(),
});

const prismaMock = {
  user: makeModel(),
  company: makeModel(),
  employee: makeModel(),
  role: makeModel(),
  userRole: makeModel(),
  rolePermission: makeModel(),
  permission: makeModel(),
  passwordResetToken: makeModel(),
  riskSnapshot: makeModel(),
  auditLog: makeModel(),
  consentRecord: makeModel(),
  subscription: makeModel(),
  payment: makeModel(),
  systemConfig: makeModel(),
  planConfig: makeModel(),

  // $transaction soporta las dos formas que usa el código:
  //  - array de promesas: prisma.$transaction([p1, p2])
  //  - callback: prisma.$transaction(async (tx) => { ... }) usando el mismo mock como tx
  $transaction: jest.fn(async (arg) => {
    if (typeof arg === 'function') {
      return arg(prismaMock);
    }
    return Promise.all(arg);
  }),
};

module.exports = { prismaMock, makeModel };
