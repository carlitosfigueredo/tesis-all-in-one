-- ─────────────────────────────────────────────────────────────────────────────
-- Estrategias de retención + configuración de dashboard (personalización).
--
-- 1. Enum RetentionStatus para el ciclo de vida de cada estrategia.
-- 2. Tabla retention_strategies: acciones de retención por empleado, con estado
--    y trazabilidad de seguimiento.
-- 3. Tabla dashboard_configs: qué widgets ve cada usuario y en qué orden.
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. Enum de estado de la estrategia
CREATE TYPE "RetentionStatus" AS ENUM ('SUGERIDA', 'EN_CURSO', 'COMPLETADA', 'DESCARTADA');

-- 2. Estrategias de retención
CREATE TABLE "retention_strategies" (
    "id" TEXT NOT NULL,
    "factorKey" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "descripcion" TEXT NOT NULL,
    "motivo" TEXT,
    "prioridad" TEXT NOT NULL DEFAULT 'MEDIA',
    "estado" "RetentionStatus" NOT NULL DEFAULT 'SUGERIDA',
    "nivelRiesgoAlGenerar" TEXT,
    "notas" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "completedAt" TIMESTAMP(3),
    "employeeId" TEXT NOT NULL,
    "companyId" TEXT,
    "assignedToUserId" TEXT,

    CONSTRAINT "retention_strategies_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "retention_strategies_companyId_idx" ON "retention_strategies"("companyId");
CREATE INDEX "retention_strategies_employeeId_idx" ON "retention_strategies"("employeeId");
CREATE INDEX "retention_strategies_estado_idx" ON "retention_strategies"("estado");

ALTER TABLE "retention_strategies"
  ADD CONSTRAINT "retention_strategies_employeeId_fkey"
  FOREIGN KEY ("employeeId") REFERENCES "employees"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "retention_strategies"
  ADD CONSTRAINT "retention_strategies_companyId_fkey"
  FOREIGN KEY ("companyId") REFERENCES "companies"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

-- 3. Configuración de dashboard por usuario
CREATE TABLE "dashboard_configs" (
    "id" TEXT NOT NULL,
    "widgets" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "userId" TEXT NOT NULL,
    "companyId" TEXT,

    CONSTRAINT "dashboard_configs_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "dashboard_configs_userId_key" ON "dashboard_configs"("userId");
CREATE INDEX "dashboard_configs_companyId_idx" ON "dashboard_configs"("companyId");

ALTER TABLE "dashboard_configs"
  ADD CONSTRAINT "dashboard_configs_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "users"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "dashboard_configs"
  ADD CONSTRAINT "dashboard_configs_companyId_fkey"
  FOREIGN KEY ("companyId") REFERENCES "companies"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
