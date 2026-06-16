# 08 — Flujos Principales del Sistema

## Flujo 1 — Login de Usuario

```
Browser              Frontend             Backend (Node)        
  │                     │                      │                 
  │  Ingresa email       │                      │                 
  │  y contraseña   ──► │                      │                 
  │                     │  POST /api/auth/login │                 
  │                     │  { email, password } ──────────────►  │
  │                     │                      │                 
  │                     │                      │  1. Busca user en MOCK_USERS
  │                     │                      │  2. bcrypt.compare(pwd, hash)
  │                     │                      │  3. jwt.sign({ id }, secret, 8h)
  │                     │                      │                 
  │                     │  200 { token, user } ◄──────────────  │
  │                     │                      │                 
  │                     │  localStorage.setItem('token', ...)    
  │                     │  axios headers['Authorization'] = Bearer ...
  │                     │                      │                 
  │  Redirige a          │                      │                 
  │  /dashboard    ◄──  │                      │                 
```

---

## Flujo 2 — Acceso a ruta protegida (PrivateRoute)

```
Browser                   Frontend (React Router)         Backend
  │                              │                           │
  │  Navega a /dashboard    ───► │                           │
  │                              │                           │
  │                              │  PrivateRoute verifica    │
  │                              │  isAuthenticated          │
  │                              │                           │
  │                              │  Si loading=true          │
  │  Muestra spinner        ◄──  │  (esperando /auth/me)     │
  │                              │                           │
  │                              │  Si isAuthenticated=false │
  │  Redirige a /login      ◄──  │                           │
  │                              │                           │
  │                              │  Si isAuthenticated=true  │
  │  Renderiza Dashboard    ◄──  │                           │
```

---

## Flujo 3 — Carga del Dashboard

```
Dashboard.jsx          api.js (Axios)        Backend        ML Service
     │                      │                   │               │
     │  useEffect mount      │                   │               │
     │  ─────────────────►  │                   │               │
     │                      │  GET /api/employees│               │
     │                      │  Authorization: Bearer <token>     │
     │                      │  ─────────────────────────────►   │
     │                      │                   │               │
     │                      │                   │  1. Valida JWT (protect middleware)
     │                      │                   │  2. getAllEmployees()
     │                      │                   │  3. Devuelve mock data
     │                      │                   │               │
     │                      │  200 { data: [...] employees }     │
     │                      │  ◄─────────────────────────────   │
     │                      │                   │               │
     │  setEmployees(data)  ◄│                   │               │
     │                      │                   │               │
     │  Calcula KPIs         │                   │               │
     │  (client-side)        │                   │               │
     │                      │                   │               │
     │  Renderiza PieChart   │                   │               │
     │  Renderiza BarChart   │                   │               │
```

---

## Flujo 4 — Predicción de Riesgo de Fuga

```
Frontend           Backend (Node)          ML Service (Python)
   │                    │                        │
   │  POST /api/predict │                        │
   │  { age, salary, …} │                        │
   │  ───────────────►  │                        │
   │                    │  1. Valida JWT          │
   │                    │  2. ml.service.js       │
   │                    │                        │
   │                    │  POST /api/predict      │
   │                    │  { employee features } ─────────────►│
   │                    │                        │
   │                    │                        │  1. ¿Existe model.pkl?
   │                    │                        │     SÍ → Random Forest
   │                    │                        │     NO → dummy_model.py
   │                    │                        │
   │                    │                        │  2. Calcula flight_risk (0-1)
   │                    │                        │  3. Determina risk_level
   │                    │                        │
   │                    │  { flight_risk: 0.73,  │
   │                    │    risk_level: "ALTO",  │
   │                    │    confidence: 0.55,    │
   │                    │    is_dummy: true }  ◄──────────────│
   │                    │                        │
   │  { success: true,  │                        │
   │    data: { ... } } │                        │
   │  ◄───────────────  │                        │
```

---

## Flujo 5 — Expiración del JWT (manejo automático)

```
Browser          api.js (Axios Interceptor)      Backend
   │                      │                         │
   │  GET /api/employees   │                         │
   │  (token expirado)     │                         │
   │  ─────────────────►  │                         │
   │                      │  Request con Bearer token ──────►  │
   │                      │                         │
   │                      │                         │  jwt.verify() → TokenExpiredError
   │                      │                         │
   │                      │  401 Unauthorized    ◄──────────── │
   │                      │                         │
   │                      │  Interceptor detecta 401│
   │                      │  localStorage.removeItem('token')
   │                      │  window.location.href = '/login'
   │                      │                         │
   │  Redirige a /login ◄──│                         │
```

---

## Flujo 6 — Transición de modelo dummy a modelo real

```
Desarrollador                  Sistema de archivos          ML Service
     │                               │                          │
     │  Ejecuta notebook             │                          │
     │  01_eda_and_training.ipynb    │                          │
     │  ──────────────────────────► │                          │
     │                               │                          │
     │                               │  Genera model.pkl        │
     │                               │  ml-service/model/       │
     │                               │                          │
     │                               │  (Docker volume mapea    │
     │                               │  ./ml-service → /app)    │
     │                               │                          │
     │  Próximo request a            │                          │
     │  POST /api/predict            │                          │
     │                               │  _load_real_model()      │
     │                               │  os.path.exists('model/model.pkl')
     │                               │  → True                  │
     │                               │  joblib.load(model.pkl) ─────────►│
     │                               │                          │
     │                               │                          │  Usa Random Forest
     │                               │                          │  is_dummy: false
     │                               │                          │  model_version: "1.0.0-trained"
```
