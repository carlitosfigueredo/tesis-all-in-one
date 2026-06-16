# 02 — Arquitectura del Sistema

## Diagrama de Arquitectura General

```
                         ┌─────────────────────────────────────────┐
                         │            DOCKER NETWORK                │
                         │            tesis_network                 │
                         │                                          │
  Browser del usuario    │  ┌──────────────────────────────────┐   │
  ──────────────────►    │  │  FRONTEND                        │   │
  :5173                  │  │  React 18 + Vite + Tailwind       │   │
                         │  │  Recharts                        │   │
                         │  │  Container: tesis_frontend        │   │
                         │  └──────────────┬───────────────────┘   │
                         │                 │ /api/* (proxy Vite)   │
                         │  ┌──────────────▼───────────────────┐   │
                         │  │  BACKEND                         │   │
                         │  │  Node.js 20 + Express            │   │
                         │  │  Helmet · CORS · Morgan           │   │
                         │  │  JWT Authentication              │   │
                         │  │  Container: tesis_backend         │   │
                         │  └────────┬────────────┬────────────┘   │
                         │           │            │                 │
                         │  ┌────────▼────┐  ┌───▼─────────────┐  │
                         │  │  ML SERVICE │  │  POSTGRESQL 16  │  │
                         │  │  Python 3.11│  │  Prisma ORM     │  │
                         │  │  FastAPI    │  │  tesis_postgres  │  │
                         │  │  scikit-    │  │  :5432          │  │
                         │  │  learn      │  └─────────────────┘  │
                         │  │  tesis_ml   │                        │
                         │  │  :8000      │                        │
                         │  └─────────────┘                        │
                         └─────────────────────────────────────────┘
```

---

## Patrón de Arquitectura: Microservicios con Proxy

El backend Node.js actúa como **único punto de entrada** para el frontend. El frontend nunca se comunica directamente con el ML Service ni con la base de datos. Esto garantiza:

- **Seguridad**: el JWT se valida siempre en el backend antes de cualquier operación
- **Desacoplamiento**: el ML Service puede ser reemplazado (o su lenguaje/modelo cambiado) sin tocar el frontend
- **Trazabilidad**: todo el tráfico pasa por el backend y puede ser logueado

```
Frontend → Backend → ML Service   (para predicciones)
Frontend → Backend → PostgreSQL   (para datos CRUD)
```

---

## Estructura de carpetas del Monorepo

```
tesis-all-in-one/
│
├── backend/                    # API REST Node.js + Express
│   ├── src/
│   │   ├── index.js            # Entry point del servidor
│   │   ├── app.js              # Configuración Express y middlewares
│   │   ├── routes/
│   │   │   ├── index.js        # Router raíz — monta todos los módulos
│   │   │   ├── auth.routes.js
│   │   │   ├── employees.routes.js
│   │   │   └── predict.routes.js
│   │   ├── controllers/
│   │   │   ├── auth.controller.js
│   │   │   └── employees.controller.js
│   │   ├── middlewares/
│   │   │   ├── auth.middleware.js    # Validación JWT
│   │   │   └── errorHandler.js      # Manejo centralizado de errores
│   │   └── services/
│   │       └── ml.service.js         # Cliente HTTP al ML Service
│   ├── prisma/
│   │   └── schema.prisma             # Definición del esquema de BD
│   ├── Dockerfile
│   └── package.json
│
├── frontend/                   # SPA React + Vite
│   ├── src/
│   │   ├── App.jsx             # Configuración de rutas
│   │   ├── main.jsx            # Entry point React
│   │   ├── pages/
│   │   │   ├── Login.jsx
│   │   │   ├── Dashboard.jsx
│   │   │   └── Employees.jsx
│   │   ├── components/
│   │   │   └── layout/
│   │   │       ├── Sidebar.jsx
│   │   │       └── Navbar.jsx
│   │   ├── context/
│   │   │   └── AuthContext.jsx  # Estado global de autenticación
│   │   ├── routes/
│   │   │   └── PrivateRoute.jsx # Guarda de rutas autenticadas
│   │   └── services/
│   │       └── api.js           # Cliente Axios configurado
│   ├── Dockerfile
│   └── package.json
│
├── ml-service/                 # Microservicio Python ML
│   ├── main.py                 # App FastAPI
│   ├── schemas.py              # Modelos Pydantic (request/response)
│   ├── routers/
│   │   └── predict.py          # Endpoints /predict y /predict/batch
│   ├── model/
│   │   ├── dummy_model.py      # Modelo heurístico para desarrollo
│   │   └── model.pkl           # (generado) Modelo real entrenado
│   ├── notebooks/
│   │   ├── 01_eda_and_training.ipynb  # EDA + entrenamiento
│   │   └── data/               # Dataset IBM HR (no versionado)
│   ├── Dockerfile
│   └── requirements.txt
│
├── db/
│   └── init.sql                # Script inicial de PostgreSQL
│
├── docker-compose.yml          # Orquestación de todos los servicios
├── .env                        # Variables de entorno (no versionado)
└── docs/                       # Esta documentación
```

---

## Decisiones de diseño

### ¿Por qué Node.js para el backend y Python para ML?

Cada tecnología hace lo que mejor sabe. Node.js es excelente para APIs REST concurrentes con I/O ligero. Python tiene el ecosistema de ML más maduro (scikit-learn, pandas, numpy). Separarlos en microservicios permite escalarlos, actualizarlos y desplegarlos de forma independiente.

### ¿Por qué Prisma como ORM?

Prisma genera tipos TypeScript a partir del schema, brinda migraciones declarativas y tiene una DX muy limpia. Para una tesis es ideal porque el schema sirve como documentación viva del modelo de datos.

### ¿Por qué Vite en lugar de Create React App?

Vite es significativamente más rápido en desarrollo (HMR casi instantáneo) y genera builds más optimizados. CRA está en modo mantenimiento.
