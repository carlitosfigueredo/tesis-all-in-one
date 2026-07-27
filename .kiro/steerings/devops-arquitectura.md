---
inclusion: always
---

# DevOps y Despliegue (Docker)

## Contexto de Arquitectura

Para cumplir con la viabilidad técnica de la tesis, el sistema está diseñado bajo una **arquitectura de microservicios contenerizados** que garantiza escalabilidad e independencia entre el flujo transaccional (Node.js) y el cómputo pesado (Python/ML).

---

## Docker Compose (Entorno de Desarrollo)

El proyecto utiliza un `docker-compose.yml` que orquesta los siguientes servicios:

| Servicio | Descripción |
|---|---|
| `postgres-db` | Imagen de PostgreSQL 16 |
| `backend-node` | API Express + Prisma |
| `ml-service` | API FastAPI (Python 3) |
| `frontend` | Vite React dev server |
| `mailhog` | Servidor SMTP para capturar correos en desarrollo |

---

## Reglas para Dockerfiles

- **Backend (Node):** Usar imágenes ligeras tipo `node:20-alpine`. Asegurarse de ejecutar `npx prisma generate` antes de arrancar.
- **ML Service (Python):** Usar `python:3.10-slim`. No incluir librerías innecesarias en `requirements.txt` para mantener la imagen liviana (las dependencias de ML suelen ser pesadas).
- **Frontend:** Usar **multi-stage build** — construir con Node y servir los estáticos con `nginx:alpine` para emular el entorno de producción.

---

## Variables de Entorno y Redes

- Los servicios deben comunicarse internamente usando los **nombres de los contenedores** como hostname.

```
# Correcto — hostname interno de Docker
http://ml-service:8000/api/v1/predict

# Incorrecto — no usar localhost entre contenedores
http://localhost:8000/api/v1/predict
```

- **Nunca** comitear el archivo `.env`. Mantener un `.env.example` actualizado con todos los parámetros: conexión de DB, SMTP y URL de la API de ML.
