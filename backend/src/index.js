require('dotenv').config();
const app = require('./app');
const { startSubscriptionExpiryJob } = require('./jobs/subscriptionExpiry.job');

const PORT = process.env.PORT || 4000;

app.listen(PORT, () => {
  console.log(`\n🚀 Servidor corriendo en http://localhost:${PORT}`);
  console.log(`📋 Entorno: ${process.env.NODE_ENV}`);
  console.log(`🔗 API Base: http://localhost:${PORT}/api\n`);

  // Scheduler: expira suscripciones vencidas y suspende empresas
  startSubscriptionExpiryJob();
});
