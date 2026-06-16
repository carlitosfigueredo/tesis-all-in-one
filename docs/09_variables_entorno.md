# 09 — Variables de Entorno

## Archivo `.env` (raíz del proyecto)

El archivo `.env` está ignorado por git (`.gitignore`) para evitar subir credenciales al repositorio. Se crea manualmente en cada entorno.

---

## Referencia completa

### PostgreSQL

| Variable | Valor por defecto | Descripción |
|----------|-------------------|-------------|
| `POSTGRES_USER` | `tesis_user` | Usuario de la base de datos |
| `POSTGRES_PASSWORD` | `tesis_pass` | Contraseña del usuario |
| `POSTGRES_DB` | `tesis_bi_db` | Nombre de la base de datos |
| `POSTGRES_PORT` | `5432` | Puerto expuesto en el host |

### Backend

| Variable | Valor por defecto | Descripción |
|----------|-------------------|-------------|
| `BACKEND_PORT` | `4000` | Puerto del servidor Express |
| `NODE_ENV` | `development` | Entorno (`development` / `production`) |
| `JWT_SECRET` | `super_secret_...` | Clave para firmar tokens JWT — **cambiar en producción** |
| `DATABASE_URL` | `postgresql://tesis_user:tesis_pass@postgres:5432/tesis_bi_db` | URL de conexión a PostgreSQL (usada por Prisma) |

### Frontend

| Variable | Valor por defecto | Descripción |
|----------|-------------------|-------------|
| `FRONTEND_PORT` | `5173` | Puerto del servidor Vite |
| `VITE_API_URL` | `http://localhost:4000/api` | URL base de la API (accesible desde el browser) |

### ML Service

| Variable | Valor por defecto | Descripción |
|----------|-------------------|-------------|
| `ML_SERVICE_PORT` | `8000` | Puerto del servidor FastAPI |
| `ML_SERVICE_URL` | `http://ml-service:8000` | URL interna (usada por el backend Node para llamar al ML service dentro de Docker) |

---

## Notas importantes

**`DATABASE_URL` tiene dos valores según el contexto:**

```bash
# Dentro de Docker (host = nombre del servicio)
DATABASE_URL=postgresql://tesis_user:tesis_pass@postgres:5432/tesis_bi_db

# Fuera de Docker / desarrollo local (host = localhost)
DATABASE_URL=postgresql://tesis_user:tesis_pass@localhost:5432/tesis_bi_db
```

**`VITE_API_URL` también varía:**

```bash
# Con Docker (el browser accede a localhost, Vite proxy redirige al backend)
VITE_API_URL=http://localhost:4000/api

# En producción (dominio real)
VITE_API_URL=https://api.tudominio.com/api
```

**`JWT_SECRET` en producción debe ser:**
- Al menos 32 caracteres aleatorios
- Generado con: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`
- Nunca versionado en el repositorio
