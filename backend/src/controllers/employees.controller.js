// TODO: Reemplazar con llamadas reales a Prisma una vez configurada la DB
// const { PrismaClient } = require('@prisma/client');
// const prisma = new PrismaClient();

// ─────────────────────────────────────────
// Dataset mock para desarrollo inicial
// ─────────────────────────────────────────
let mockEmployees = [
  {
    id: '1',
    name: 'Carlos Rodríguez',
    department: 'Ventas',
    position: 'Vendedor Senior',
    salary: 3500000,
    yearsInCompany: 3,
    performanceScore: 4.2,
    flightRisk: 0.72,  // Probabilidad de fuga (0-1), calculada por el modelo ML
    status: 'ACTIVE',
  },
  {
    id: '2',
    name: 'María González',
    department: 'Logística',
    position: 'Coordinadora',
    salary: 4200000,
    yearsInCompany: 7,
    performanceScore: 4.8,
    flightRisk: 0.15,
    status: 'ACTIVE',
  },
  {
    id: '3',
    name: 'Pedro Martínez',
    department: 'Atención al Cliente',
    position: 'Agente',
    salary: 2800000,
    yearsInCompany: 1,
    performanceScore: 3.1,
    flightRisk: 0.88,
    status: 'ACTIVE',
  },
];

const getAllEmployees = (_req, res) => {
  res.json({ success: true, data: mockEmployees, total: mockEmployees.length });
};

const getEmployeeById = (req, res) => {
  const employee = mockEmployees.find((e) => e.id === req.params.id);
  if (!employee) {
    return res.status(404).json({ success: false, message: 'Empleado no encontrado' });
  }
  res.json({ success: true, data: employee });
};

const createEmployee = (req, res) => {
  const newEmployee = {
    id: String(Date.now()),
    ...req.body,
    flightRisk: 0,
    status: 'ACTIVE',
  };
  mockEmployees.push(newEmployee);
  res.status(201).json({ success: true, data: newEmployee });
};

const updateEmployee = (req, res) => {
  const index = mockEmployees.findIndex((e) => e.id === req.params.id);
  if (index === -1) {
    return res.status(404).json({ success: false, message: 'Empleado no encontrado' });
  }
  mockEmployees[index] = { ...mockEmployees[index], ...req.body };
  res.json({ success: true, data: mockEmployees[index] });
};

const deleteEmployee = (req, res) => {
  const index = mockEmployees.findIndex((e) => e.id === req.params.id);
  if (index === -1) {
    return res.status(404).json({ success: false, message: 'Empleado no encontrado' });
  }
  mockEmployees.splice(index, 1);
  res.json({ success: true, message: 'Empleado eliminado correctamente' });
};

module.exports = {
  getAllEmployees,
  getEmployeeById,
  createEmployee,
  updateEmployee,
  deleteEmployee,
};
