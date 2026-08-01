-- Renombrar valor del enum Plan: EMPRESARIAL -> CORPORATIVO
-- En PostgreSQL, primero se renombra el valor del enum, luego los datos ya matchean

ALTER TYPE "Plan" RENAME VALUE 'EMPRESARIAL' TO 'CORPORATIVO';
