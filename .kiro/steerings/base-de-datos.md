---
inclusion: always
---

# Base de datos — PostgreSQL + Prisma

## Reglas generales

- Todo cambio de esquema se hace via `prisma migrate dev` (desarrollo) o `prisma migrate deploy` (Docker).
- UUIDs como claves primarias. Campos `createdAt`, `updatedAt` en toda tabla.
- Aislamiento por tenant: `companyId` en tablas de negocio.

---

## Schema actual (modelo Employee actualizado julio 2026)

### Company (tenant)

```prisma
model Company {
  id        String        @id @default(uuid())
  name      String
  plan      Plan          @default(BASICO)
  status    CompanyStatus @default(PENDING_PAYMENT)
  active    Boolean       @default(true)
  ...
}

enum Plan { BASICO, PROFESIONAL, CORPORATIVO }
enum CompanyStatus { PENDING_PAYMENT, TRIAL, ACTIVE, SUSPENDED }
```

### User

```prisma
model User {
  id                 String   @id @default(uuid())
  name               String
  email              String   @unique
  password           String              // bcrypt hash (salt 12)
  active             Boolean  @default(true)
  mustChangePassword Boolean  @default(false)  // true al crear desde admin
  failedAttempts     Int      @default(0)
  lockedUntil        DateTime?
  companyId          String?             // null para SUPER_ADMIN
  // Relaciones: company, userRoles, auditLogs, resetTokens
}
```

Notas:
- `mustChangePassword`: se setea a true cuando el admin crea un usuario. Se pone en false al cambiar la pass.
- RBAC via tablas: UserRole, Role, RolePermission, Permission (ya no hay enum Role en User)
- Roles del sistema: SUPER_ADMIN, COMPANY_ADMIN, ANALYST, VIEWER

### Employee (variables de desercion para software PY)

```prisma
model Employee {
  id        String         @id @default(uuid())
  status    EmployeeStatus @default(ACTIVE)

  // Datos de RRHH (obligatorios)
  edad                        Int
  nivel_formacion             String    // Secundaria, Tecnico, Universitario, Posgrado
  rol_tecnologico             String    // Frontend, Backend, Fullstack, Mobile, DevOps, QA, Data
  seniority                   String    // Trainee, Junior, Semi-Senior, Senior, Lead
  antiguedad_meses            Int
  modalidad_trabajo           String    // Presencial, Hibrido, Remoto
  tipo_contrato               String    // Indefinido, Plazo fijo, Eventual
  salario_mensual             Int       // En guaranies (Gs.)
  cantidad_horas_extra_mes    Int       @default(0)
  capacitacion_ultimo_anio    Boolean   @default(false)
  evaluacion_desempeno        Int       @default(3)  // 1-5
  cantidad_empresas_anteriores Int      @default(0)

  // Encuesta clima (opcionales)
  satisfaccion_laboral        Int?      // 1-5
  satisfaccion_ambiente       Int?
  equilibrio_vida_trabajo     Int?
  estancamiento_carrera       Int?
  feedback_lider              Int?

  // Resultado de prediccion (calculado por ML)
  riesgo_desercion            Float     @default(0)
  nivel_riesgo                String    @default("BAJO")  // CRITICO, ALTO, MEDIO, BAJO
  desercion_real              Boolean   @default(false)

  companyId String?
}
```

---

## Migraciones

1. `20260727221553_init` — Tablas base
2. `20260727223200_add_company_status` — Enum CompanyStatus
3. `20260728045948_add_payments_subscriptions` — Pagos y suscripciones
4. `20260729040310_rbac_roles_permissions` — Sistema RBAC
5. `20260729120000_employee_new_variables` — Modelo Employee custom (desercion PY)
6. `20260729140000_rename_plan_empresarial_to_corporativo` — Rename enum Plan
7. `20260730010000_add_must_change_password` — Campo mustChangePassword en User

---

## Aislamiento por tenant

- `getCompanyFilter(user)` retorna `{ companyId: user.companyId }` o `{}` para SUPER_ADMIN
- Usa `user.roleNames?.includes('SUPER_ADMIN')` (no `user.role`)
- Todos los queries de empleados/usuarios filtran por companyId
