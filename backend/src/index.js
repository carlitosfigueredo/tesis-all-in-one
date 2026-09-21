require('dotenv').config();
// Capturar console.* hacia el archivo de logs lo antes posible.
require('./lib/logger').installConsoleCapture();
const app = require('./app');
const { startSubscriptionExpiryJob } = require('./jobs/subscriptionExpiry.job');
const { startRetentionScanJob } = require('./jobs/retentionScan.job');

const PORT = process.env.PORT || 4000;

app.listen(PORT, () => {
  console.log(`\n🚀 Servidor corriendo en http://localhost:${PORT}`);
  console.log(`📋 Entorno: ${process.env.NODE_ENV}`);
  console.log(`🔗 API Base: http://localhost:${PORT}/api\n`);

  // Scheduler: expira suscripciones vencidas y suspende empresas
  startSubscriptionExpiryJob();

  // Scheduler semanal: genera estrategias de retención para empleados en riesgo
  // ALTO/CRÍTICO y notifica por correo a los admins de cada empresa.
  startRetentionScanJob();
});
