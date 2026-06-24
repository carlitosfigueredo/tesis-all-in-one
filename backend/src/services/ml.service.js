/**
 * Servicio que se comunica con el microservicio de ML (Python/FastAPI).
 * El backend Node actúa como proxy: el frontend nunca llama directamente al ML service.
 */

const ML_SERVICE_URL = process.env.ML_SERVICE_URL || 'http://localhost:8000';

/**
 * Envía las features de un empleado al modelo y devuelve la predicción.
 * @param {object} features - Variables del empleado (ver schemas.py)
 * @returns {Promise<{flight_risk, risk_level, confidence, model_version, is_dummy}>}
 */
const predictFlightRisk = async (features) => {
  const response = await fetch(`${ML_SERVICE_URL}/api/predict`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(features),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`ML service error (${response.status}): ${error}`);
  }

  return response.json();
};

/**
 * Envía una lista de empleados y devuelve predicciones en batch.
 * @param {object[]} employeeList
 */
const predictBatch = async (employeeList) => {
  const response = await fetch(`${ML_SERVICE_URL}/api/predict/batch`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(employeeList),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`ML service batch error (${response.status}): ${error}`);
  }

  return response.json();
};

module.exports = { predictFlightRisk, predictBatch };

// ─────────────────────────────────────────
// Entrenamiento y estado del modelo
// ─────────────────────────────────────────

/**
 * Devuelve el estado actual del modelo (si está entrenado, tamaño, métricas).
 */
const getModelStatus = async () => {
  const response = await fetch(`${ML_SERVICE_URL}/api/model/status`);
  if (!response.ok) {
    throw new Error(`ML service error (${response.status})`);
  }
  return response.json();
};

/**
 * Dispara el entrenamiento del modelo y devuelve las métricas.
 * Puede tardar 30-60 segundos.
 */
const trainModel = async () => {
  const response = await fetch(`${ML_SERVICE_URL}/api/train`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`ML training error (${response.status}): ${error}`);
  }
  return response.json();
};

module.exports = { predictFlightRisk, predictBatch, getModelStatus, trainModel };
