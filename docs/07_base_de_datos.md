# 07 — Base de Datos

## Motor y ORM

- **PostgreSQL 16** (imagen Docker `postgres:16-alpine`)
- **Prisma** como ORM — genera un cliente con tipos a partir del schema declarativo

---

## Diagrama Entidad-Relación

```
┌──────────────────────────────────────┐
│  users                               │
├──────────────────────────────────────┤
│  id            String  PK  UUID      │
│  name          String                │
│  email         String  UNIQUE        │
│  password      String  (bcrypt hash) │
│  role          Role    DEFAULT ANALYST│
│  createdAt     DateTime              │
│  updatedAt     DateTime              │
└──────────────────────────────────────┘

┌──────────────────────────────────────┐
│  employees                           │
├──────────────────────────────────────┤
│  id               String  PK  UUID   │
│  name             String             │
│  department       String             │
│  position         String             │
│  salary           Float              │
│  yearsInCompany   Int                │
│  performanceScore Float  DEFAULT 0   │
│  flightRisk       Float  DEFAULT 0   │◄── Score 0-1 del modelo ML
│  status           EmployeeStatus     │
│  hireDate         DateTime           │
│  createdAt        DateTime           │
│  updatedAt        DateTime           │
└──────────────────────────────────────┘
```

> Nota: Actualmente ambas tablas no tienen relación entre sí. En una versión futura, los `users` podrían gestionar los `employees` con una FK `managedBy`.

---

## Enums

```prisma
enum Role {
  ADMIN    // Administrador del sistema — acceso completo
  ANALYST  // Analista de RRHH — acceso a datos y predicciones
  VIEWER   // Solo lectura — para ejecutivos (futuro)
}

enum EmployeeStatus {
  ACTIVE    // Empleado activo
  INACTIVE  // Empleado inactivo (baja temporal)
  RESIGNED  // Empleado que renunció
}
```

---

## Campo flightRisk

Es el campo más importante del sistema. Almacena la **probabilidad de fuga** calculada por el modelo ML para cada empleado, como un número entre 0.0 y 1.0.

```
0.0 ──── 0.4 ──── 0.7 ──── 1.0
  BAJO        MEDIO       ALTO
```

El proceso de actualización previsto es:
1. El área de RRHH carga o actualiza los datos de un empleado
2. El backend llama a `POST /api/predict` con las features del empleado
3. El ML Service devuelve el `flight_risk`
4. El backend almacena ese valor en `employee.flightRisk` via Prisma
5. El Dashboard lo lee y lo visualiza

---

## Comandos de Prisma

```bash
# Crear y aplicar una migración (refleja cambios del schema.prisma a la BD)
docker compose exec backend npx prisma migrate dev --name init

# Abrir Prisma Studio (GUI web para explorar y editar la BD)
docker compose exec backend npx prisma studio
# Acceder en: http://localhost:5555

# Generar el cliente Prisma (necesario después de cambiar el schema)
docker compose exec backend npx prisma generate

# Ver el estado de las migraciones
docker compose exec backend npx prisma migrate status
```

---

## Conexión a la base de datos

La `DATABASE_URL` sigue el formato de PostgreSQL con Prisma:

```
postgresql://USUARIO:PASSWORD@HOST:PUERTO/NOMBRE_DB
postgresql://tesis_user:tesis_pass@postgres:5432/tesis_bi_db
```

Dentro de Docker, el `HOST` es el nombre del servicio (`postgres`). Fuera de Docker (desarrollo local), es `localhost`.
