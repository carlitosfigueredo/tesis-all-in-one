// Singleton de PrismaClient
// Evita crear multiples instancias en desarrollo con hot-reload

const { PrismaClient } = require('@prisma/client');

/** @type {PrismaClient} */
let prisma;

if (process.env.NODE_ENV === 'production') {
  prisma = new PrismaClient();
} else {
  // En desarrollo reutilizamos la instancia para evitar
  // agotar conexiones con cada reinicio de nodemon
  if (!global.__prisma) {
    global.__prisma = new PrismaClient({
      log: ['warn', 'error'],
    });
  }
  prisma = global.__prisma;
}

module.exports = prisma;
