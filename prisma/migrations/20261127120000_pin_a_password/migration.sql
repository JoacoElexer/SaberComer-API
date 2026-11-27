-- El PIN se reemplaza por una contraseña. Se renombra la columna para
-- conservar las cuentas existentes: los hashes de bcrypt siguen siendo válidos.
ALTER TABLE "usuarios" RENAME COLUMN "pin" TO "password";

-- Momento del último cambio de contraseña. Los tokens emitidos antes dejan de valer.
ALTER TABLE "usuarios" ADD COLUMN "passwordChangedAt" TIMESTAMP(3);
