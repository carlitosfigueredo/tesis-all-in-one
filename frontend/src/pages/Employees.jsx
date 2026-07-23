import { useEffect, useState, useCallback, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import Sidebar from '../components/layout/Sidebar';
import Navbar from '../components/layout/Navbar';
import api from '../services/api';

// ─── Constantes ───────────────────────────────────────────────────────────────

// Tasa de cambio referencial GS/USD — se puede mover a una variable de entorno
const USD_TO_GS = 7500;

// Etiquetas legibles para la escala 1-4 de satisfacción del dataset IBM HR
const SATISFACTION_LABELS = {
  1: { text: 'Muy baja',  color: 'text-red-600',   bg: 'bg-red-50'    },
  2: { text: 'Baja',      color: 'text-amber-600',  bg: 'bg-amber-50'  },
  3: { text: 'Alta',      color: 'text-blue-600',   bg: 'bg-blue-50'   },
  4: { text: 'Muy alta',  color: 'text-green-600',  bg: 'bg-green-50'  },
};

// ─── Componentes de UI ────────────────────────────────────────────────────────

const RiskBadge = ({ level }) => {
  const styles = {
    ALTO:  'bg-red-100 text-red-700',
    MEDIO: 'bg-amber-100 text-amber-700',
    BAJO:  'bg-green-100 text-green-700',
  };
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${styles[level] ?? styles.BAJO}`}>
      {level}
    </span>
  );
};

/**
 * Muestra el nivel de satisfacción (1-4) con etiqueta descriptiva y tooltip
 * que explica qué significa la escala.
 */
const SatisfactionCell = ({ value }) => {
  const meta = SATISFACTION_LABELS[value] ?? SATISFACTION_LABELS[1];
  return (
    <span
      title={`Satisfacción laboral: ${meta.text} (${value}/4)\nEscala IBM HR: 1=Muy baja, 2=Baja, 3=Alta, 4=Muy alta`}
      className={`cursor-default rounded-full px-2 py-0.5 text-xs font-medium ${meta.bg} ${meta.color}`}
    >
      {meta.text}
    </span>
  );
};

/**
 * Formatea un ingreso mensual en USD o GS según el modo activo.
 */
const formatIncome = (usdValue, inGs) => {
  if (inGs) {
    const gs = Math.round(usdValue * USD_TO_GS);
    return `Gs. ${gs.toLocaleString('es-PY')}`;
  }
  return `$${usdValue.toLocaleString('en-US')}`;
};


// ─── Modal de importación CSV ─────────────────────────────────────────────────

/**
 * Valida una fila del CSV contra los campos requeridos del dataset IBM HR.
 * Retorna un array de errores (vacío = fila válida).
 */
const validateCsvRow = (row, lineNum) => {
  const errors = [];
  const required = ['department', 'job_role', 'age', 'gender', 'monthly_income',
                    'job_satisfaction', 'years_at_company', 'overtime', 'attrition'];

  for (const field of required) {
    if (row[field] === undefined || row[field] === '') {
      errors.push(`Línea ${lineNum}: falta el campo "${field}"`);
    }
  }

  const age = Number(row.age);
  if (!isNaN(age) && (age < 18 || age > 70)) {
    errors.push(`Línea ${lineNum}: edad fuera de rango (18-70)`);
  }

  const income = Number(row.monthly_income);
  if (!isNaN(income) && income < 0) {
    errors.push(`Línea ${lineNum}: ingreso no puede ser negativo`);
  }

  const sat = Number(row.job_satisfaction);
  if (row.job_satisfaction !== '' && (sat < 1 || sat > 4 || isNaN(sat))) {
    errors.push(`Línea ${lineNum}: job_satisfaction debe ser 1, 2, 3 o 4`);
  }

  const validDepts = ['Sales', 'Research & Development', 'Human Resources'];
  if (row.department && !validDepts.includes(row.department)) {
    errors.push(`Línea ${lineNum}: department inválido ("${row.department}")`);
  }

  return errors;
};

/**
 * Parsea un string CSV a array de objetos usando la primera fila como headers.
 */
const parseCsv = (text) => {
  const lines = text.trim().split('\n').map((l) => l.trim()).filter(Boolean);
  if (lines.length < 2) return { headers: [], rows: [], errors: ['El archivo no tiene datos'] };

  const headers = lines[0].split(',').map((h) => h.trim().toLowerCase().replace(/\s+/g, '_'));
  const rows = [];
  const errors = [];

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',').map((v) => v.trim());
    if (values.length !== headers.length) {
      errors.push(`Línea ${i + 1}: cantidad de columnas incorrecta (esperado ${headers.length}, encontrado ${values.length})`);
      continue;
    }
    const row = {};
    headers.forEach((h, idx) => { row[h] = values[idx]; });
    const rowErrors = validateCsvRow(row, i + 1);
    errors.push(...rowErrors);
    rows.push(row);
  }

  return { headers, rows, errors };
};


// Datos de ejemplo inline (espejo del CSV de la plantilla)
const EXAMPLE_ROWS = [
  { department: 'Sales', job_role: 'Sales Executive', age: '35', gender: 'Male', marital_status: 'Single', education: '3', education_field: 'Marketing', monthly_income: '5000', job_satisfaction: '3', environment_satisfaction: '3', work_life_balance: '3', performance_rating: '3', years_at_company: '5', years_in_current_role: '3', years_since_last_promotion: '1', total_working_years: '10', num_companies_worked: '2', distance_from_home: '10', overtime: 'No', attrition: 'No', business_travel: 'Travel_Rarely' },
  { department: 'Research & Development', job_role: 'Research Scientist', age: '28', gender: 'Female', marital_status: 'Married', education: '4', education_field: 'Life Sciences', monthly_income: '4500', job_satisfaction: '4', environment_satisfaction: '4', work_life_balance: '4', performance_rating: '4', years_at_company: '3', years_in_current_role: '2', years_since_last_promotion: '0', total_working_years: '6', num_companies_worked: '1', distance_from_home: '5', overtime: 'No', attrition: 'No', business_travel: 'Non-Travel' },
  { department: 'Human Resources', job_role: 'Human Resources', age: '42', gender: 'Male', marital_status: 'Divorced', education: '2', education_field: 'Human Resources', monthly_income: '3800', job_satisfaction: '2', environment_satisfaction: '2', work_life_balance: '2', performance_rating: '3', years_at_company: '10', years_in_current_role: '5', years_since_last_promotion: '3', total_working_years: '15', num_companies_worked: '4', distance_from_home: '25', overtime: 'Yes', attrition: 'Yes', business_travel: 'Travel_Frequently' },
  { department: 'Sales', job_role: 'Sales Representative', age: '24', gender: 'Female', marital_status: 'Single', education: '1', education_field: 'Marketing', monthly_income: '2500', job_satisfaction: '1', environment_satisfaction: '1', work_life_balance: '1', performance_rating: '3', years_at_company: '1', years_in_current_role: '1', years_since_last_promotion: '0', total_working_years: '2', num_companies_worked: '1', distance_from_home: '20', overtime: 'Yes', attrition: 'Yes', business_travel: 'Travel_Rarely' },
  { department: 'Research & Development', job_role: 'Laboratory Technician', age: '30', gender: 'Male', marital_status: 'Married', education: '3', education_field: 'Life Sciences', monthly_income: '3200', job_satisfaction: '3', environment_satisfaction: '3', work_life_balance: '2', performance_rating: '3', years_at_company: '4', years_in_current_role: '2', years_since_last_promotion: '1', total_working_years: '8', num_companies_worked: '2', distance_from_home: '8', overtime: 'No', attrition: 'No', business_travel: 'Travel_Rarely' },
];

const EXAMPLE_COLS = ['department', 'job_role', 'age', 'gender', 'monthly_income', 'job_satisfaction', 'overtime', 'attrition'];

const ExampleTable = () => (
  <div className="overflow-x-auto rounded-lg border border-blue-100 bg-blue-50/40">
    <table className="w-full text-xs">
      <thead className="bg-blue-100 text-blue-700">
        <tr>
          {EXAMPLE_COLS.map((h) => (
            <th key={h} className="px-3 py-2 text-left font-semibold whitespace-nowrap">{h}</th>
          ))}
        </tr>
      </thead>
      <tbody className="divide-y divide-blue-50">
        {EXAMPLE_ROWS.map((row, i) => (
          <tr key={i} className="hover:bg-blue-50 transition-colors">
            {EXAMPLE_COLS.map((h) => (
              <td key={h} className="px-3 py-1.5 text-gray-700 whitespace-nowrap">{row[h]}</td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
    <p className="px-3 py-1.5 text-xs text-blue-500 italic border-t border-blue-100">
      La plantilla contiene {Object.keys(EXAMPLE_ROWS[0]).length} columnas en total. Aquí se muestran las principales.
    </p>
  </div>
);

const ImportModal = ({ onClose, onImported }) => {
  const fileRef = useRef(null);
  const [step, setStep]       = useState('idle'); // idle | preview | importing | done | error
  const [parsed, setParsed]   = useState(null);
  const [errors, setErrors]   = useState([]);
  const [progress, setProgress] = useState('');
  const [showExample, setShowExample] = useState(false);

  const handleFile = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!file.name.endsWith('.csv')) {
      setErrors(['Solo se aceptan archivos .csv']);
      setStep('error');
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => {
      const result = parseCsv(ev.target.result);
      setParsed(result);
      setErrors(result.errors);
      setStep('preview');
    };
    reader.readAsText(file);
  };

  const handleImport = async () => {
    if (!parsed || parsed.rows.length === 0) return;
    setStep('importing');
    setProgress('Enviando datos...');
    try {
      const { data } = await api.post('/employees/import', { rows: parsed.rows });
      setProgress(`${data.imported} empleados importados correctamente.`);
      setStep('done');
      onImported?.();
    } catch (err) {
      setErrors([err.response?.data?.message ?? 'Error al importar. Intenta de nuevo.']);
      setStep('error');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-2xl rounded-xl bg-white shadow-xl">

        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <h2 className="text-base font-semibold text-gray-800">Importar empleados desde CSV</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-lg leading-none">✕</button>
        </div>

        <div className="px-6 py-5 space-y-4">

          {/* Paso 1: seleccionar archivo */}
          {(step === 'idle' || step === 'preview' || step === 'error') && (
            <div>
              <p className="mb-1 text-sm text-gray-600">
                Seleccioná un archivo <code className="rounded bg-gray-100 px-1">.csv</code> con los datos de los empleados.
              </p>
              <div className="mb-3 flex items-center gap-3">
                <a
                  href="/plantilla_empleados.csv"
                  download
                  className="text-xs text-blue-600 underline hover:text-blue-800"
                >
                  Descargar plantilla
                </a>
                <span className="text-gray-300">|</span>
                <button
                  type="button"
                  onClick={() => setShowExample((v) => !v)}
                  className="text-xs text-blue-600 underline hover:text-blue-800"
                >
                  {showExample ? 'Ocultar ejemplo' : 'Ver ejemplo de datos'}
                </button>
              </div>

              {showExample && (
                <div className="mb-1">
                  <p className="mb-1.5 text-xs font-medium text-gray-500 uppercase tracking-wide">
                    Datos de ejemplo incluidos en la plantilla
                  </p>
                  <ExampleTable />
                </div>
              )}
              <input
                ref={fileRef}
                type="file"
                accept=".csv"
                onChange={handleFile}
                className="block w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
              />
            </div>
          )}

          {/* Errores de validación */}
          {errors.length > 0 && (
            <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700 max-h-40 overflow-y-auto space-y-1">
              <p className="font-semibold mb-1">Se encontraron {errors.length} problema(s):</p>
              {errors.map((e, i) => <p key={i}>• {e}</p>)}
            </div>
          )}

          {/* Preview de datos */}
          {step === 'preview' && parsed && parsed.rows.length > 0 && (
            <div>
              <p className="mb-2 text-sm text-gray-600">
                <span className="font-medium text-green-700">{parsed.rows.length} filas</span> listas para importar
                {errors.length > 0 && <span className="ml-2 text-amber-600">({errors.length} advertencias)</span>}
              </p>
              <div className="overflow-x-auto rounded-lg border border-gray-100">
                <table className="w-full text-xs">
                  <thead className="bg-gray-50 text-gray-500">
                    <tr>
                      {['department','job_role','age','gender','monthly_income','job_satisfaction','overtime'].map((h) => (
                        <th key={h} className="px-3 py-2 text-left font-medium">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {parsed.rows.slice(0, 5).map((row, i) => (
                      <tr key={i} className="hover:bg-gray-50">
                        {['department','job_role','age','gender','monthly_income','job_satisfaction','overtime'].map((h) => (
                          <td key={h} className="px-3 py-1.5 text-gray-700">{row[h]}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {parsed.rows.length > 5 && (
                <p className="mt-1 text-xs text-gray-400">... y {parsed.rows.length - 5} filas más</p>
              )}
            </div>
          )}

          {/* Estado importando */}
          {step === 'importing' && (
            <div className="flex items-center gap-3 text-sm text-gray-600">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
              {progress}
            </div>
          )}

          {/* Resultado final */}
          {step === 'done' && (
            <div className="rounded-lg bg-green-50 p-3 text-sm text-green-700">{progress}</div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 border-t border-gray-100 px-6 py-4">
          <button
            onClick={onClose}
            className="rounded-lg border border-gray-200 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50"
          >
            {step === 'done' ? 'Cerrar' : 'Cancelar'}
          </button>
          {step === 'preview' && errors.length === 0 && (
            <button
              onClick={handleImport}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              Importar {parsed?.rows.length} empleados
            </button>
          )}
        </div>
      </div>
    </div>
  );
};


// ─── Página principal ─────────────────────────────────────────────────────────

export default function Employees() {
  const navigate  = useNavigate();
  const location  = useLocation();
  const [employees, setEmployees] = useState([]);
  const [meta, setMeta]           = useState({ total: 0, page: 1, total_pages: 1 });
  const [loading, setLoading]     = useState(true);
  const [currency, setCurrency]   = useState('USD'); // 'USD' | 'GS'
  const [showImport, setShowImport] = useState(false);

  const initialRiskLevel = new URLSearchParams(location.search).get('risk_level') ?? '';

  const [filters, setFilters] = useState({
    page:       1,
    page_size:  20,
    search:     '',
    department: '',
    risk_level: initialRiskLevel,
    attrition:  '',
  });

  const fetchEmployees = useCallback(async (f) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (f.page)       params.set('page', f.page);
      if (f.page_size)  params.set('page_size', f.page_size);
      if (f.search)     params.set('search', f.search);
      if (f.department) params.set('department', f.department);
      if (f.risk_level) params.set('risk_level', f.risk_level);
      if (f.attrition)  params.set('attrition', f.attrition === 'true');

      const { data } = await api.get(`/employees?${params.toString()}`);
      setEmployees(data.data);
      setMeta({ total: data.total, page: data.page, total_pages: data.total_pages });
    } catch {
      setEmployees([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchEmployees(filters); }, [filters, fetchEmployees]);

  const setFilter = (key, value) =>
    setFilters((prev) => ({ ...prev, [key]: value, page: 1 }));

  const setPage = (p) => setFilters((prev) => ({ ...prev, page: p }));

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-auto">
        <Navbar title="Empleados — Dataset IBM HR" />
        <main className="flex-1 p-6">

          {/* ── Barra de herramientas ── */}
          <div className="mb-4 flex flex-wrap items-center gap-3">

            {/* Filtros */}
            <input
              type="text"
              placeholder="Buscar por rol o departamento…"
              value={filters.search}
              onChange={(e) => setFilter('search', e.target.value)}
              className="rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100 w-64"
            />
            <select
              value={filters.department}
              onChange={(e) => setFilter('department', e.target.value)}
              className="rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-blue-400 focus:outline-none"
            >
              <option value="">Todos los departamentos</option>
              <option value="Sales">Ventas</option>
              <option value="Research & Development">I+D</option>
              <option value="Human Resources">Recursos Humanos</option>
            </select>
            <select
              value={filters.risk_level}
              onChange={(e) => setFilter('risk_level', e.target.value)}
              className="rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-blue-400 focus:outline-none"
            >
              <option value="">Todos los riesgos</option>
              <option value="ALTO">Riesgo Alto</option>
              <option value="MEDIO">Riesgo Medio</option>
              <option value="BAJO">Riesgo Bajo</option>
            </select>
            <select
              value={filters.attrition}
              onChange={(e) => setFilter('attrition', e.target.value)}
              className="rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-blue-400 focus:outline-none"
            >
              <option value="">Todos</option>
              <option value="true">Renunciaron</option>
              <option value="false">Permanecieron</option>
            </select>

            <div className="ml-auto flex items-center gap-2">
              {/* Toggle de moneda */}
              <div className="flex rounded-lg border border-gray-200 overflow-hidden text-xs font-medium">
                <button
                  onClick={() => setCurrency('USD')}
                  className={`px-3 py-1.5 transition-colors ${currency === 'USD' ? 'bg-blue-600 text-white' : 'text-gray-500 hover:bg-gray-50'}`}
                >
                  USD
                </button>
                <button
                  onClick={() => setCurrency('GS')}
                  className={`px-3 py-1.5 transition-colors ${currency === 'GS' ? 'bg-blue-600 text-white' : 'text-gray-500 hover:bg-gray-50'}`}
                >
                  GS
                </button>
              </div>

              {/* Botón importar */}
              <button
                onClick={() => setShowImport(true)}
                className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-2 text-xs font-medium text-white hover:bg-blue-700 transition-colors"
              >
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M12 12v8m0-8l-3 3m3-3l3 3M12 4v4" />
                </svg>
                Importar CSV
              </button>

              <span className="text-sm text-gray-400">{meta.total} empleados</span>
            </div>
          </div>


          {/* ── Tabla ── */}
          <div className="rounded-xl bg-white shadow-sm overflow-hidden">
            {loading ? (
              <div className="flex justify-center py-20">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent" />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-xs uppercase text-gray-500">
                    <tr>
                      <th className="px-4 py-3 text-left">#</th>
                      <th className="px-4 py-3 text-left">Rol / Cargo</th>
                      <th className="px-4 py-3 text-left">Departamento</th>
                      {/* Datos personales */}
                      <th className="px-4 py-3 text-left">Edad</th>
                      <th className="px-4 py-3 text-left">Género</th>
                      <th className="px-4 py-3 text-left">Estado civil</th>
                      <th className="px-4 py-3 text-left">Educación</th>
                      {/* Datos laborales */}
                      <th className="px-4 py-3 text-left">Antigüedad</th>
                      <th
                        className="px-4 py-3 text-left cursor-pointer select-none"
                        title="Ingreso mensual. Usa el toggle USD/GS para cambiar moneda."
                      >
                        Ingreso ({currency === 'GS' ? 'Gs.' : 'USD'})
                      </th>
                      {/*
                        Satisfacción: escala 1-4 del dataset IBM HR.
                        1=Muy baja, 2=Baja, 3=Alta, 4=Muy alta.
                        Pasá el mouse por el badge para ver la descripción completa.
                      */}
                      <th
                        className="px-4 py-3 text-left cursor-help"
                        title="Satisfacción laboral (escala 1-4): 1=Muy baja, 2=Baja, 3=Alta, 4=Muy alta"
                      >
                        Satisfacción ⓘ
                      </th>
                      <th className="px-4 py-3 text-left">Horas extra</th>
                      <th className="px-4 py-3 text-left">Attrition</th>
                      <th className="px-4 py-3 text-left">Riesgo fuga</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {employees.map((emp) => (
                      <tr
                        key={emp.id}
                        onClick={() => navigate(`/employees/${emp.id}`)}
                        className="cursor-pointer hover:bg-blue-50 transition-colors"
                      >
                        <td className="px-4 py-3 text-gray-400 text-xs">{emp.id}</td>
                        <td className="px-4 py-3 font-medium text-gray-900">{emp.job_role}</td>
                        <td className="px-4 py-3 text-gray-600">{emp.department}</td>
                        {/* Datos personales */}
                        <td className="px-4 py-3 text-gray-600">{emp.age}</td>
                        <td className="px-4 py-3 text-gray-600">{emp.gender}</td>
                        <td className="px-4 py-3 text-gray-600">{emp.marital_status}</td>
                        <td className="px-4 py-3 text-gray-600 text-xs">{emp.education_field}</td>
                        {/* Datos laborales */}
                        <td className="px-4 py-3 text-gray-600">{emp.years_at_company} años</td>
                        <td className="px-4 py-3 text-gray-700 font-medium tabular-nums">
                          {formatIncome(emp.monthly_income, currency === 'GS')}
                        </td>
                        <td className="px-4 py-3">
                          <SatisfactionCell value={emp.job_satisfaction} />
                        </td>
                        <td className="px-4 py-3">
                          {emp.overtime
                            ? <span className="text-amber-600 font-medium">Sí</span>
                            : <span className="text-gray-400">No</span>}
                        </td>
                        <td className="px-4 py-3">
                          {emp.attrition
                            ? <span className="rounded-full bg-red-50 px-2 py-0.5 text-xs text-red-600 font-medium">Renunció</span>
                            : <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-500">Permanece</span>}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <RiskBadge level={emp.risk_level} />
                            <span className="text-xs text-gray-400">
                              {(emp.flight_risk * 100).toFixed(0)}%
                            </span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* ── Paginación ── */}
            {!loading && meta.total_pages > 1 && (
              <div className="flex items-center justify-between border-t border-gray-100 px-4 py-3 text-sm text-gray-500">
                <span>Página {meta.page} de {meta.total_pages}</span>
                <div className="flex gap-2">
                  <button
                    onClick={() => setPage(meta.page - 1)}
                    disabled={meta.page <= 1}
                    className="rounded px-3 py-1 hover:bg-gray-100 disabled:opacity-40"
                  >
                    ← Anterior
                  </button>
                  <button
                    onClick={() => setPage(meta.page + 1)}
                    disabled={meta.page >= meta.total_pages}
                    className="rounded px-3 py-1 hover:bg-gray-100 disabled:opacity-40"
                  >
                    Siguiente →
                  </button>
                </div>
              </div>
            )}
          </div>

        </main>
      </div>

      {/* Modal de importación */}
      {showImport && (
        <ImportModal
          onClose={() => setShowImport(false)}
          onImported={() => {
            setShowImport(false);
            fetchEmployees(filters);
          }}
        />
      )}
    </div>
  );
}
