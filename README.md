# Sistema BI — Prediccion de Fuga de Talento

> Plataforma SaaS multi-tenant de inteligencia de negocios basada en machine learning para predecir y prevenir la rotacion de personal en empresas de desarrollo de software.

**Tesis:** Diseno e Implementacion de un Sistema de Inteligencia de Negocios basado en Machine Learning para la Prediccion de la Fuga de Talento y la Optimizacion de Estrategias de Retencion en Empresas de Desarrollo de Software de Asuncion, 2026.

---

## Stack Tecnologico

| Capa | Tecnologia |
|------|-----------|
| Frontend | React 18 + Vite + Tailwind CSS + Recharts |
| Backend | Node.js 20 + Express + Prisma ORM |
| Base de Datos | PostgreSQL 16 |
| ML Service | Python 3.11 + FastAPI + scikit-learn (Random Forest) |
| Infraestructura | Docker + Docker Compose |
| Email (dev) | Mailhog |
| Seguridad | JWT, bcrypt, reCAPTCHA v2, rate limiting, helmet |

---

## Estructura del Proyecto

```
tesis-all-in-one/
├── docker-compose.yml          # Orquestacion de todos los servicios
├── .env                        # Variables de entorno (no versionado)
├── backend/                    # API REST Node/Express + Prisma
│   ├── prisma/
│   │   ├── schema.prisma       # Modelos de datos
│   │   ├── migrations/         # Migraciones de BD
│   │   └── seed.js             # Datos iniciales
│   └── src/
│       ├── controllers/        # Logica de negocio
│       ├── middlewares/        # Auth, reCAPTCHA, company status, audit
│       ├── routes/             # Definicion de endpoints
│       ├── services/           # Audit, email, ML proxy
│       ├── lib/prisma.js       # Singleton PrismaClient
│       └── schemas/            # Validacion Zod
├── frontend/                   # React + Vite SPA
│   └── src/
│       ├── pages/              # Vistas (Landing, Login, Register, Dashboard, etc.)
│       ├── components/         # Componentes reutilizables
│       ├── context/            # AuthContext, AdminAuthContext
│       └── services/api.js     # Cliente HTTP (axios)
├── ml-service/                 # Microservicio Python ML
├── db/                         # Script SQL inicial
└── docs/                       # Documentacion detallada
```

---

## Modelo Multi-Tenant (SaaS)

El sistema funciona como SaaS donde cada empresa (Company) tiene sus datos aislados:

- **CompanyStatus**: `PENDING_PAYMENT` → `TRIAL` → `ACTIVE` → `SUSPENDED`
- Registro publico desde la landing → empresa queda en `PENDING_PAYMENT`
- Middleware `requireActiveCompany` bloquea acceso a datos si la empresa no esta activa
- Cada empresa tiene sus propios usuarios y empleados aislados por `companyId`
- SUPER_ADMIN tiene visibilidad global

### Roles del sistema

| Rol | Permisos |
|-----|----------|
| SUPER_ADMIN | Gestion global: empresas, planes, audit logs, ver todo |
| COMPANY_ADMIN | Admin de su empresa: CRUD usuarios, empleados, importacion |
| ANALYST | Analisis: ver empleados, predicciones, dashboard |
| VIEWER | Solo lectura |

---

## Levantar el Entorno

### Prerrequisitos

- Docker Desktop instalado y corriendo
- Node.js 20+ (opcional, para desarrollo local sin Docker)

### Con Docker (recomendado)

```bash
# 1. Clonar y entrar al proyecto
git clone <repo-url>
cd tesis-all-in-one

# 2. Configurar variables de entorno
cp backend/.env.example .env
# Editar .env con tus valores (RECAPTCHA keys, etc.)

# 3. Levantar todos los servicios
docker compose up --build -d

# 4. Acceder
#    Frontend:   http://localhost:5173
#    Backend:    http://localhost:4000
#    ML Service: http://localhost:8000
#    Mailhog:    http://localhost:8025
#    pgAdmin:    http://localhost:5050
```

El backend ejecuta automaticamente `prisma generate` + `prisma migrate deploy` al arrancar, y el seed se corre con:

```bash
cd backend
DATABASE_URL="postgresql://tesis_user:tesis_pass@localhost:5432/tesis_bi_db" npx prisma db seed
```

### Sin Docker (desarrollo local)

```bash
# Backend
cd backend
npm install
# Crear .env con DATABASE_URL apuntando a tu PostgreSQL local
npx prisma generate
npx prisma migrate dev
npx prisma db seed
npm run dev

# Frontend (en otra terminal)
cd frontend
npm install
npm run dev

# ML Service (en otra terminal)
cd ml-service
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

---

## Credenciales de Desarrollo (seed)

| Portal | Email | Contrasena | Rol |
|--------|-------|------------|-----|
| `/admin/login` | *(configurado en seed)* | Admin2025! | SUPER_ADMIN |
| `/login` | admin@empresa.com | Demo2025! | COMPANY_ADMIN |
| `/login` | analista@empresa.com | Demo2025! | ANALYST |
| `/login` | viewer@empresa.com | Demo2025! | VIEWER |

---

## Endpoints Principales de la API

### Autenticacion (publicos)

| Metodo | Ruta | Descripcion |
|--------|------|-------------|
| POST | `/api/auth/login` | Login portal empresas |
| POST | `/api/auth/register` | Registro de nueva empresa + admin |
| POST | `/api/auth/forgot-password` | Solicitar reset de contrasena |
| POST | `/api/auth/reset-password` | Resetear contrasena con token |
| GET | `/api/plans` | Planes disponibles (landing) |

### Portal Empresas (requiere JWT + empresa activa)

| Metodo | Ruta | Descripcion |
|--------|------|-------------|
| GET | `/api/auth/me` | Usuario actual |
| POST | `/api/auth/change-password` | Cambiar contrasena |
| GET | `/api/employees` | Listar empleados (paginado, filtros) |
| GET | `/api/employees/stats` | Estadisticas y KPIs |
| GET | `/api/employees/:id` | Detalle de empleado |
| POST | `/api/employees` | Crear empleado |
| PUT | `/api/employees/:id` | Actualizar empleado |
| DELETE | `/api/employees/:id` | Eliminar empleado |
| POST | `/api/employees/import` | Importacion CSV masiva |
| GET | `/api/users` | Listar usuarios de la empresa |
| POST | `/api/users` | Crear usuario |
| PUT | `/api/users/:id` | Actualizar usuario |
| PATCH | `/api/users/:id/toggle-active` | Activar/desactivar usuario |
| POST | `/api/predict` | Prediccion individual ML |
| POST | `/api/predict/batch` | Prediccion batch ML |
| GET | `/api/model/status` | Estado del modelo ML |

### Portal Super Admin (requiere JWT SUPER_ADMIN)

| Metodo | Ruta | Descripcion |
|--------|------|-------------|
| POST | `/api/admin/auth/login` | Login super admin |
| GET | `/api/admin/stats` | Estadisticas globales |
| GET | `/api/admin/companies` | Listar empresas |
| GET | `/api/admin/companies/:id` | Detalle empresa + usuarios |
| GET | `/api/admin/plans` | Planes configurados |
| PUT | `/api/admin/plans` | Actualizar planes |
| GET | `/api/admin/audit-logs` | Logs de auditoria |

---

## Base de Datos

### Modelos principales (Prisma)

- **Company** — Empresas cliente (tenant), con plan y status
- **User** — Usuarios del sistema con roles, bcrypt hash, bloqueo por intentos
- **Employee** — Empleados (sujetos del analisis BI), datos IBM HR + flight_risk
- **PlanConfig** — Configuracion de planes de suscripcion
- **AuditLog** — Registro de toda accion relevante del sistema
- **PasswordResetToken** — Tokens de recuperacion de contrasena

### Comandos utiles

```bash
cd backend

# Nueva migracion
DATABASE_URL="postgresql://tesis_user:tesis_pass@localhost:5432/tesis_bi_db" npx prisma migrate dev --name nombre

# Reset completo (borra y re-seedea)
DATABASE_URL="postgresql://tesis_user:tesis_pass@localhost:5432/tesis_bi_db" npx prisma migrate reset

# GUI para explorar la BD
DATABASE_URL="postgresql://tesis_user:tesis_pass@localhost:5432/tesis_bi_db" npx prisma studio
```

---

## Seguridad

- **Autenticacion**: JWT con expiracion de 8 horas
- **Contrasenas**: bcrypt con salt 12, politica NIST/OWASP
- **Bloqueo de cuenta**: 5 intentos fallidos = 15 minutos de bloqueo
- **reCAPTCHA v2**: En login, registro y forgot-password
- **Rate limiting**: express-rate-limit en endpoints sensibles
- **Headers seguros**: helmet (HSTS, CSP, etc.)
- **Aislamiento de datos**: Filtro por companyId en todos los queries
- **Auditoria**: Toda accion queda registrada en audit_logs

---

## Variables de Entorno

Ver `backend/.env.example` para la lista completa. Las principales:

| Variable | Descripcion |
|----------|-------------|
| `DATABASE_URL` | Connection string PostgreSQL |
| `JWT_SECRET` | Secret para firmar tokens JWT |
| `RECAPTCHA_SITE_KEY` | Site key de Google reCAPTCHA |
| `RECAPTCHA_SECRET_KEY` | Secret key de Google reCAPTCHA |
| `SMTP_HOST` | Host del servidor SMTP (mailhog en dev) |
| `FRONTEND_URL` | URL del frontend (para links en correos) |

---

## Licencia

Proyecto academico — Universidad Nacional de Asuncion, 2026.
