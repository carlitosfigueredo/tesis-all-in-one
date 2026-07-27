// Seed inicial - Sistema BI de Retencion de Talento
// Ejecutar: npx prisma db seed

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

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
      role: 'SUPER_ADMIN',
      companyId: null,
    },
  });
  console.log(`  ✓ Super Admin creado (${superAdmin.id})`);

  // ─── Empresa demo ───────────────────────────────────────────────────────────
  const demoCompany = await prisma.company.upsert({
    where: { id: 'comp-demo-1' },
    update: {},
    create: {
      id: 'comp-demo-1',
      name: 'Devsoft S.A.',
      plan: 'PROFESIONAL',
      active: true,
    },
  });
  console.log(`  ✓ Empresa demo creada (${demoCompany.id})`);

  // ─── Usuarios de la empresa demo ───────────────────────────────────────────
  const userPassword = await bcrypt.hash('Demo2025!', 12);

  const demoUsers = [
    { name: 'Ana Garcia',   email: 'admin@empresa.com',    role: 'COMPANY_ADMIN' },
    { name: 'Carlos Lopez', email: 'analista@empresa.com', role: 'ANALYST' },
    { name: 'Maria Torres', email: 'viewer@empresa.com',   role: 'VIEWER' },
  ];

  for (const u of demoUsers) {
    await prisma.user.upsert({
      where: { email: u.email },
      update: {},
      create: {
        name: u.name,
        email: u.email,
        password: userPassword,
        role: u.role,
        companyId: demoCompany.id,
      },
    });
  }
  console.log(`  ✓ ${demoUsers.length} usuarios demo creados`);

  // ─── Empleados de ejemplo ───────────────────────────────────────────────────
  const sampleEmployees = [
    {
      name: 'Juan Perez',
      job_role: 'Sales Executive',
      department: 'Sales',
      age: 32,
      gender: 'Male',
      marital_status: 'Married',
      education: 3,
      education_field: 'Marketing',
      monthly_income: 4500,
      job_satisfaction: 3,
      environment_satisfaction: 4,
      work_life_balance: 3,
      performance_rating: 3,
      years_at_company: 5,
      years_in_current_role: 3,
      years_since_last_promotion: 1,
      total_working_years: 10,
      num_companies_worked: 2,
      distance_from_home: 8,
      overtime: false,
      business_travel: 'Travel_Rarely',
      attrition: false,
      flight_risk: 0.25,
      risk_level: 'BAJO',
      companyId: demoCompany.id,
    },
    {
      name: 'Laura Gomez',
      job_role: 'Research Scientist',
      department: 'Research & Development',
      age: 28,
      gender: 'Female',
      marital_status: 'Single',
      education: 4,
      education_field: 'Life Sciences',
      monthly_income: 3200,
      job_satisfaction: 2,
      environment_satisfaction: 2,
      work_life_balance: 2,
      performance_rating: 3,
      years_at_company: 2,
      years_in_current_role: 1,
      years_since_last_promotion: 2,
      total_working_years: 4,
      num_companies_worked: 3,
      distance_from_home: 22,
      overtime: true,
      business_travel: 'Travel_Frequently',
      attrition: false,
      flight_risk: 0.78,
      risk_level: 'ALTO',
      companyId: demoCompany.id,
    },
    {
      name: 'Roberto Sanchez',
      job_role: 'Human Resources',
      department: 'Human Resources',
      age: 45,
      gender: 'Male',
      marital_status: 'Married',
      education: 3,
      education_field: 'Human Resources',
      monthly_income: 5800,
      job_satisfaction: 4,
      environment_satisfaction: 3,
      work_life_balance: 3,
      performance_rating: 4,
      years_at_company: 12,
      years_in_current_role: 5,
      years_since_last_promotion: 0,
      total_working_years: 20,
      num_companies_worked: 2,
      distance_from_home: 5,
      overtime: false,
      business_travel: 'Non-Travel',
      attrition: false,
      flight_risk: 0.12,
      risk_level: 'BAJO',
      companyId: demoCompany.id,
    },
    {
      name: 'Carolina Benitez',
      job_role: 'Sales Representative',
      department: 'Sales',
      age: 24,
      gender: 'Female',
      marital_status: 'Single',
      education: 2,
      education_field: 'Marketing',
      monthly_income: 2100,
      job_satisfaction: 1,
      environment_satisfaction: 1,
      work_life_balance: 1,
      performance_rating: 3,
      years_at_company: 1,
      years_in_current_role: 1,
      years_since_last_promotion: 1,
      total_working_years: 2,
      num_companies_worked: 2,
      distance_from_home: 28,
      overtime: true,
      business_travel: 'Travel_Frequently',
      attrition: false,
      flight_risk: 0.91,
      risk_level: 'ALTO',
      companyId: demoCompany.id,
    },
    {
      name: 'Miguel Villalba',
      job_role: 'Laboratory Technician',
      department: 'Research & Development',
      age: 35,
      gender: 'Male',
      marital_status: 'Married',
      education: 3,
      education_field: 'Medical',
      monthly_income: 3800,
      job_satisfaction: 3,
      environment_satisfaction: 3,
      work_life_balance: 3,
      performance_rating: 3,
      years_at_company: 7,
      years_in_current_role: 4,
      years_since_last_promotion: 2,
      total_working_years: 12,
      num_companies_worked: 1,
      distance_from_home: 10,
      overtime: false,
      business_travel: 'Travel_Rarely',
      attrition: false,
      flight_risk: 0.45,
      risk_level: 'MEDIO',
      companyId: demoCompany.id,
    },
  ];

  for (const emp of sampleEmployees) {
    await prisma.employee.create({ data: emp });
  }
  console.log(`  ✓ ${sampleEmployees.length} empleados de ejemplo creados`);

  console.log('\nSeed completado exitosamente!');
  console.log('\n── Credenciales de acceso ──');
  console.log('Super Admin:  carlosalberto.figueredoquevedo@gmail.com / Admin2025!');
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
