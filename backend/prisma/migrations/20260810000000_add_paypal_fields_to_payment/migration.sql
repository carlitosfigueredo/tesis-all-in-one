-- Agrega campos de trazabilidad PayPal al modelo Payment
-- paypalOrderId, paypalCaptureId, payerEmail, payerName

ALTER TABLE "payments"
  ADD COLUMN IF NOT EXISTS "paypalOrderId"   TEXT,
  ADD COLUMN IF NOT EXISTS "paypalCaptureId" TEXT,
  ADD COLUMN IF NOT EXISTS "payerEmail"      TEXT,
  ADD COLUMN IF NOT EXISTS "payerName"       TEXT;

-- Indice para buscar pagos por captureId de PayPal (trazabilidad)
CREATE INDEX IF NOT EXISTS "payments_paypalCaptureId_idx" ON "payments"("paypalCaptureId");
