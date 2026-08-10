-- CreateTable: consent_records
-- Registra el consentimiento informado de usuarios al registrarse
-- Cumple con Ley N.º 7593/2025 de Proteccion de Datos Personales (Paraguay)
-- y con los requisitos del punto 35 de los Apuntes de Tesis UNIDA

CREATE TABLE "consent_records" (
    "id"              TEXT NOT NULL,
    "userId"          TEXT NOT NULL,
    "companyId"       TEXT,

    -- Tipo de consentimiento
    -- TERMS_AND_CONDITIONS | PRIVACY_POLICY | DATA_PROCESSING
    "consentType"     TEXT NOT NULL,

    -- Version del documento aceptado (ej: "1.0")
    "documentVersion" TEXT NOT NULL DEFAULT '1.0',

    -- True = aceptado, False = rechazado / revocado
    "accepted"        BOOLEAN NOT NULL DEFAULT false,

    -- IP y user agent del momento de la aceptacion
    "ipAddress"       TEXT,
    "userAgent"       TEXT,

    -- Fecha de aceptacion o revocacion
    "acceptedAt"      TIMESTAMP(3),
    "revokedAt"       TIMESTAMP(3),

    -- Finalidad autorizada (ej: "Gestion de cuenta y servicios BI")
    "purpose"         TEXT,

    "createdAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "consent_records_pkey" PRIMARY KEY ("id")
);

-- Indice para consultar consentimientos de un usuario
CREATE INDEX "consent_records_userId_idx" ON "consent_records"("userId");
CREATE INDEX "consent_records_companyId_idx" ON "consent_records"("companyId");
CREATE INDEX "consent_records_consentType_idx" ON "consent_records"("consentType");

-- Foreign keys
ALTER TABLE "consent_records"
    ADD CONSTRAINT "consent_records_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "consent_records"
    ADD CONSTRAINT "consent_records_companyId_fkey"
    FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE SET NULL ON UPDATE CASCADE;
