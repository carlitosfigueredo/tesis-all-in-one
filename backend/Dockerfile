# ─────────────────────────────────────────
# Stage: Development
# ─────────────────────────────────────────
FROM node:24-alpine AS development

WORKDIR /app

# Copiar manifiestos primero para aprovechar caché de Docker
COPY package*.json ./

RUN npm ci

COPY . .

# Generar cliente Prisma
RUN npx prisma generate

EXPOSE 4000

CMD ["npm", "run", "dev"]
