-- CreateTable: system_configs (configuracion global del sistema)
CREATE TABLE "system_configs" (
    "key"       TEXT NOT NULL,
    "value"     JSONB NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedBy" TEXT,

    CONSTRAINT "system_configs_pkey" PRIMARY KEY ("key")
);

-- Insertar politica de contrasenas por defecto
INSERT INTO "system_configs" ("key", "value", "updatedAt") VALUES (
    'password_policy',
    '{
        "minLength": 8,
        "maxLength": 128,
        "requireUppercase": true,
        "requireLowercase": true,
        "requireNumber": true,
        "requireSpecial": true
    }'::jsonb,
    NOW()
);
