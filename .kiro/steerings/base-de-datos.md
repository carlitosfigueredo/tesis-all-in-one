---
inclusion: always
---

# Base de datos — PostgreSQL + Prisma

## Reglas generales

- Todo cambio de esquema se hace **exclusivamente** via `prisma migrate dev` (desarrollo) o `prisma migrate deploy` (produccion/Docker).
- No modificar la BD directamente con SQL salvo para el script inicial `db/init.sql`.
- Usar UUIDs (`@default(uuid())`) como claves primarias en todas las tablas.
- Campos de auditoria minimos en toda tabla: `createdAt`, `updatedAt`.
- Cada tabla de negocio tiene `companyId` como campo de aislamiento de tenant.

---

## Schema real implementado (backend/prisma/schema.prisma)

### Company (tenant)

```prisma
model Company {
  id        String        @id @default(uuid())
  name      String
  plan      Plan          @default(BASICO)
  status    CompanyStatus @default(PENDING_PAYMENT)
  active    Boolean       @default(true)
  createdAt DateTime      @default(now())
  updatedAt DateTime      @updatedAt

  users     User[]
  employees Employee[]
  auditLogs AuditLog[]
  @@map("companies")
}

enum CompanyStatus {
  PENDING_PAYMENT  // Recien registrada, no pago aun
  TRIAL            // Periodo de prueba
  ACTIVE           // Pago confirmado, acceso total
  SUSPENDED        // Suspendida por falta de pago
}

enum Plan {
  BASICO
  PROFESIONAL
  EMPRESARIAL
}
```

### User

```prisma
model User {
  id             String   @id @default(uuid())
  name           String
  email          String   @unique
  password       String              // bcrypt hash (salt 12)
  role           Role     @default(VIEWER)
  active         Boolean  @default(true)
  failedAttempts Int      @default(0)
  lockedUntil    DateTime?           // Bloqueo temporal (5 intentos = 15 min)
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt
  companyId      String?             // null para SUPER_ADMIN
  company        Company? @relation(...)
  auditLogs      AuditLog[]
  resetTokens    PasswordResetToken[]
  @@map("users")
}

enum Role {
  SUPER_ADMIN     // Admin global de la plataforma
  COMPANY_ADMIN   // Admin de una empresa cliente
  ANALYST         // Puede analizar y ver predicciones
  VIEWER          // Solo lectura
}
```

### Employee

```prisma
model Employee {
  id                         String         @id @default(uuid())
  name                       String?
  job_role                   String
  department                 String
  age                        Int
  gender                     String
  marital_status             String?
  education                  Int?
  education_field            String?
  monthly_income             Float
  job_satisfaction           Int
  environment_satisfaction   Int?
  work_life_balance          Int?
  performance_rating         Int?
  years_at_company           Int
  years_in_current_role      Int?
  years_since_last_promotion Int?
  total_working_years        Int?
  num_companies_worked       Int?
  distance_from_home         Int?
  overtime                   Boolean        @default(false)
  business_travel            String?
  attrition                  Boolean        @default(false)
  flight_risk                Float          @default(0)
  risk_level                 String         @default("BAJO")
  status                     EmployeeStatus @default(ACTIVE)
  createdAt                  DateTime       @default(now())
  updatedAt                  DateTime       @updatedAt
  companyId                  String?
  company                    Company? @relation(...)
  @@map("employees")
}
```

### PlanConfig

```prisma
model PlanConfig {
  id                  String   @id          // ESTANDAR, PROFESIONAL, CORPORATIVO
  name                String
  priceGs             Int
  highlight           Boolean  @default(false)
  employeeLimit       Int
  predictionFrequency String
  dashboardType       String
  features            String[]
  cta                 String   @default("Contratar")
  active              Boolean  @default(true)
  createdAt           DateTime @default(now())
  updatedAt           DateTime @updatedAt
  @@map("plan_configs")
}
```

### AuditLog

```prisma
model AuditLog {
  id         String   @id @default(uuid())
  action     String
  resource   String?
  resourceId String?
  oldValue   Json?
  newValue   Json?
  ipAddress  String?
  userAgent  String?
  status     String   @default("SUCCESS")
  errorMsg   String?
  createdAt  DateTime @default(now())
  tenantId   String?
  company    Company? @relation(...)
  userId     String?
  user       User?    @relation(...)
  @@index([tenantId])
  @@index([userId])
  @@index([action])
  @@index([createdAt])
  @@map("audit_logs")
}
```

### PasswordResetToken

```prisma
model PasswordResetToken {
  id        String    @id @default(uuid())
  tokenHash String    @unique
  expiresAt DateTime
  usedAt    DateTime?
  createdAt DateTime  @default(now())
  userId    String
  user      User      @relation(...)
  @@map("password_reset_tokens")
}
```

---

## Aislamiento por tenant

- `employees.controller.js` y `users.controller.js` usan `getCompanyFilter(req.user)` que retorna `{ companyId: user.companyId }` para roles de empresa y `{}` para SUPER_ADMIN.
- Nunca exponer datos de una empresa a otra.
- Al crear recursos, siempre asignar el `companyId` del usuario autenticado (excepto SUPER_ADMIN que puede especificarlo).

---

## Migraciones existentes

1. `20260727221553_init` — Tablas base: companies, users, employees, plan_configs, audit_logs, password_reset_tokens
2. `20260727223200_add_company_status` — Enum CompanyStatus + campo status en companies

---

## Comandos (desde el host, fuera de Docker)

```bash
cd backend

# Crear nueva migracion
DATABASE_URL="postgresql://tesis_user:tesis_pass@localhost:5432/tesis_bi_db" npx prisma migrate dev --name nombre

# Regenerar cliente
DATABASE_URL="postgresql://tesis_user:tesis_pass@localhost:5432/tesis_bi_db" npx prisma generate

# Reset completo (borra todo y re-seedea)
DATABASE_URL="postgresql://tesis_user:tesis_pass@localhost:5432/tesis_bi_db" npx prisma migrate reset

# Ver datos en browser
DATABASE_URL="postgresql://tesis_user:tesis_pass@localhost:5432/tesis_bi_db" npx prisma studio
```

Dentro de Docker el CMD del backend ejecuta automaticamente `prisma generate` + `prisma migrate deploy` al arrancar.

---

## Seed (backend/prisma/seed.js)

Datos iniciales:
- 3 planes (Estandar, Profesional, Corporativo)
- 1 super admin
- 1 empresa demo "Devsoft S.A." con status ACTIVE
- 3 usuarios demo (COMPANY_ADMIN, ANALYST, VIEWER)
- 5 empleados de ejemplo con distintos niveles de riesgo
