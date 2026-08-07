-- Migracion: Reemplazar campos IBM HR por variables custom de desercion
-- para empresas de desarrollo de software de Paraguay

-- 1. Eliminar la tabla existente (los datos mock se recargan con seed)
DROP TABLE IF EXISTS "employees";

-- 2. Crear la tabla con los nuevos campos
CREATE TABLE "employees" (
    "id" TEXT NOT NULL,
    "status" "EmployeeStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    -- Datos de RRHH (obligatorios)
    "edad" INTEGER NOT NULL,
    "nivel_formacion" TEXT NOT NULL,
    "rol_tecnologico" TEXT NOT NULL,
    "seniority" TEXT NOT NULL,
    "antiguedad_meses" INTEGER NOT NULL,
    "modalidad_trabajo" TEXT NOT NULL,
    "tipo_contrato" TEXT NOT NULL,
    "salario_mensual" INTEGER NOT NULL,
    "cantidad_horas_extra_mes" INTEGER NOT NULL DEFAULT 0,
    "capacitacion_ultimo_anio" BOOLEAN NOT NULL DEFAULT false,
    "evaluacion_desempeno" INTEGER NOT NULL DEFAULT 3,
    "cantidad_empresas_anteriores" INTEGER NOT NULL DEFAULT 0,

    -- Encuesta clima (opcionales)
    "satisfaccion_laboral" INTEGER,
    "satisfaccion_ambiente" INTEGER,
    "equilibrio_vida_trabajo" INTEGER,
    "estancamiento_carrera" INTEGER,
    "feedback_lider" INTEGER,

    -- Resultado de prediccion
    "riesgo_desercion" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "nivel_riesgo" TEXT NOT NULL DEFAULT 'BAJO',
    "desercion_real" BOOLEAN NOT NULL DEFAULT false,

    -- Relacion con empresa
    "companyId" TEXT,

    CONSTRAINT "employees_pkey" PRIMARY KEY ("id")
);

-- 3. Foreign key
ALTER TABLE "employees" ADD CONSTRAINT "employees_companyId_fkey"
    FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE SET NULL ON UPDATE CASCADE;
