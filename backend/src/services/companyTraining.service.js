/**
 * companyTraining.service.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Entrenamiento del modelo con los empleados de UNA empresa (el tenant actual).
 *
 * A diferencia de globalTraining.service (que junta a TODAS las empresas para el
 * modelo global), este servicio arma el dataset SOLO con los empleados de la
 * empresa que dispara el entrenamiento, y reentrena el modelo con esos datos.
 *
 * El target de aprendizaje es `desercion_real` (bool): el desenlace histórico de
 * cada empleado (se fue / permanece). Sin ese dato la máquina no tiene de qué
 * aprender, por eso las validaciones exigen casos reales de ambas clases.
 *
 * Privacidad: al ML service se envían solo las variables predictivas + el target.
 * NO se envían nombre, apellido, código de empleado ni companyId (anonimizado).
 */

const prisma = require('../lib/prisma');
const mlService = require('./ml.service');
const { employeeToTrainingRow } = require('./globalTraining.service');

// Campos predictivos + target que necesita el ML service. Reutilizamos el mismo
// mapeo que el entrenamiento global para mantener un único formato de fila.
const TRAINING_SELECT = {
  edad: true, antiguedad_meses: true, salario_mensual: true,
  cantidad_horas_extra_mes: true, evaluacion_desempeno: true,
  cantidad_empresas_anteriores: true, satisfaccion_laboral: true,
  satisfaccion_ambiente: true, equilibrio_vida_trabajo: true,
  estancamiento_carrera: true, feedback_lider: true,
  nivel_formacion: true, rol_tecnologico: true, seniority: true,
  modalidad_trabajo: true, tipo_contrato: true, capacitacion_ultimo_anio: true,
  desercion_real: true,
};

/**
 * Arma el dataset de entrenamiento de una empresa concreta.
 *
 * @param {string} companyId
 * @returns {Promise<{rows: object[], totalPositivos: number, totalNegativos: number}>}
 */
const buildCompanyDataset = async (companyId) => {
  const employees = await prisma.employee.findMany({
    where: { companyId },
    select: TRAINING_SELECT,
  });

  const rows = employees.map(employeeToTrainingRow);
  const totalPositivos = rows.filter((r) => r.desercion === 'Si').length;
  const totalNegativos = rows.length - totalPositivos;

  return { rows, totalPositivos, totalNegativos };
};

/**
 * Entrena el modelo con los empleados de la empresa indicada.
 *
 * Lanza errores con statusCode 422 y mensajes claros cuando los datos no
 * alcanzan, de modo que la ruta pueda devolverlos tal cual al frontend:
 *  - No hay empleados cargados.
 *  - No hay ningún empleado con deserción real registrada.
 *
 * El mínimo de casos por clase lo valida el propio ML service (MIN_DESERCION_CASES);
 * si no alcanza, su error 422 se propaga con el detalle exacto.
 *
 * @param {string} companyId
 * @returns {Promise<{metrics: object, datasetSize: number, positivos: number, negativos: number}>}
 */
const trainCompanyModel = async (companyId) => {
  if (!companyId) {
    const err = new Error('No se pudo determinar la empresa del usuario.');
    err.statusCode = 422;
    throw err;
  }

  const { rows, totalPositivos, totalNegativos } = await buildCompanyDataset(companyId);

  if (rows.length === 0) {
    const err = new Error(
      'No hay empleados cargados en tu empresa. ' +
      'Importá o registrá empleados antes de entrenar el modelo.'
    );
    err.statusCode = 422;
    throw err;
  }

  if (totalPositivos === 0 || totalNegativos === 0) {
    const err = new Error(
      'El modelo necesita ejemplos de ambos desenlaces para aprender: ' +
      'empleados que se fueron (deserción real) y empleados que permanecieron. ' +
      `Actualmente tenés ${totalPositivos} con deserción y ${totalNegativos} que permanecen.`
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
  buildCompanyDataset,
  trainCompanyModel,
};
