-- ─────────────────────────────────────────────────────────────────────────────
-- Identidad de empleados (codigo + nombre/apellido) e historial de riesgo.
--
-- Estrategia para columnas NOT NULL sobre datos existentes:
--   1. Se agregan las columnas permitiendo NULL temporalmente.
--   2. Se rellenan las filas existentes con valores placeholder
--      (codigo_empleado derivado del id para garantizar unicidad).
--   3. Se marcan las columnas como NOT NULL.
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. Agregar columnas de identidad (nullable por ahora)
ALTER TABLE "employees" ADD COLUMN "codigo_empleado" TEXT;
ALTER TABLE "employees" ADD COLUMN "nombre" TEXT;
ALTER TABLE "employees" ADD COLUMN "apellido" TEXT;

-- 2. Rellenar filas existentes. El codigo se deriva del id (unico) para
--    no violar el indice unico por empresa. El nombre/apellido son placeholders.
UPDATE "employees"
SET
  "codigo_empleado" = 'EMP-' || substr(replace("id"::text, '-', ''), 1, 8),
  "nombre"          = 'Empleado',
  "apellido"        = substr(replace("id"::text, '-', ''), 1, 6)
WHERE "codigo_empleado" IS NULL;

-- 3. Forzar NOT NULL
ALTER TABLE "employees" ALTER COLUMN "codigo_empleado" SET NOT NULL;
ALTER TABLE "employees" ALTER COLUMN "nombre" SET NOT NULL;
ALTER TABLE "employees" ALTER COLUMN "apellido" SET NOT NULL;

-- 4. Indice unico: el codigo de empleado es unico dentro de cada empresa
CREATE UNIQUE INDEX "employees_companyId_codigo_empleado_key"
  ON "employees"("companyId", "codigo_empleado");

-- ─────────────────────────────────────────────────────────────────────────────
-- Tabla de historial de riesgo
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE "risk_snapshots" (
    "id" TEXT NOT NULL,
    "riesgo_desercion" DOUBLE PRECISION NOT NULL,
    "nivel_riesgo" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "employeeId" TEXT NOT NULL,

    CONSTRAINT "risk_snapshots_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "risk_snapshots_employeeId_createdAt_idx"
  ON "risk_snapshots"("employeeId", "createdAt");

ALTER TABLE "risk_snapshots"
  ADD CONSTRAINT "risk_snapshots_employeeId_fkey"
  FOREIGN KEY ("employeeId") REFERENCES "employees"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
