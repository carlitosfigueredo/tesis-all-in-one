---
inclusion: always
---

# Base de datos — PostgreSQL + Prisma

## Reglas generales

- Todo cambio de esquema se hace **exclusivamente** via `prisma migrate dev` (desarrollo) o `prisma migrate deploy` (producción).
- No modificar la BD directamente con SQL salvo para el script inicial `db/init.sql`.
- Cada tabla que represente datos de negocio tiene `tenantId` como campo obligatorio.
- Usar UUIDs (`@default(uuid())`) como claves primarias en todas las tablas. No usar auto-increment.
- Campos de auditoría mínimos en toda tabla: `createdAt`, `updatedAt`. Las tablas críticas agregan `createdBy`.

---

## Esquema completo del sistema

A continuación se documenta el modelo de datos objetivo. Este es el contrato que guía la implementación.

### Tenants (empresas)

```prisma
model Tenant {
  id          String   @id @default(uuid())
  name        String                          // Nombre de la empresa
  slug        String   @unique                // Identificador URL-friendly: "empresa-acme"
  plan        Plan     @default(FREE)
  isActive    Boolean  @default(true)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  users       User[]
  employees   Employee[]
  auditLogs   AuditLog[]

  @@map("tenants")
}

enum Plan {
  FREE
  PRO
  ENTERPRISE
}
```

### Usuarios

```prisma
model User {
  id               String    @id @default(uuid())
  tenantId         String
  name             String
  email            String
  password         String                        // bcrypt hash
  role             Role      @default(ANALYST)
  isActive         Boolean   @default(true)
  emailVerified    Boolean   @default(false)
  emailVerifiedAt  DateTime?
  lockedUntil      DateTime?                     // Bloqueo temporal por intentos fallidos
  failedLoginCount Int       @default(0)
  lastLoginAt      DateTime?
  lastLoginIp      String?
  createdAt        DateTime  @default(now())
  updatedAt        DateTime  @updatedAt
  createdBy        String?                       // userId que lo creó

  tenant           Tenant    @relation(fields: [tenantId], references: [id])
  passwordHistory  PasswordHistory[]
  passwordResets   PasswordReset[]
  refreshTokens    RefreshToken[]
  auditLogs        AuditLog[]

  @@unique([tenantId, email])                   // Email unico por tenant
  @@map("users")
}

enum Role {
  SUPER_ADMIN    // Administrador global del SaaS (no pertenece a un tenant)
  ADMIN          // Administrador de la empresa
  ANALYST        // Analista HR con acceso completo de lectura/escritura
  VIEWER         // Solo lectura
}
```

### Historial de contraseñas

```prisma
model PasswordHistory {
  id           String   @id @default(uuid())
  userId       String
  passwordHash String                          // bcrypt hash de contraseña anterior
  createdAt    DateTime @default(now())

  user         User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@map("password_history")
}
```

### Reset de contraseña

```prisma
model PasswordReset {
  id         String    @id @default(uuid())
  userId     String
  tokenHash  String    @unique               // SHA-256 del token enviado al usuario
  expiresAt  DateTime                        // now + 5 minutos
  usedAt     DateTime?                       // null = no usado, not null = ya consumido
  ipAddress  String?
  createdAt  DateTime  @default(now())

  user       User      @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@map("password_resets")
}
```

### Refresh tokens

```prisma
model RefreshToken {
  id          String    @id @default(uuid())
  userId      String
  tokenHash   String    @unique
  expiresAt   DateTime
  revokedAt   DateTime?
  ipAddress   String?
  userAgent   String?
  createdAt   DateTime  @default(now())

  user        User      @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@map("refresh_tokens")
}
```

### Empleados

```prisma
model Employee {
  id               String         @id @default(uuid())
  tenantId         String
  name             String
  email            String?
  department       String
  position         String
  salary           Float
  yearsInCompany   Int
  performanceScore Float          @default(0)
  flightRisk       Float          @default(0)   // Score 0-1 del modelo ML
  status           EmployeeStatus @default(ACTIVE)
  hireDate         DateTime       @default(now())
  createdAt        DateTime       @default(now())
  updatedAt        DateTime       @updatedAt
  createdBy        String?

  tenant           Tenant         @relation(fields: [tenantId], references: [id])
  predictions      MlPrediction[]

  @@map("employees")
}

enum EmployeeStatus {
  ACTIVE
  INACTIVE
  RESIGNED
}
```

### Predicciones ML

```prisma
model MlPrediction {
  id           String   @id @default(uuid())
  employeeId   String
  modelVersion String
  flightRisk   Float
  features     Json                           // Snapshot de features usadas
  requestedBy  String                         // userId
  createdAt    DateTime @default(now())

  employee     Employee @relation(fields: [employeeId], references: [id], onDelete: Cascade)

  @@map("ml_predictions")
}
```

### Logs de auditoría

```prisma
model AuditLog {
  id         String   @id @default(uuid())
  tenantId   String?                         // null para acciones globales
  userId     String?                         // null si la accion fue anonima
  action     String                          // LOGIN, LOGOUT, CREATE_EMPLOYEE, etc.
  resource   String?                         // Nombre de la entidad afectada
  resourceId String?                         // ID del recurso afectado
  oldValue   Json?                           // Estado anterior (para updates)
  newValue   Json?                           // Estado nuevo (para updates/creates)
  ipAddress  String?
  userAgent  String?
  status     AuditStatus @default(SUCCESS)
  errorMsg   String?
  createdAt  DateTime @default(now())

  tenant     Tenant?  @relation(fields: [tenantId], references: [id])
  user       User?    @relation(fields: [userId], references: [id])

  @@index([tenantId, createdAt])
  @@index([userId, createdAt])
  @@index([action, createdAt])
  @@map("audit_logs")
}

enum AuditStatus {
  SUCCESS
  FAILURE
  WARNING
}
```

---

## Índices recomendados

Además de los definidos en el schema, ejecutar en `db/init.sql`:

```sql
-- Para búsquedas frecuentes de empleados por tenant
CREATE INDEX IF NOT EXISTS idx_employees_tenant_status ON employees(tenant_id, status);

-- Para expiración de tokens de reset
CREATE INDEX IF NOT EXISTS idx_password_resets_expires ON password_resets(expires_at) WHERE used_at IS NULL;

-- Para limpiar refresh tokens vencidos
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_expires ON refresh_tokens(expires_at) WHERE revoked_at IS NULL;
```

---

## Migraciones

Al modificar el schema:

```bash
# Dentro del contenedor backend o con la venv activa
npx prisma migrate dev --name descripcion_del_cambio

# Verificar el estado
npx prisma migrate status

# Generar el cliente actualizado
npx prisma generate
```

Nombrar las migraciones en formato `snake_case` descriptivo:
- `add_tenant_model`
- `add_password_reset_table`
- `add_audit_logs_indexes`

---

## Limpieza periódica (tareas programadas)

Implementar un cron job (o endpoint admin protegido) para:

```sql
-- Eliminar tokens de reset vencidos o ya usados (mayores a 24h)
DELETE FROM password_resets WHERE expires_at < NOW() - INTERVAL '24 hours';

-- Revocar refresh tokens vencidos
UPDATE refresh_tokens SET revoked_at = NOW() WHERE expires_at < NOW() AND revoked_at IS NULL;

-- Opcional: purgar audit_logs con más de 90 días (según política de retención)
-- DELETE FROM audit_logs WHERE created_at < NOW() - INTERVAL '90 days';
```
