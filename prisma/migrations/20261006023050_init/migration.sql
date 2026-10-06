-- CreateEnum
CREATE TYPE "Rol" AS ENUM ('dev', 'admin', 'user');

-- CreateEnum
CREATE TYPE "EstadoCuenta" AS ENUM ('pendiente', 'activo', 'rechazado');

-- CreateTable
CREATE TABLE "usuarios" (
    "id" UUID NOT NULL,
    "usuario" TEXT NOT NULL,
    "correo" TEXT NOT NULL,
    "pin" TEXT NOT NULL,
    "rol" "Rol" NOT NULL DEFAULT 'user',
    "estado" "EstadoCuenta" NOT NULL DEFAULT 'pendiente',
    "protegido" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "usuarios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fichas_paciente" (
    "id" UUID NOT NULL,
    "nombre" TEXT NOT NULL,
    "direccion" TEXT DEFAULT '',
    "ciudad" TEXT DEFAULT '',
    "telefono" TEXT,
    "fechaNacimiento" TIMESTAMP(3) NOT NULL,
    "fechaInicio" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ocupacion" TEXT DEFAULT '',
    "notasAdicionales" TEXT,
    "ahfHta" BOOLEAN NOT NULL DEFAULT false,
    "ahfDm" BOOLEAN NOT NULL DEFAULT false,
    "ahfCa" BOOLEAN NOT NULL DEFAULT false,
    "ahfTiroides" BOOLEAN NOT NULL DEFAULT false,
    "ahfCardiopatias" BOOLEAN NOT NULL DEFAULT false,
    "ahfOtros" TEXT DEFAULT 'Ninguno',
    "apnpTabaquismo" BOOLEAN NOT NULL DEFAULT false,
    "apnpDrogas" BOOLEAN NOT NULL DEFAULT false,
    "apnpOh" BOOLEAN NOT NULL DEFAULT false,
    "appEnfermedades" TEXT DEFAULT 'Ninguna',
    "appTraumaticos" TEXT DEFAULT 'Ninguno',
    "appQuirurgicos" TEXT DEFAULT 'Ninguno',
    "appAlergiaMeds" TEXT DEFAULT 'Ninguna',
    "appAlergiaAlim" TEXT DEFAULT 'Ninguna',
    "agoG" TEXT DEFAULT '',
    "agoP" TEXT DEFAULT '',
    "agoC" TEXT DEFAULT '',
    "agoA" TEXT DEFAULT '',
    "agoFur" TEXT DEFAULT '',
    "agoOtros" TEXT DEFAULT '',
    "cdpAntecedentes" TEXT DEFAULT '',
    "cdpPesoInicio" DOUBLE PRECISION,
    "cdpPesoIdeal" DOUBLE PRECISION,
    "cdpEstatura" DOUBLE PRECISION,
    "cdpSuIdeal" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "fichas_paciente_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "controles_clinicos" (
    "id" UUID NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "peso" DOUBLE PRECISION,
    "tx" TEXT DEFAULT '',
    "guia" TEXT DEFAULT '',
    "observaciones" TEXT DEFAULT '',
    "calificacion" INTEGER,
    "mesoterapia" BOOLEAN NOT NULL DEFAULT false,
    "acupuntura" BOOLEAN NOT NULL DEFAULT false,
    "ejercicios" BOOLEAN NOT NULL DEFAULT false,
    "agua" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "pacienteId" UUID NOT NULL,

    CONSTRAINT "controles_clinicos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "record_medidas" (
    "id" UUID NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "busto" DOUBLE PRECISION,
    "abdomenAlto" DOUBLE PRECISION,
    "ombligo" DOUBLE PRECISION,
    "cadera" DOUBLE PRECISION,
    "observaciones" TEXT DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "pacienteId" UUID NOT NULL,

    CONSTRAINT "record_medidas_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "usuarios_usuario_key" ON "usuarios"("usuario");

-- CreateIndex
CREATE UNIQUE INDEX "usuarios_correo_key" ON "usuarios"("correo");

-- AddForeignKey
ALTER TABLE "controles_clinicos" ADD CONSTRAINT "controles_clinicos_pacienteId_fkey" FOREIGN KEY ("pacienteId") REFERENCES "fichas_paciente"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "record_medidas" ADD CONSTRAINT "record_medidas_pacienteId_fkey" FOREIGN KEY ("pacienteId") REFERENCES "fichas_paciente"("id") ON DELETE CASCADE ON UPDATE CASCADE;
