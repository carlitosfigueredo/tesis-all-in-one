# Registro de cambios

## 2026-07-27

### frontend/src/pages/TermsAndConditions.jsx
- Se agrego la seccion 10 "Marco normativo" con las referencias a las leyes paraguayas que rigen el sistema:
  - Constitucion Nacional del Paraguay (1992) - Arts. 33 y 36
  - Ley N. 7593/2025 de Proteccion de Datos Personales - Arts. 5, 12 y 15
  - Ley N. 4439/2011 de Delitos Informaticos - Arts. 174 bis, 174 ter y 175
  - Ley N. 1328/1998 de Derechos de Autor y Derechos Conexos - Arts. 2, 7 y 67
- Se renumeraron las secciones 10 y 11 a 11 y 12 respectivamente.

### frontend/src/pages/Legal.jsx
- Se actualizo la referencia de la Ley N. 6534/2020 a la Ley N. 7593/2025 de Proteccion de Datos Personales (ley vigente).

### Eliminacion de datos mock — Conexion real a PostgreSQL via Prisma

**Archivos nuevos:**
- `backend/src/lib/prisma.js` — Singleton de PrismaClient (reutiliza instancia en desarrollo)
- `backend/prisma/seed.js` — Seed con super admin, empresa demo, usuarios de prueba, planes y empleados
- `backend/prisma/migrations/20260727221553_init/` — Migracion inicial con todas las tablas
- `backend/src/controllers/users.controller.js` — Controller CRUD de usuarios de empresa
- `backend/src/routes/users.routes.js` — Rutas GET/POST/PUT/PATCH para /api/users

**Archivos modificados:**
- `backend/prisma/schema.prisma` — Agregados modelos AuditLog, PlanConfig, PasswordResetToken. Campos failedAttempts y lockedUntil en User.
- `backend/package.json` — Agregada configuracion prisma.seed
- `backend/src/controllers/auth.controller.js` — Reescrito: login con bcrypt real, bloqueo por intentos fallidos, reset password persistido en BD
- `backend/src/middlewares/auth.middleware.js` — Reescrito: busca usuario en BD por JWT, verifica user.active
- `backend/src/controllers/admin.controller.js` — Reescrito: companies, planes y stats desde BD con Prisma queries
- `backend/src/controllers/employees.controller.js` — Reescrito: CRUD completo (create, update, delete, import) con Prisma, stats con aggregations
- `backend/src/services/audit.service.js` — Conectado a BD real (tabla audit_logs), ya no usa array en memoria
- `backend/src/routes/index.js` — Registrada nueva ruta /api/users
- `frontend/src/pages/Users.jsx` — Eliminado MOCK_USERS, ahora usa api.get/post/patch reales

**Motivo:** El sistema usaba datos hardcodeados en arrays para desarrollo. Se migro toda la capa de datos a PostgreSQL con Prisma ORM para preparar el sistema para uso real.
