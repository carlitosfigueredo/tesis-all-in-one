import { useEffect, useState, useCallback, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import Sidebar from '../components/layout/Sidebar';
import Navbar from '../components/layout/Navbar';
import CsvImportGuide from '../components/employees/CsvImportGuide';
import api from '../services/api';

// ─── Constantes ───────────────────────────────────────────────────────────────

// Tasa de cambio referencial GS/USD — se puede mover a una variable de entorno
const USD_TO_GS = 7500;

// Etiquetas legibles para la escala 1-5 de satisfaccion
const SATISFACTION_LABELS = {
  1: { text: 'Muy baja',  color: 'text-red-600',   bg: 'bg-red-50'    },
  2: { text: 'Baja',      color: 'text-orange-600', bg: 'bg-orange-50' },
  3: { text: 'Media',     color: 'text-blue-600',   bg: 'bg-blue-50'   },
  4: { text: 'Alta',      color: 'text-green-600',  bg: 'bg-green-50'  },
  5: { text: 'Muy alta',  color: 'text-emerald-600', bg: 'bg-emerald-50' },
};

// ─── Componentes de UI ────────────────────────────────────────────────────────

const RiskBadge = ({ level }) => {
  const styles = {
    CRITICO: 'bg-red-200 text-red-800',
    ALTO:    'bg-red-100 text-red-700',
    MEDIO:   'bg-amber-100 text-amber-700',
    BAJO:    'bg-green-100 text-green-700',
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
      title={`Satisfaccion laboral: ${meta.text} (${value}/5)\nEscala: 1=Muy baja, 2=Baja, 3=Media, 4=Alta, 5=Muy alta`}
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
  const required = ['rol_tecnologico', 'seniority', 'edad', 'salario_mensual',
                    'antiguedad_meses', 'modalidad_trabajo', 'tipo_contrato'];

  for (const field of required) {
    if (row[field] === undefined || row[field] === '') {
      errors.push(`Linea ${lineNum}: falta el campo "${field}"`);
    }
  }

  const edad = Number(row.edad);
  if (!isNaN(edad) && (edad < 18 || edad > 65)) {
    errors.push(`Linea ${lineNum}: edad fuera de rango (18-65)`);
  }

  const salario = Number(row.salario_mensual);
  if (!isNaN(salario) && salario < 0) {
    errors.push(`Linea ${lineNum}: salario no puede ser negativo`);
  }

  const sat = Number(row.satisfaccion_laboral);
  if (row.satisfaccion_laboral !== '' && row.satisfaccion_laboral !== undefined && (sat < 1 || sat > 5 || isNaN(sat))) {
    errors.push(`Linea ${lineNum}: satisfaccion_laboral debe ser 1 a 5`);
  }

  const validRoles = ['Frontend', 'Backend', 'Fullstack', 'Mobile', 'DevOps', 'QA', 'Data'];
  if (row.rol_tecnologico && !validRoles.includes(row.rol_tecnologico)) {
    errors.push(`Linea ${lineNum}: rol_tecnologico invalido ("${row.rol_tecnologico}")`);
  }

  const validSeniority = ['Trainee', 'Junior', 'Semi-Senior', 'Senior', 'Lead'];
  if (row.seniority && !validSeniority.includes(row.seniority)) {
    errors.push(`Linea ${lineNum}: seniority invalido ("${row.seniority}")`);
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


// Datos de ejemplo para la plantilla CSV
const EXAMPLE_ROWS = [
  { edad: '28', nivel_formacion: 'Universitario', rol_tecnologico: 'Backend', seniority: 'Semi-Senior', antiguedad_meses: '18', modalidad_trabajo: 'Hibrido', tipo_contrato: 'Indefinido', salario_mensual: '8500000', cantidad_horas_extra_mes: '10', capacitacion_ultimo_anio: 'Si', evaluacion_desempeno: '4', cantidad_empresas_anteriores: '2', satisfaccion_laboral: '3', satisfaccion_ambiente: '4', equilibrio_vida_trabajo: '3', estancamiento_carrera: '2', feedback_lider: '4' },
  { edad: '24', nivel_formacion: 'Tecnico', rol_tecnologico: 'Frontend', seniority: 'Junior', antiguedad_meses: '6', modalidad_trabajo: 'Remoto', tipo_contrato: 'Plazo fijo', salario_mensual: '5000000', cantidad_horas_extra_mes: '20', capacitacion_ultimo_anio: 'No', evaluacion_desempeno: '3', cantidad_empresas_anteriores: '1', satisfaccion_laboral: '2', satisfaccion_ambiente: '2', equilibrio_vida_trabajo: '2', estancamiento_carrera: '4', feedback_lider: '2' },
  { edad: '35', nivel_formacion: 'Posgrado', rol_tecnologico: 'DevOps', seniority: 'Senior', antiguedad_meses: '48', modalidad_trabajo: 'Presencial', tipo_contrato: 'Indefinido', salario_mensual: '16000000', cantidad_horas_extra_mes: '5', capacitacion_ultimo_anio: 'Si', evaluacion_desempeno: '5', cantidad_empresas_anteriores: '3', satisfaccion_laboral: '4', satisfaccion_ambiente: '5', equilibrio_vida_trabajo: '4', estancamiento_carrera: '1', feedback_lider: '5' },
  { edad: '22', nivel_formacion: 'Universitario', rol_tecnologico: 'QA', seniority: 'Trainee', antiguedad_meses: '3', modalidad_trabajo: 'Hibrido', tipo_contrato: 'Eventual', salario_mensual: '3500000', cantidad_horas_extra_mes: '25', capacitacion_ultimo_anio: 'No', evaluacion_desempeno: '3', cantidad_empresas_anteriores: '0', satisfaccion_laboral: '1', satisfaccion_ambiente: '2', equilibrio_vida_trabajo: '1', estancamiento_carrera: '3', feedback_lider: '2' },
  { edad: '30', nivel_formacion: 'Universitario', rol_tecnologico: 'Fullstack', seniority: 'Semi-Senior', antiguedad_meses: '24', modalidad_trabajo: 'Remoto', tipo_contrato: 'Indefinido', salario_mensual: '10000000', cantidad_horas_extra_mes: '8', capacitacion_ultimo_anio: 'Si', evaluacion_desempeno: '4', cantidad_empresas_anteriores: '2', satisfaccion_laboral: '4', satisfaccion_ambiente: '4', equilibrio_vida_trabajo: '4', estancamiento_carrera: '2', feedback_lider: '4' },
];

const EXAMPLE_COLS = ['rol_tecnologico', 'seniority', 'edad', 'salario_mensual', 'antiguedad_meses', 'modalidad_trabajo', 'satisfaccion_laboral'];

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
  const [step, setStep]       = useState('idle'); // idle | preview | importing | done | error | guide
  const [parsed, setParsed]   = useState(null);
  const [errors, setErrors]   = useState([]);
  const [progress, setProgress] = useState('');
  const [showExample, setShowExample] = useState(false);
  const [showGuide, setShowGuide] = useState(false);

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

          {/* Guia paso a paso */}
          {showGuide && (
            <CsvImportGuide onClose={() => setShowGuide(false)} />
          )}

          {/* Paso 1: seleccionar archivo */}
          {!showGuide && (step === 'idle' || step === 'preview' || step === 'error') && (
            <div>
              <div className="mb-3 flex items-center justify-between">
                <p className="text-sm text-gray-600">
                  Selecciona un archivo <code className="rounded bg-gray-100 px-1">.csv</code> con los datos de los empleados.
                </p>
                <button
                  type="button"
                  onClick={() => setShowGuide(true)}
                  className="flex items-center gap-1 rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-700 hover:bg-blue-100 transition-colors"
                >
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Guia paso a paso
                </button>
              </div>
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
                      {['rol_tecnologico','seniority','edad','salario_mensual','antiguedad_meses','modalidad_trabajo','satisfaccion_laboral'].map((h) => (
                        <th key={h} className="px-3 py-2 text-left font-medium">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {parsed.rows.slice(0, 5).map((row, i) => (
                      <tr key={i} className="hover:bg-gray-50">
                        {['rol_tecnologico','seniority','edad','salario_mensual','antiguedad_meses','modalidad_trabajo','satisfaccion_laboral'].map((h) => (
                          <td key={h} className="px-3 py-1.5 text-gray-700">{row[h]}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {parsed.rows.length > 5 && (
                <p className="mt-1 text-xs text-gray-400">... y {parsed.rows.length - 5} filas mas</p>
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
      <div className="flex flex-1 flex-col overflow-auto bg-gray-50 dark:bg-gray-900 transition-colors">
        <Navbar title="Empleados — Prediccion de Desercion" />
        <main className="flex-1 p-6">

          {/* ── Barra de herramientas ── */}
          <div className="mb-4 flex flex-wrap items-center gap-3">

            {/* Filtros */}
            <input
              type="text"
              placeholder="Buscar por rol o seniority..."
              value={filters.search}
              onChange={(e) => setFilter('search', e.target.value)}
              className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900 w-64"
            />
            <select
              value={filters.department}
              onChange={(e) => setFilter('department', e.target.value)}
              className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 focus:border-blue-400 focus:outline-none"
            >
              <option value="">Todos los roles</option>
              <option value="Frontend">Frontend</option>
              <option value="Backend">Backend</option>
              <option value="Fullstack">Fullstack</option>
              <option value="Mobile">Mobile</option>
              <option value="DevOps">DevOps</option>
              <option value="QA">QA</option>
              <option value="Data">Data</option>
            </select>
            <select
              value={filters.risk_level}
              onChange={(e) => setFilter('risk_level', e.target.value)}
              className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 focus:border-blue-400 focus:outline-none"
            >
              <option value="">Todos los riesgos</option>
              <option value="CRITICO">Critico</option>
              <option value="ALTO">Alto</option>
              <option value="MEDIO">Medio</option>
              <option value="BAJO">Bajo</option>
            </select>
            <select
              value={filters.attrition}
              onChange={(e) => setFilter('attrition', e.target.value)}
              className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 focus:border-blue-400 focus:outline-none"
            >
              <option value="">Todos</option>
              <option value="true">Desertaron</option>
              <option value="false">Permanecen</option>
            </select>

            <div className="ml-auto flex items-center gap-2">
              {/* Toggle de moneda */}
              <div className="flex rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden text-xs font-medium">
                <button
                  onClick={() => setCurrency('USD')}
                  className={`px-3 py-1.5 transition-colors ${currency === 'USD' ? 'bg-blue-600 text-white' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'}`}
                >
                  USD
                </button>
                <button
                  onClick={() => setCurrency('GS')}
                  className={`px-3 py-1.5 transition-colors ${currency === 'GS' ? 'bg-blue-600 text-white' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'}`}
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

              <span className="text-sm text-gray-400 dark:text-gray-500">{meta.total} empleados</span>
            </div>
          </div>


          {/* ── Tabla ── */}
          <div className="rounded-xl bg-white dark:bg-gray-800 shadow-sm overflow-hidden transition-colors">
            {loading ? (
              <div className="flex justify-center py-20">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent" />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 dark:bg-gray-700/50 text-xs uppercase text-gray-500 dark:text-gray-400">
                    <tr>
                      <th className="px-4 py-3 text-left">#</th>
                      <th className="px-4 py-3 text-left">Rol</th>
                      <th className="px-4 py-3 text-left">Seniority</th>
                      <th className="px-4 py-3 text-left">Edad</th>
                      <th className="px-4 py-3 text-left">Modalidad</th>
                      <th className="px-4 py-3 text-left">Contrato</th>
                      <th className="px-4 py-3 text-left">Antiguedad</th>
                      <th className="px-4 py-3 text-left">Salario (Gs.)</th>
                      <th className="px-4 py-3 text-left">Hs. Extra/mes</th>
                      <th
                        className="px-4 py-3 text-left cursor-help"
                        title="Satisfaccion laboral (escala 1-5): 1=Muy baja, 5=Muy alta"
                      >
                        Satisfaccion
                      </th>
                      <th className="px-4 py-3 text-left">Desercion</th>
                      <th className="px-4 py-3 text-left">Riesgo</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                    {employees.map((emp) => (
                      <tr
                        key={emp.id}
                        onClick={() => navigate(`/employees/${emp.id}`)}
                        className="cursor-pointer hover:bg-blue-50 dark:hover:bg-gray-700/50 transition-colors"
                      >
                        <td className="px-4 py-3 text-gray-400 dark:text-gray-500 text-xs">{emp.id}</td>
                        <td className="px-4 py-3 font-medium text-gray-900 dark:text-gray-100">{emp.rol_tecnologico}</td>
                        <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{emp.seniority}</td>
                        <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{emp.edad}</td>
                        <td className="px-4 py-3 text-gray-600 dark:text-gray-300 text-xs">{emp.modalidad_trabajo}</td>
                        <td className="px-4 py-3 text-gray-600 dark:text-gray-300 text-xs">{emp.tipo_contrato}</td>
                        <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{emp.antiguedad_meses} meses</td>
                        <td className="px-4 py-3 text-gray-700 dark:text-gray-200 font-medium tabular-nums">
                          {emp.salario_mensual?.toLocaleString('es-PY')}
                        </td>
                        <td className="px-4 py-3 text-gray-600">
                          {emp.cantidad_horas_extra_mes > 15
                            ? <span className="text-amber-600 font-medium">{emp.cantidad_horas_extra_mes}h</span>
                            : <span className="text-gray-500">{emp.cantidad_horas_extra_mes}h</span>}
                        </td>
                        <td className="px-4 py-3">
                          <SatisfactionCell value={emp.satisfaccion_laboral} />
                        </td>
                        <td className="px-4 py-3">
                          {emp.desercion_real
                            ? <span className="rounded-full bg-red-50 px-2 py-0.5 text-xs text-red-600 font-medium">Si</span>
                            : <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-500">No</span>}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <RiskBadge level={emp.nivel_riesgo} />
                            <span className="text-xs text-gray-400">
                              {(emp.riesgo_desercion * 100).toFixed(0)}%
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
              <div className="flex items-center justify-between border-t border-gray-100 dark:border-gray-700 px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
                <span>Página {meta.page} de {meta.total_pages}</span>
                <div className="flex gap-2">
                  <button
                    onClick={() => setPage(meta.page - 1)}
                    disabled={meta.page <= 1}
                    className="rounded px-3 py-1 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-40"
                  >
                    ← Anterior
                  </button>
                  <button
                    onClick={() => setPage(meta.page + 1)}
                    disabled={meta.page >= meta.total_pages}
                    className="rounded px-3 py-1 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-40"
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
