-- Registra la ultima vez que una empresa (re)calculo las predicciones de riesgo.
-- Nullable: null significa "nunca se recalculo" (permite el primer calculo sin espera).
ALTER TABLE "companies" ADD COLUMN "lastRecalculatedAt" TIMESTAMP(3);
