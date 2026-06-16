# 04 — Backend — API REST

## Resumen

API REST construida con **Node.js 20 + Express**. Corre en el puerto **4000**. Todos los endpoints bajo `/api/*` requieren autenticación JWT excepto `/api/auth/login` y el health check.

---

## Middlewares globales (app.js)

```
Request entrante
      │
      ▼
┌─────────────┐
│   helmet()  │  Añade headers de seguridad HTTP (X-Frame-Options, etc.)
└──────┬──────┘
       ▼
┌─────────────┐
│    cors()   │  Permite peticiones desde localhost:5173 / frontend:5173
└──────┬──────┘
       ▼
┌──────────────────┐
│  express.json()  │  Parsea body JSON (límite 10MB)
└──────┬───────────┘
       ▼
┌─────────────┐
│  morgan()   │  Logger HTTP (formato 'dev' en desarrollo)
└──────┬──────┘
       ▼
┌─────────────┐
│   Router    │  Rutas de la aplicación
└──────┬──────┘
       ▼
┌──────────────────┐
│  errorHandler()  │  Captura cualquier error pasado con next(error)
└──────────────────┘
```

---

## Tabla de Endpoints

### Autenticación

| Método | Ruta | Auth | Descripción |
|--------|------|------|-------------|
| `POST` | `/api/auth/login` | ❌ | Autentica y devuelve JWT |
| `GET` | `/api/auth/me` | ✅ JWT | Devuelve el usuario autenticado |

### Empleados

| Método | Ruta | Auth | Descripción |
|--------|------|------|-------------|
| `GET` | `/api/employees` | ✅ JWT | Lista todos los empleados |
| `GET` | `/api/employees/:id` | ✅ JWT | Obtiene un empleado por ID |
| `POST` | `/api/employees` | ✅ JWT | Crea un nuevo empleado |
| `PUT` | `/api/employees/:id` | ✅ JWT | Actualiza un empleado |
| `DELETE` | `/api/employees/:id` | ✅ JWT | Elimina un empleado |

### Predicción ML

| Método | Ruta | Auth | Descripción |
|--------|------|------|-------------|
| `POST` | `/api/predict` | ✅ JWT | Predice el riesgo de fuga de un empleado |
| `POST` | `/api/predict/batch` | ✅ JWT | Predice el riesgo de una lista de empleados |

### Utilidad

| Método | Ruta | Auth | Descripción |
|--------|------|------|-------------|
| `GET` | `/` | ❌ | Health check raíz |
| `GET` | `/api/health` | ❌ | Health check de la API |

---

## Autenticación JWT

### Flujo de login

```
Cliente                    Backend                    
  │                           │                       
  │  POST /api/auth/login      │                       
  │  { email, password }  ──► │                       
  │                           │  1. Busca usuario en MOCK_USERS
  │                           │  2. bcrypt.compare(password, hash)
  │                           │  3. jwt.sign({ id }, JWT_SECRET, { expiresIn: '8h' })
  │                           │                       
  │  { token, user }      ◄── │                       
  │                           │                       
  │  localStorage.setItem('token', token)             
  │                           │                       
  │  GET /api/employees        │                       
  │  Authorization: Bearer <token>  ──►              
  │                           │  1. Extrae token del header
  │                           │  2. jwt.verify(token, JWT_SECRET)
  │                           │  3. Adjunta user a req.user
  │                           │  4. next() → controlador
  │  { data: [...] }      ◄── │                       
```

### Estructura del JWT payload

```json
{
  "id": "1",
  "iat": 1718400000,
  "exp": 1718428800
}
```

El token expira en **8 horas**. Si expira, el interceptor de Axios en el frontend redirige automáticamente al login.

---

## Formato de respuestas

Todas las respuestas siguen la misma estructura:

```json
// Éxito
{
  "success": true,
  "data": { ... }
}

// Éxito con lista
{
  "success": true,
  "data": [ ... ],
  "total": 3
}

// Error
{
  "success": false,
  "message": "Descripción del error"
}
```

---

## Modelo de datos del Empleado (mock actual)

```json
{
  "id": "1",
  "name": "Carlos Rodríguez",
  "department": "Ventas",
  "position": "Vendedor Senior",
  "salary": 3500000,
  "yearsInCompany": 3,
  "performanceScore": 4.2,
  "flightRisk": 0.72,
  "status": "ACTIVE"
}
```

> **Nota:** `flightRisk` es calculado por el modelo ML. Actualmente viene hardcodeado en el mock. Cuando se integre Prisma, será calculado y almacenado en la DB.

---

## Usuarios disponibles en desarrollo

| Email | Password | Rol |
|-------|----------|-----|
| admin@tesis.com | password | ADMIN |
| analista@tesis.com | password | ANALYST |
