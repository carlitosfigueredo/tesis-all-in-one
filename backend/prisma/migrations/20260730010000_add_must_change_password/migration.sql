-- Agregar campo mustChangePassword a la tabla users
-- Los usuarios creados por admin tendran este campo en true
-- Se pone en false cuando el usuario cambia su contrasena

ALTER TABLE "users" ADD COLUMN "mustChangePassword" BOOLEAN NOT NULL DEFAULT false;
