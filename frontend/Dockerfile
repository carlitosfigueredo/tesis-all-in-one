FROM node:24-alpine AS development

WORKDIR /app

COPY package*.json ./

RUN npm ci

COPY . .

EXPOSE 5173

# --host 0.0.0.0 es necesario para que Docker exponga el puerto
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]
