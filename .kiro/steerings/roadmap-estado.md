---
inclusion: always
---

# Roadmap y Estado del Proyecto

Tesis: **Diseno e Implementacion de un Sistema de Inteligencia de Negocios basado en Machine Learning para la Prediccion de la Fuga de Talento y la Optimizacion de Estrategias de Retencion en Empresas de Desarrollo de Software de Asuncion, 2026.**

Stack: React + Vite + Tailwind / Node.js + Express + Prisma / PostgreSQL / FastAPI (ML) / Docker

---

## Estado actual del sistema (27 julio 2026)

### Base de datos — CONECTADA (sin mocks)

Todo el sistema usa PostgreSQL via Prisma. Ya no hay arrays mockeados en memoria.

- **Prisma schema**: Company, User, Employee, PlanConfig, AuditLog, PasswordResetToken
- **Migraciones**: `20260727221553_init` + `20260727223200_add_company_status`
- **Singleton**: `backend/src/lib/prisma.js`
- **Seed**: `backend/prisma/seed.js` (super admin, empresa demo, usuarios, empleados, planes)

### Multi-tenant SaaS

El sistema funciona como SaaS multi-tenant:
- Cada empresa (Company) tiene sus propios usuarios y empleados aislados por `companyId`
- Enum `CompanyStatus`: PENDING_PAYMENT, TRIAL, ACTIVE, SUSPENDED
- Registro publico en `/register` → empresa queda en PENDING_PAYMENT
- Middleware `requireActiveCompany` bloquea acceso a datos si la empresa no esta ACTIVE o TRIAL
- SUPER_ADMIN ve todo, los demas solo ven su empresa

### Modulos completados

| Modulo | Estado |
|--------|--------|
| Infraestructura Docker | docker-compose: backend, frontend, postgres, ml-service, mailhog |
| Landing page publica | `/` con hero, planes, footer |
| Registro de empresas | `/register` wizard 3 pasos → crea Company + COMPANY_ADMIN |
| Pantalla activacion pendiente | PendingActivation.jsx cuando companyStatus != ACTIVE |
| Login empresas | `/login` con bcrypt real, bloqueo por intentos (5 = 15min lock) |
| Login SUPER_ADMIN | `/admin/login` |
| Roles y permisos | SUPER_ADMIN, COMPANY_ADMIN, ANALYST, VIEWER |
| Auth middleware | Busca usuario en BD, verifica active, JWT 8h |
| Reset password | Token SHA-256, TTL 5min, persistido en tabla password_reset_tokens |
| Change password | Desde perfil autenticado, con bcrypt hash real |
| Panel SUPER_ADMIN | dashboard, companies (con conteos reales), plans, audit-logs |
| CRUD empleados | create, update, delete, import CSV batch, stats con aggregations |
| Filtros empleados | department, risk_level, search, attrition, paginacion |
| Gestion de usuarios | GET/POST/PUT/PATCH /api/users (crear, toggle active, update role) |
| Auditoria | Toda accion se registra en tabla audit_logs via Prisma |
| Planes desde BD | tabla plan_configs con CRUD desde panel admin |
| Servicio ML (FastAPI) | Prediccion de fuga con Random Forest |
| Dashboard empresa | KPIs reales desde /api/employees/stats (aggregations Prisma) |
| Importacion CSV | Validacion + createMany batch + auditoria |
| Correos transaccionales | Nodemailer + Mailhog (reset, password-changed, account-locked) |
| Validacion Zod | Schemas para login, register, forgot-password, reset-password |
| Politica de contrasena | NIST/OWASP con PasswordStrengthIndicator en frontend |

---

## Pendiente (proximos pasos)

### Bloque — Pasarela de pago (Mercado Pago)
- Integrar Mercado Pago (opera en Paraguay, sandbox gratis, suscripciones via API)
- Cuando empresa se registra → generar link/suscripcion de Mercado Pago
- Webhook recibe confirmacion de pago → cambiar companyStatus a ACTIVE
- Cobro recurrente mensual automatico
- Boton en panel admin para activar/desactivar empresas manualmente

### Bloque — Funcionalidades adicionales
- Exportacion de empleados a CSV desde el listado
- Grafico de tendencia historica de riesgo en dashboard
- Perfil de usuario con edicion de datos personales
- Notificaciones in-app para COMPANY_ADMIN

### Bloque — ML avanzado
- Reentrenamiento del modelo desde el panel admin
- Prediccion en batch para todos los empleados de una empresa (actualizar flight_risk)
- Variables adicionales: contextSwitchingScore, timeUnderSameManager

---

## Arquitectura de portales

```
/                    → Landing (publico)
/register            → Registro de empresa (publico, wizard 3 pasos)
/login               → Portal empresa (COMPANY_ADMIN / ANALYST / VIEWER)
/admin/login         → Portal admin (SUPER_ADMIN)
/forgot-password     → Recuperar contrasena (publico)
/reset-password      → Resetear contrasena (publico, token requerido)
/terms               → Terminos y condiciones (publico)
/legal               → Aviso legal (publico)
/dashboard           → Dashboard empresa (protegido, empresa activa)
/employees           → Listado empleados (protegido, empresa activa)
/employees/:id       → Detalle empleado (protegido, empresa activa)
/users               → Gestion usuarios empresa (protegido, empresa activa)
/model               → Modelo ML (protegido, empresa activa)
/admin/dashboard     → Dashboard admin (protegido, SUPER_ADMIN)
/admin/companies     → Empresas cliente (protegido, SUPER_ADMIN)
/admin/plans         → Planes y precios (protegido, SUPER_ADMIN)
/admin/audit         → Auditoria del sistema (protegido, SUPER_ADMIN)
```

---

## Credenciales de desarrollo (BD real, datos del seed)

| Portal | Email | Contrasena | Rol |
|--------|-------|------------|-----|
| `/admin/login` | *(email del dev en seed)* | Admin2025! | SUPER_ADMIN |
| `/login` | admin@empresa.com | Demo2025! | COMPANY_ADMIN |
| `/login` | analista@empresa.com | Demo2025! | ANALYST |
| `/login` | viewer@empresa.com | Demo2025! | VIEWER |

---

## Notas tecnicas

- **Docker**: `docker compose up --build` levanta todo. Backend usa `node:20-alpine` con openssl.
- **Prisma en Docker**: El CMD del backend ejecuta `prisma generate` + `prisma migrate deploy` antes de iniciar el server.
- **Mailhog**: Correos en desarrollo se ven en `http://localhost:8025`.
- **Volumen hot-reload**: `./backend/src` se monta como volumen, nodemon reinicia automaticamente.
- **CompanyStatus**: Empresas nuevas quedan en PENDING_PAYMENT. Solo ACTIVE y TRIAL acceden a datos.
- **Aislamiento por tenant**: Todos los queries de empleados/usuarios filtran por `companyId` segun el rol del usuario.
- **Audit logs**: Cada accion importante (login, CRUD, import, cambio de contrasena) queda registrada en `audit_logs`.
- **Pasarela de pago**: Proxima integracion recomendada es Mercado Pago (opera en Paraguay, tiene sandbox, suscripciones y webhooks).

---

## Comandos utiles

```bash
# Levantar todo
docker compose up --build -d

# Ver logs del backend
docker compose logs backend -f

# Resetear BD y re-seedear (desde host, no dentro del contenedor)
cd backend
DATABASE_URL="postgresql://tesis_user:tesis_pass@localhost:5432/tesis_bi_db" npx prisma migrate reset

# Abrir Prisma Studio (UI para ver la BD)
cd backend
DATABASE_URL="postgresql://tesis_user:tesis_pass@localhost:5432/tesis_bi_db" npx prisma studio

# Crear nueva migracion
cd backend
DATABASE_URL="postgresql://tesis_user:tesis_pass@localhost:5432/tesis_bi_db" npx prisma migrate dev --name nombre_migracion
```
