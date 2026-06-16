# 05 — Frontend — React

## Stack

- **React 18** con Vite como bundler
- **Tailwind CSS** para estilos utilitarios
- **React Router DOM v6** para navegación
- **Recharts** para visualizaciones
- **Axios** para peticiones HTTP

---

## Estructura de rutas

```
/login          →  Login.jsx        (pública)
/               →  redirect → /dashboard
/dashboard      →  Dashboard.jsx    (protegida)
/employees      →  Employees.jsx    (protegida)
/*              →  redirect → /dashboard
```

Las rutas protegidas están envueltas en `PrivateRoute`, que verifica si el usuario está autenticado antes de renderizar el contenido. Si no lo está, redirige a `/login`.

---

## Diagrama de componentes

```
App.jsx
├── BrowserRouter
│   └── AuthProvider (contexto global de auth)
│       ├── Route /login → Login.jsx
│       └── PrivateRoute (verifica JWT)
│           ├── Route /dashboard → Dashboard.jsx
│           │   ├── Sidebar.jsx
│           │   ├── Navbar.jsx
│           │   ├── KpiCard (x4)
│           │   └── Recharts (PieChart + BarChart)
│           └── Route /employees → Employees.jsx
│               ├── Sidebar.jsx
│               ├── Navbar.jsx
│               └── Tabla con RiskBadge
```

---

## Páginas

### Login.jsx
- Formulario con email y contraseña
- Llama a `useAuth().login()` que hace POST a `/api/auth/login`
- Guarda el token en `localStorage`
- Redirige al dashboard en caso de éxito
- Muestra las credenciales de prueba para facilitar el desarrollo

### Dashboard.jsx
- Consume `GET /api/employees` al montar
- Calcula los KPIs en el cliente:
  - **Total Empleados** → count total
  - **Riesgo Alto** → empleados con `flightRisk >= 0.7`
  - **Riesgo Medio** → empleados con `0.4 <= flightRisk < 0.7`
  - **Desempeño Promedio** → promedio de `performanceScore`
- Renderiza dos gráficos con Recharts:
  - **PieChart** → distribución de riesgo (bajo / medio / alto)
  - **BarChart** → riesgo promedio por departamento

### Employees.jsx
- Consume `GET /api/employees` al montar
- Tabla con columnas: Nombre, Departamento, Cargo, Antigüedad, Desempeño, Riesgo de Fuga
- `RiskBadge` colorea el riesgo: 🟢 Bajo / 🟡 Medio / 🔴 Alto

---

## Contexto de Autenticación (AuthContext.jsx)

Es el estado global de autenticación. Provee:

```javascript
{
  user,            // Objeto con id, name, email, role
  isAuthenticated, // Boolean
  loading,         // Boolean - true mientras verifica el token al inicio
  login(email, password),  // Async - llama a /api/auth/login
  logout()         // Limpia localStorage y redirige
}
```

**Flujo al cargar la app:**
1. Lee el token de `localStorage`
2. Si existe, hace `GET /api/auth/me` para validarlo
3. Si es válido, setea el usuario en el estado
4. Si falla (token expirado), lo elimina del storage
5. Mientras verifica, muestra un spinner

---

## Cliente HTTP (services/api.js)

Instancia de Axios preconfigurada:

```javascript
baseURL: import.meta.env.VITE_API_URL || '/api'
timeout: 10000ms
Content-Type: application/json
```

**Interceptor de respuesta:** si el servidor devuelve un `401 Unauthorized`, elimina el token del localStorage y redirige automáticamente a `/login`. Esto maneja la expiración del JWT de forma transparente.

---

## Proxy de Vite (vite.config.js)

En desarrollo, Vite redirige las peticiones `/api/*` al backend:

```
Petición del browser: GET /api/employees
Vite proxy redirige:  GET http://backend:4000/api/employees
```

Esto evita problemas de CORS en desarrollo y simula el comportamiento de un servidor de producción con reverse proxy.

---

## Layout de la app autenticada

```
┌──────────────────────────────────────────────────────────┐
│  SIDEBAR (w-64, fijo a la izquierda)                     │
│  ┌────────────────────────────────────────────────────┐  │
│  │  📈 Sistema BI          │  NAVBAR (h-16, top)      │  │
│  │  Retención de Talento   │  [Título página]  [User] │  │
│  │─────────────────────    │  [Cerrar sesión]         │  │
│  │  📊 Dashboard           │──────────────────────────│  │
│  │  👥 Empleados           │                          │  │
│  │                         │  CONTENIDO PRINCIPAL     │  │
│  │─────────────────────    │  (scroll independiente)  │  │
│  │  [Nombre usuario]       │                          │  │
│  │  [Rol]                  │                          │  │
│  │  🚪 Cerrar sesión       │                          │  │
│  └─────────────────────────┘                          │  │
└──────────────────────────────────────────────────────────┘
```
