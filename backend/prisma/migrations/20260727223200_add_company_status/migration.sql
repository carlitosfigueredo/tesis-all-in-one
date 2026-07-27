-- CreateEnum
CREATE TYPE "CompanyStatus" AS ENUM ('PENDING_PAYMENT', 'TRIAL', 'ACTIVE', 'SUSPENDED');

-- AlterTable
ALTER TABLE "companies" ADD COLUMN     "status" "CompanyStatus" NOT NULL DEFAULT 'PENDING_PAYMENT';
