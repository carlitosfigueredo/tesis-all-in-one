# 03 — Infraestructura Docker

## Servicios definidos en docker-compose.yml

```
┌────────────────────┬─────────────────────────────┬────────────┬──────────────────┐
│ Servicio           │ Imagen / Build               │ Puerto     │ Container name   │
├────────────────────┼─────────────────────────────┼────────────┼──────────────────┤
│ postgres           │ postgres:16-alpine           │ 5432:5432  │ tesis_postgres   │
│ backend            │ ./backend (Node 20 Alpine)   │ 4000:4000  │ tesis_backend    │
│ ml-service         │ ./ml-service (Python 3.11)   │ 8000:8000  │ tesis_ml         │
│ frontend           │ ./frontend (Node 20 Alpine)  │ 5173:5173  │ tesis_frontend   │
└────────────────────┴─────────────────────────────┴────────────┴──────────────────┘
```

---

## Diagrama de dependencias entre servicios

```
postgres ◄─── backend ◄─── frontend
                 ▲
                 │
             ml-service
```

- `backend` espera que `postgres` esté **healthy** antes de arrancar (healthcheck con `pg_isready`)
- `frontend` espera que `backend` y `ml-service` estén arriba
- `ml-service` no depende de ningún otro servicio

---

## Red y volúmenes

```yaml
networks:
  tesis_network:        # Red bridge privada — todos los contenedores se ven por nombre
    driver: bridge

volumes:
  postgres_data:        # Volumen persistente — los datos de PG sobreviven al docker compose down
    driver: local
```

Los contenedores se comunican entre sí usando el **nombre del servicio** como hostname:
- El backend llega a la DB con: `postgresql://tesis_user:tesis_pass@postgres:5432/tesis_bi_db`
- El backend llega al ML Service con: `http://ml-service:8000`
- El frontend accede al backend a través del proxy de Vite: `/api` → `http://backend:4000`

---

## Dockerfile del Backend (Node.js)

```dockerfile
FROM node:20-alpine AS development
WORKDIR /app
COPY package*.json ./
RUN npm install          # Genera node_modules + package-lock.json
COPY . .
RUN npx prisma generate  # Genera el cliente de Prisma
EXPOSE 4000
CMD ["npm", "run", "dev"] # nodemon con hot reload
```

## Dockerfile del Frontend (React/Vite)

```dockerfile
FROM node:20-alpine AS development
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
EXPOSE 5173
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]
# --host 0.0.0.0 es obligatorio para que Docker exponga el puerto
```

## Dockerfile del ML Service (Python)

```dockerfile
FROM python:3.11-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
EXPOSE 8000
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]
```

---

## Comandos útiles

```bash
# Levantar todos los servicios (primera vez, construye las imágenes)
docker compose up --build

# Levantar en background
docker compose up -d

# Ver estado de los contenedores
docker compose ps

# Ver logs en tiempo real
docker compose logs -f

# Ver logs de un servicio específico
docker compose logs -f backend

# Ejecutar comandos dentro de un contenedor
docker compose exec backend npm run prisma:migrate
docker compose exec backend npx prisma studio

# Detener y eliminar contenedores (los datos en postgres_data persisten)
docker compose down

# Detener y eliminar todo incluyendo volúmenes (BORRA LA DB)
docker compose down -v
```
