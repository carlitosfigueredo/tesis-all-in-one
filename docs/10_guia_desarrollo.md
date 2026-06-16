# 10 — Guía de Desarrollo

## Prerrequisitos

| Herramienta | Versión mínima | Para qué |
|-------------|---------------|----------|
| Docker Desktop | 4.x | Levantar todos los servicios |
| Node.js | 20.x | Desarrollo local sin Docker |
| Python | 3.11.x | ML Service sin Docker |
| Git | 2.x | Control de versiones |

---

## Levantar el entorno (con Docker — recomendado)

```bash
# 1. Clonar el repositorio
git clone <url-del-repo>
cd tesis-all-in-one

# 2. Crear el archivo de variables de entorno
copy .env.example .env   # Windows
# o
cp .env.example .env     # Linux/Mac

# 3. Levantar todos los servicios
docker compose up --build

# 4. Verificar que todo está corriendo
docker compose ps
```

### URLs disponibles

| Servicio | URL |
|----------|-----|
| Frontend | http://localhost:5173 |
| Backend API | http://localhost:4000 |
| API Health Check | http://localhost:4000/api/health |
| ML Service | http://localhost:8000 |
| ML Swagger UI | http://localhost:8000/docs |
| Prisma Studio | http://localhost:5555 (correr por separado) |

---

## Credenciales de prueba

| Email | Password | Rol |
|-------|----------|-----|
| admin@tesis.com | password | ADMIN |
| analista@tesis.com | password | ANALYST |

---

## Ejecutar la migración de base de datos

El schema de Prisma está definido pero las tablas no existen hasta correr la migración:

```bash
docker compose exec backend npx prisma migrate dev --name init
```

Esto crea las tablas `users` y `employees` en PostgreSQL.

---

## Entrenar el modelo ML

```bash
# 1. Asegurarse de tener el CSV en:
#    ml-service/notebooks/data/WA_Fn-UseC_-HR-Employee-Attrition.csv

# 2. Abrir Jupyter (localmente)
pip install jupyter
cd ml-service
jupyter notebook notebooks/01_eda_and_training.ipynb

# 3. Ejecutar todas las celdas
# El notebook genera: ml-service/model/model.pkl

# 4. El ML Service lo detecta automáticamente en el próximo request
#    (no necesita reiniciarse gracias al volumen de Docker)
```

---

## Desarrollo local sin Docker

### Backend

```bash
cd backend
npm install

# Crear .env con la DATABASE_URL apuntando a localhost
echo "PORT=4000" > .env
echo "NODE_ENV=development" >> .env
echo "DATABASE_URL=postgresql://tesis_user:tesis_pass@localhost:5432/tesis_bi_db" >> .env
echo "JWT_SECRET=dev_secret_key" >> .env

npm run dev       # Inicia con nodemon (hot reload)
```

### Frontend

```bash
cd frontend
npm install
npm run dev       # Inicia Vite en localhost:5173
```

### ML Service

```bash
cd ml-service
python -m venv venv
.\venv\Scripts\activate    # Windows
# o
source venv/bin/activate   # Linux/Mac

pip install -r requirements.txt
uvicorn main:app --reload  # Inicia en localhost:8000
```

---

## Estructura de un nuevo feature

Para agregar una nueva funcionalidad (ej: módulo de reportes):

**1. Backend — Nueva ruta**
```
backend/src/
├── routes/reports.routes.js      # Definir los endpoints
├── controllers/reports.controller.js  # Lógica de negocio
```
Luego registrar en `routes/index.js`:
```javascript
router.use('/reports', reportRoutes);
```

**2. Frontend — Nueva página**
```
frontend/src/
├── pages/Reports.jsx
```
Registrar en `App.jsx`:
```jsx
<Route path="/reports" element={<Reports />} />
```
Agregar al Sidebar en `components/layout/Sidebar.jsx`:
```javascript
{ to: '/reports', icon: '📄', label: 'Reportes' }
```

---

## Comandos frecuentes

```bash
# Ver logs en tiempo real de un servicio específico
docker compose logs -f backend
docker compose logs -f ml-service

# Reiniciar un servicio sin reconstruir la imagen
docker compose restart backend

# Reconstruir solo un servicio (ej: después de cambiar requirements.txt)
docker compose up --build ml-service

# Abrir una shell dentro de un contenedor
docker compose exec backend sh
docker compose exec ml-service bash

# Ver el estado de los contenedores
docker compose ps

# Detener todo (datos de la BD se conservan)
docker compose down

# Push al repositorio remoto
git push --force-with-lease   # (necesario la primera vez por el rebase del historial)
```

---

## Solución de problemas comunes

| Problema | Causa probable | Solución |
|----------|---------------|----------|
| Backend no conecta a PostgreSQL | La BD aún no pasó el healthcheck | Esperar 10-15 segundos y revisar `docker compose logs postgres` |
| `npm ci` falla en Docker | No existe `package-lock.json` | Ya corregido: se usa `npm install` |
| ML Service devuelve `is_dummy: true` | No existe `model.pkl` | Ejecutar el notebook de entrenamiento |
| Frontend muestra pantalla en blanco | Error de JS en consola | Abrir DevTools → Console |
| Token expirado | Han pasado más de 8 horas | Hacer login nuevamente |
| `docker compose up` falla en apt-get | Problema de red de Debian Trixie | Ya corregido: eliminado el paso de apt-get del Dockerfile de ML |
