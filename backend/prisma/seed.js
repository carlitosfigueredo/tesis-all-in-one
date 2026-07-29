// Seed inicial - Sistema BI de Retencion de Talento
// Ejecutar: npx prisma db seed

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

// ─── Definicion de permisos del sistema ───────────────────────────────────────

const PERMISSIONS = [
  // Empleados
  { code: 'employees.read',    name: 'Ver empleados',           module: 'employees' },
  { code: 'employees.write',   name: 'Crear/editar empleados',  module: 'employees' },
  { code: 'employees.delete',  name: 'Eliminar empleados',      module: 'employees' },
  { code: 'employees.import',  name: 'Importar empleados CSV',  module: 'employees' },
  // Predicciones ML
  { code: 'predictions.run',   name: 'Ejecutar prediccion',     module: 'predictions' },
  { code: 'predictions.batch', name: 'Prediccion en batch',     module: 'predictions' },
  // Dashboard
  { code: 'dashboard.view',    name: 'Ver dashboard',           module: 'dashboard' },
  // Modelo ML
  { code: 'model.view',        name: 'Ver estado del modelo',   module: 'model' },
  { code: 'model.train',       name: 'Entrenar modelo',         module: 'model' },
  // Usuarios de empresa
  { code: 'users.read',        name: 'Ver usuarios',            module: 'users' },
  { code: 'users.write',       name: 'Crear/editar usuarios',   module: 'users' },
  { code: 'users.toggle',      name: 'Activar/desactivar usuarios', module: 'users' },
  // Pagos
  { code: 'payments.view',     name: 'Ver pagos/suscripcion',   module: 'payments' },
  { code: 'payments.process',  name: 'Procesar pagos',          module: 'payments' },
  // Admin global
  { code: 'admin.companies',   name: 'Gestionar empresas',      module: 'admin' },
  { code: 'admin.plans',       name: 'Gestionar planes',        module: 'admin' },
  { code: 'admin.audit',       name: 'Ver auditoria global',    module: 'admin' },
  { code: 'admin.payments',    name: 'Ver pagos globales',      module: 'admin' },
  { code: 'admin.roles',       name: 'Gestionar roles/permisos', module: 'admin' },
];

// ─── Definicion de roles default con sus permisos ─────────────────────────────

const SYSTEM_ROLES = [
  {
    name: 'SUPER_ADMIN',
    description: 'Administrador global de la plataforma',
    permissions: PERMISSIONS.map((p) => p.code), // Todos los permisos
  },
  {
    name: 'COMPANY_ADMIN',
    description: 'Administrador de empresa cliente',
    permissions: [
      'employees.read', 'employees.write', 'employees.delete', 'employees.import',
      'predictions.run', 'predictions.batch',
      'dashboard.view',
      'model.view', 'model.train',
      'users.read', 'users.write', 'users.toggle',
      'payments.view', 'payments.process',
    ],
  },
  {
    name: 'ANALYST',
    description: 'Analista - puede ver y analizar datos',
    permissions: [
      'employees.read',
      'predictions.run', 'predictions.batch',
      'dashboard.view',
      'model.view',
    ],
  },
  {
    name: 'VIEWER',
    description: 'Solo lectura - puede ver datos sin modificar',
    permissions: [
      'employees.read',
      'dashboard.view',
    ],
  },
];

async function main() {
  console.log('Seeding database...');

  // ─── Permisos ───────────────────────────────────────────────────────────────
  for (const perm of PERMISSIONS) {
    await prisma.permission.upsert({
      where: { code: perm.code },
      update: { name: perm.name, module: perm.module },
      create: perm,
    });
  }
  console.log(`  ✓ ${PERMISSIONS.length} permisos creados/actualizados`);

  // ─── Roles del sistema (globales, companyId = null) ─────────────────────────
  for (const roleDef of SYSTEM_ROLES) {
    let role = await prisma.role.findFirst({
      where: { name: roleDef.name, companyId: null },
    });

    if (!role) {
      role = await prisma.role.create({
        data: {
          name: roleDef.name,
          description: roleDef.description,
          isSystem: true,
          companyId: null,
        },
      });
    } else {
      await prisma.role.update({
        where: { id: role.id },
        data: { description: roleDef.description, isSystem: true },
      });
    }

    // Asignar permisos al rol
    for (const permCode of roleDef.permissions) {
      const permission = await prisma.permission.findUnique({ where: { code: permCode } });
      if (permission) {
        await prisma.rolePermission.upsert({
          where: { roleId_permissionId: { roleId: role.id, permissionId: permission.id } },
          update: {},
          create: { roleId: role.id, permissionId: permission.id },
        });
      }
    }
  }
  console.log(`  ✓ ${SYSTEM_ROLES.length} roles del sistema creados con permisos`);

  // ─── Planes ─────────────────────────────────────────────────────────────────
  const planes = [
    {
      id: 'ESTANDAR',
      name: 'Plan Estandar',
      priceGs: 999000,
      highlight: false,
      employeeLimit: 100,
      predictionFrequency: 'Mensual',
      dashboardType: 'Basico',
      features: [
        'Hasta 100 colaboradores',
        'Prediccion de fuga mensual',
        'Dashboard basico de retencion',
        'Exportacion CSV',
        'Soporte por correo',
      ],
      cta: 'Contratar',
    },
    {
      id: 'PROFESIONAL',
      name: 'Plan Profesional',
      priceGs: 1390000,
      highlight: true,
      employeeLimit: 500,
      predictionFrequency: 'Semanal',
      dashboardType: 'Avanzado',
      features: [
        'Hasta 500 colaboradores',
        'Todo lo del Plan Estandar',
        'Prediccion de fuga semanal',
        'Dashboard avanzado con filtros',
        'Importacion masiva CSV',
        'Soporte prioritario',
      ],
      cta: 'Contratar',
    },
    {
      id: 'CORPORATIVO',
      name: 'Plan Corporativo',
      priceGs: 2590000,
      highlight: false,
      employeeLimit: 1500,
      predictionFrequency: 'Bajo demanda',
      dashboardType: 'Avanzado + Personalizado',
      features: [
        'Hasta 1.500 colaboradores',
        'Todo lo del Plan Profesional',
        'Prediccion bajo demanda',
        'Dashboard personalizado',
        'Integracion con sistemas HRIS',
        'Gerente de cuenta dedicado',
      ],
      cta: 'Contratar',
    },
  ];

  for (const plan of planes) {
    await prisma.planConfig.upsert({
      where: { id: plan.id },
      update: plan,
      create: plan,
    });
  }
  console.log(`  ✓ ${planes.length} planes creados`);

  // ─── Super Admin ────────────────────────────────────────────────────────────
  const superAdminPassword = await bcrypt.hash('Admin2025!', 12);

  const superAdmin = await prisma.user.upsert({
    where: { email: 'carlosalberto.figueredoquevedo@gmail.com' },
    update: {},
    create: {
      name: 'Carlos Figueredo',
      email: 'carlosalberto.figueredoquevedo@gmail.com',
      password: superAdminPassword,
      companyId: null,
    },
  });

  // Asignar rol SUPER_ADMIN
  const superAdminRole = await prisma.role.findFirst({ where: { name: 'SUPER_ADMIN', companyId: null } });
  if (superAdminRole) {
    await prisma.userRole.upsert({
      where: { userId_roleId: { userId: superAdmin.id, roleId: superAdminRole.id } },
      update: {},
      create: { userId: superAdmin.id, roleId: superAdminRole.id },
    });
  }
  console.log(`  ✓ Super Admin creado (${superAdmin.id})`);

  // ─── Empresa demo ───────────────────────────────────────────────────────────
  const demoCompany = await prisma.company.upsert({
    where: { id: 'comp-demo-1' },
    update: {},
    create: {
      id: 'comp-demo-1',
      name: 'Devsoft S.A.',
      plan: 'PROFESIONAL',
      status: 'ACTIVE',
      active: true,
    },
  });
  console.log(`  ✓ Empresa demo creada (${demoCompany.id})`);

  // ─── Usuarios de la empresa demo ───────────────────────────────────────────
  const userPassword = await bcrypt.hash('Demo2025!', 12);

  const demoUsers = [
    { name: 'Ana Garcia',   email: 'admin@empresa.com',    roleName: 'COMPANY_ADMIN' },
    { name: 'Carlos Lopez', email: 'analista@empresa.com', roleName: 'ANALYST' },
    { name: 'Maria Torres', email: 'viewer@empresa.com',   roleName: 'VIEWER' },
  ];

  for (const u of demoUsers) {
    const user = await prisma.user.upsert({
      where: { email: u.email },
      update: {},
      create: {
        name: u.name,
        email: u.email,
        password: userPassword,
        companyId: demoCompany.id,
      },
    });

    // Asignar rol
    const role = await prisma.role.findFirst({ where: { name: u.roleName, companyId: null } });
    if (role) {
      await prisma.userRole.upsert({
        where: { userId_roleId: { userId: user.id, roleId: role.id } },
        update: {},
        create: { userId: user.id, roleId: role.id },
      });
    }
  }
  console.log(`  ✓ ${demoUsers.length} usuarios demo creados con roles`);

  // ─── Empleados de ejemplo ───────────────────────────────────────────────────
  const existingEmployees = await prisma.employee.count({ where: { companyId: demoCompany.id } });
  if (existingEmployees === 0) {
    const sampleEmployees = [
      { name: 'Juan Perez', job_role: 'Sales Executive', department: 'Sales', age: 32, gender: 'Male', monthly_income: 4500, job_satisfaction: 3, years_at_company: 5, flight_risk: 0.25, risk_level: 'BAJO', companyId: demoCompany.id },
      { name: 'Laura Gomez', job_role: 'Research Scientist', department: 'Research & Development', age: 28, gender: 'Female', monthly_income: 3200, job_satisfaction: 2, years_at_company: 2, overtime: true, flight_risk: 0.78, risk_level: 'ALTO', companyId: demoCompany.id },
      { name: 'Roberto Sanchez', job_role: 'Human Resources', department: 'Human Resources', age: 45, gender: 'Male', monthly_income: 5800, job_satisfaction: 4, years_at_company: 12, flight_risk: 0.12, risk_level: 'BAJO', companyId: demoCompany.id },
      { name: 'Carolina Benitez', job_role: 'Sales Representative', department: 'Sales', age: 24, gender: 'Female', monthly_income: 2100, job_satisfaction: 1, years_at_company: 1, overtime: true, flight_risk: 0.91, risk_level: 'ALTO', companyId: demoCompany.id },
      { name: 'Miguel Villalba', job_role: 'Laboratory Technician', department: 'Research & Development', age: 35, gender: 'Male', monthly_income: 3800, job_satisfaction: 3, years_at_company: 7, flight_risk: 0.45, risk_level: 'MEDIO', companyId: demoCompany.id },
    ];

    for (const emp of sampleEmployees) {
      await prisma.employee.create({ data: emp });
    }
    console.log(`  ✓ ${sampleEmployees.length} empleados de ejemplo creados`);
  } else {
    console.log(`  ✓ Empleados ya existen (${existingEmployees}), no se recrean`);
  }

  console.log('\nSeed completado exitosamente!');
  console.log('\n── Credenciales de acceso ──');
  console.log('Super Admin:   carlosalberto.figueredoquevedo@gmail.com / Admin2025!');
  console.log('Admin Empresa: admin@empresa.com / Demo2025!');
  console.log('Analista:      analista@empresa.com / Demo2025!');
  console.log('Viewer:        viewer@empresa.com / Demo2025!');
}

main()
  .catch((e) => {
    console.error('Error en seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
