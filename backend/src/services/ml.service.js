/**
 * Servicio que se comunica con el microservicio de ML (Python/FastAPI).
 * El backend Node actua como proxy: el frontend nunca llama directamente al ML service.
 */

const ML_SERVICE_URL = process.env.ML_SERVICE_URL || 'http://localhost:8000';

const _fetch = async (path, options = {}) => {
  const response = await fetch(`${ML_SERVICE_URL}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`ML service error (${response.status}): ${error}`);
  }
  return response.json();
};

// ── Prediccion ────────────────────────────────────────────────────────────────

/**
 * Predice riesgo de desercion para un empleado.
 * Recibe un objeto con las variables del modelo.
 * Retorna: { riesgo_desercion, nivel_riesgo, confianza, recomendacion, ... }
 */
const predictDesercion = (features) =>
  _fetch('/api/predict', { method: 'POST', body: JSON.stringify(features) });

/**
 * Prediccion en lote para multiples empleados.
 * Recibe array de objetos con variables del modelo.
 */
const predictBatch = (employeeList) =>
  _fetch('/api/predict/batch', { method: 'POST', body: JSON.stringify(employeeList) });

/**
 * Convierte un registro de Employee (Prisma) a las features que espera el ML service.
 * Mapea los campos de la DB al formato del schema EmployeeFeatures de Python.
 */
const employeeToFeatures = (emp) => ({
  edad: emp.edad,
  nivel_formacion: emp.nivel_formacion,
  rol_tecnologico: emp.rol_tecnologico,
  seniority: emp.seniority,
  antiguedad_meses: emp.antiguedad_meses,
  modalidad_trabajo: emp.modalidad_trabajo,
  tipo_contrato: emp.tipo_contrato,
  salario_mensual: emp.salario_mensual,
  cantidad_horas_extra_mes: emp.cantidad_horas_extra_mes,
  capacitacion_ultimo_anio: emp.capacitacion_ultimo_anio,
  evaluacion_desempeno: emp.evaluacion_desempeno,
  cantidad_empresas_anteriores: emp.cantidad_empresas_anteriores,
  // Opcionales: enviar null si no estan (el ML service usa defaults)
  satisfaccion_laboral: emp.satisfaccion_laboral ?? null,
  satisfaccion_ambiente: emp.satisfaccion_ambiente ?? null,
  equilibrio_vida_trabajo: emp.equilibrio_vida_trabajo ?? null,
  estancamiento_carrera: emp.estancamiento_carrera ?? null,
  feedback_lider: emp.feedback_lider ?? null,
});

/**
 * Predice el riesgo para un empleado de la DB y retorna los campos a guardar.
 * Retorna: { riesgo_desercion: float, nivel_riesgo: string }
 */
const calcularRiesgoEmpleado = async (emp) => {
  try {
    const features = employeeToFeatures(emp);
    const result = await predictDesercion(features);
    return {
      riesgo_desercion: result.riesgo_desercion,
      nivel_riesgo: result.nivel_riesgo,
    };
  } catch {
    // Si el ML service no esta disponible, usar valores por defecto
    return { riesgo_desercion: 0, nivel_riesgo: 'BAJO' };
  }
};

/**
 * Predice el riesgo para un lote de empleados.
 * Retorna array de { riesgo_desercion, nivel_riesgo } en el mismo orden.
 */
const calcularRiesgoBatch = async (employees) => {
  try {
    const featuresList = employees.map(employeeToFeatures);
    const results = await predictBatch(featuresList);
    return results.map((r) => ({
      riesgo_desercion: r.riesgo_desercion,
      nivel_riesgo: r.nivel_riesgo,
    }));
  } catch {
    // Fallback si ML service no responde
    return employees.map(() => ({ riesgo_desercion: 0, nivel_riesgo: 'BAJO' }));
  }
};

// ── Entrenamiento / Estado del modelo ─────────────────────────────────────────

const getModelStatus = () => _fetch('/api/model/status');

const trainModel = () => _fetch('/api/train', { method: 'POST' });

module.exports = {
  predictDesercion,
  predictBatch,
  employeeToFeatures,
  calcularRiesgoEmpleado,
  calcularRiesgoBatch,
  getModelStatus,
  trainModel,
};
