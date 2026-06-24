/**
 * Servicio que se comunica con el microservicio de ML (Python/FastAPI).
 * El backend Node actúa como proxy: el frontend nunca llama directamente al ML service.
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

// ── Predicción ────────────────────────────────────────────────────────────────

const predictFlightRisk = (features) =>
  _fetch('/api/predict', { method: 'POST', body: JSON.stringify(features) });

const predictBatch = (employeeList) =>
  _fetch('/api/predict/batch', { method: 'POST', body: JSON.stringify(employeeList) });

// ── Entrenamiento / Estado del modelo ─────────────────────────────────────────

const getModelStatus = () => _fetch('/api/model/status');

const trainModel = () => _fetch('/api/train', { method: 'POST' });

// ── Empleados del dataset ─────────────────────────────────────────────────────

/**
 * Lista empleados del dataset con flightRisk calculado.
 * @param {object} params - { page, page_size, department, risk_level, search, attrition }
 */
const getDatasetEmployees = (params = {}) => {
  const qs = new URLSearchParams();
  if (params.page)        qs.set('page', params.page);
  if (params.page_size)   qs.set('page_size', params.page_size);
  if (params.department)  qs.set('department', params.department);
  if (params.risk_level)  qs.set('risk_level', params.risk_level);
  if (params.search)      qs.set('search', params.search);
  if (params.attrition !== undefined) qs.set('attrition', params.attrition);
  const query = qs.toString() ? `?${qs.toString()}` : '';
  return _fetch(`/api/employees${query}`);
};

/**
 * Detalle de un empleado por ID del dataset.
 */
const getDatasetEmployee = (id) => _fetch(`/api/employees/${id}`);

module.exports = {
  predictFlightRisk,
  predictBatch,
  getModelStatus,
  trainModel,
  getDatasetEmployees,
  getDatasetEmployee,
};
