# ─────────────────────────────────────────
# Stage: Development
# ─────────────────────────────────────────
FROM node:20-alpine AS development

WORKDIR /app

# OpenSSL necesario para Prisma engine en Alpine
RUN apk add --no-cache openssl

# Copiar manifiestos y prisma schema para instalar deps
COPY package*.json ./
COPY prisma ./prisma/

RUN npm install

# Generar Prisma Client para linux-musl (Alpine)
RUN npx prisma generate

COPY . .

EXPOSE 4000

# En desarrollo: regenerar prisma por si el schema cambio via volumen montado, luego arrancar
CMD ["sh", "-c", "npx prisma generate && npx prisma migrate deploy && npm run dev"]
