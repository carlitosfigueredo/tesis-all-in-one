-- Renombrar valor del enum Plan: EMPRESARIAL -> CORPORATIVO
-- Primero actualizar las empresas que tengan EMPRESARIAL
UPDATE "companies" SET "plan" = 'CORPORATIVO' WHERE "plan" = 'EMPRESARIAL';

-- Recrear el enum con el nuevo valor
ALTER TYPE "Plan" RENAME VALUE 'EMPRESARIAL' TO 'CORPORATIVO';
