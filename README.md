# Sistema BI — Predicción de Fuga de Talento
> Sector Tecnologia · Zona Metropolitana de Asunción

## Stack Tecnológico

| Capa | Tecnología |
|------|-----------|
| Frontend | React 18 + Vite + Tailwind CSS + Recharts |
| Backend | Node.js 20 + Express |
| Base de Datos | PostgreSQL 16 |
| ORM | Prisma |
| Infraestructura | Docker + Docker Compose |

## Estructura del Proyecto

```
tesis-all-in-one/
├── docker-compose.yml
├── .env
├── backend/          # API REST Node/Express
├── frontend/         # React + Vite
└── db/               # Scripts SQL iniciales
```

## Credenciales de Prueba (desarrollo)

| Usuario | Email | Password | Rol |
|---------|-------|----------|-----|
| Admin BI | admin@tesis.com | password | ADMIN |
| Analista HR | analista@tesis.com | password | ANALYST |

## Levantamiento del Entorno

### Prerrequisitos
- Docker Desktop instalado y corriendo
- Node.js 20+ (para desarrollo local sin Docker)

### Con Docker (recomendado)

```bash
# 1. Clonar y entrar al proyecto
cd tesis-all-in-one

# 2. Levantar todos los servicios
docker compose up --build

# 3. Acceder
#    Frontend:  http://localhost:5173
#    Backend:   http://localhost:4000
#    API Health: http://localhost:4000/api/health
```

### Sin Docker (desarrollo local)

```bash
# Backend
cd backend
npm install
# Crear .env desde .env.example y configurar DATABASE_URL
npm run dev

# Frontend (en otra terminal)
cd frontend
npm install
npm run dev
```

### Migraciones de Base de Datos

```bash
# Dentro del contenedor backend
docker compose exec backend npx prisma migrate dev --name init

# O localmente
cd backend
npx prisma migrate dev --name init
npx prisma studio   # GUI de la base de datos
```

## Endpoints de la API

| Método | Ruta | Descripción | Auth |
|--------|------|-------------|------|
| GET | `/` | Health check general | No |
| GET | `/api/health` | Health check API | No |
| POST | `/api/auth/login` | Login | No |
| GET | `/api/auth/me` | Usuario actual | JWT |
| GET | `/api/employees` | Listado empleados | JWT |
| GET | `/api/employees/:id` | Empleado por ID | JWT |
| POST | `/api/employees` | Crear empleado | JWT |
| PUT | `/api/employees/:id` | Actualizar empleado | JWT |
| DELETE | `/api/employees/:id` | Eliminar empleado | JWT |
