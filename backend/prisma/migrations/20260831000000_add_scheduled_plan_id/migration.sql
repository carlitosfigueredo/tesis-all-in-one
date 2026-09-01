-- AlterTable: downgrade programado de plan (aplica al próximo ciclo)
ALTER TABLE "subscriptions" ADD COLUMN "scheduledPlanId" TEXT;
