/**
 * globalTraining.service.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Aprendizaje acumulativo del modelo GLOBAL.
 *
 * Reúne los empleados de TODAS las empresas que tienen un desenlace conocido
 * (desercion_real: se fueron o permanecieron), los anonimiza y los mapea al
 * formato que espera el ML service, y dispara el reentrenamiento.
 *
 * Por qué "global": una empresa sola rara vez tiene suficientes casos de
 * deserción para entrenar un modelo confiable. Juntando el aprendizaje de todas
 * (sin exponer datos identificatorios), el modelo mejora para todo el sistema.
 *
 * Privacidad: NO se envían nombre, apellido, código de empleado ni companyId al
 * ML service. Solo las variables predictivas + el target. Es dato anonimizado.
 */

const prisma = require('../lib/prisma');
const mlService = require('./ml.service');

// Valor neutro para imputar variables de encuesta clima que falten (escala 1-5).
const NEUTRAL_SURVEY_VALUE = 3;

/**
 * Convierte un Employee de Prisma a una fila de entrenamiento para el ML service.
 * - Mapea desercion_real (bool) → 'desercion' ('Si'/'No').
 * - capacitacion_ultimo_anio (bool) → 'Si'/'No'.
 * - Imputa opcionales de encuesta clima nulas con valor neutro (3).
 * - NO incluye datos identificatorios (anonimización).
 */
const employeeToTrainingRow = (emp) => ({
  edad: emp.edad,
  antiguedad_meses: emp.antiguedad_meses,
  salario_mensual: emp.salario_mensual,
  cantidad_horas_extra_mes: emp.cantidad_horas_extra_mes ?? 0,
  evaluacion_desempeno: emp.evaluacion_desempeno ?? NEUTRAL_SURVEY_VALUE,
  cantidad_empresas_anteriores: emp.cantidad_empresas_anteriores ?? 0,
  satisfaccion_laboral: emp.satisfaccion_laboral ?? NEUTRAL_SURVEY_VALUE,
  satisfaccion_ambiente: emp.satisfaccion_ambiente ?? NEUTRAL_SURVEY_VALUE,
  equilibrio_vida_trabajo: emp.equilibrio_vida_trabajo ?? NEUTRAL_SURVEY_VALUE,
  estancamiento_carrera: emp.estancamiento_carrera ?? NEUTRAL_SURVEY_VALUE,
  feedback_lider: emp.feedback_lider ?? NEUTRAL_SURVEY_VALUE,
  nivel_formacion: emp.nivel_formacion,
  rol_tecnologico: emp.rol_tecnologico,
  seniority: emp.seniority,
  modalidad_trabajo: emp.modalidad_trabajo,
  tipo_contrato: emp.tipo_contrato,
  capacitacion_ultimo_anio: emp.capacitacion_ultimo_anio ? 'Si' : 'No',
  desercion: emp.desercion_real ? 'Si' : 'No',
});

/**
 * Junta el dataset de entrenamiento de todas las empresas.
 * Incluye empleados en cualquier estado (ACTIVE/INACTIVE): lo que importa para
 * aprender es el desenlace real, no si siguen activos.
 *
 * @returns {Promise<{rows: object[], totalPositivos: number, totalNegativos: number}>}
 */
const buildGlobalDataset = async () => {
  const employees = await prisma.employee.findMany({
    select: {
      edad: true, antiguedad_meses: true, salario_mensual: true,
      cantidad_horas_extra_mes: true, evaluacion_desempeno: true,
      cantidad_empresas_anteriores: true, satisfaccion_laboral: true,
      satisfaccion_ambiente: true, equilibrio_vida_trabajo: true,
      estancamiento_carrera: true, feedback_lider: true,
      nivel_formacion: true, rol_tecnologico: true, seniority: true,
      modalidad_trabajo: true, tipo_contrato: true, capacitacion_ultimo_anio: true,
      desercion_real: true,
    },
  });

  const rows = employees.map(employeeToTrainingRow);
  const totalPositivos = rows.filter((r) => r.desercion === 'Si').length;
  const totalNegativos = rows.length - totalPositivos;

  return { rows, totalPositivos, totalNegativos };
};

/**
 * Ejecuta el reentrenamiento global: arma el dataset y lo envía al ML service.
 * El ML service valida el mínimo de casos por clase; si no alcanza, lanza error
 * (que se propaga como fallo del reentrenamiento).
 *
 * @returns {Promise<{metrics: object, datasetSize: number, positivos: number, negativos: number}>}
 */
const retrainGlobalModel = async () => {
  const { rows, totalPositivos, totalNegativos } = await buildGlobalDataset();

  if (rows.length === 0) {
    const err = new Error('No hay empleados con datos para entrenar.');
    err.statusCode = 422;
    throw err;
  }

  // El ML service valida el mínimo real por clase; acá damos un mensaje claro
  // antes de la llamada para el caso obvio de que no haya ninguna deserción.
  if (totalPositivos === 0) {
    const err = new Error(
      'No hay ningún empleado con deserción real registrada. ' +
      'El modelo necesita casos históricos de personas que se fueron para aprender.'
    );
    err.statusCode = 422;
    throw err;
  }

  const metrics = await mlService.trainDataset(rows);

  return {
    metrics,
    datasetSize: rows.length,
    positivos: totalPositivos,
    negativos: totalNegativos,
  };
};

module.exports = {
  employeeToTrainingRow,
  buildGlobalDataset,
  retrainGlobalModel,
};
