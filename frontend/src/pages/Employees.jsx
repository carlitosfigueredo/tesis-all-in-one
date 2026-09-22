import { useEffect, useState, useCallback, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import Sidebar from '../components/layout/Sidebar';
import Navbar from '../components/layout/Navbar';
import CsvImportGuide from '../components/employees/CsvImportGuide';
import ImportResults from '../components/employees/ImportResults';
import api from '../services/api';

// ─── Constantes ───────────────────────────────────────────────────────────────

// Etiquetas legibles para la escala 1-5 de satisfacción
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
      title={`Satisfacción laboral: ${meta.text} (${value}/5)\nEscala: 1=Muy baja, 2=Baja, 3=Media, 4=Alta, 5=Muy alta`}
      className={`cursor-default rounded-full px-2 py-0.5 text-xs font-medium ${meta.bg} ${meta.color}`}
    >
      {meta.text}
    </span>
  );
};

// ─── Modal de importación CSV ─────────────────────────────────────────────────

/**
 * Valida una fila del CSV contra los campos requeridos del dataset IBM HR.
 * Retorna un array de errores (vacío = fila válida).
 */
const validateCsvRow = (row, lineNum) => {
  const errors = [];
  const required = ['codigo_empleado', 'nombre', 'apellido',
                    'rol_tecnologico', 'seniority', 'edad', 'salario_mensual',
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
  { codigo_empleado: 'EMP-001', nombre: 'Carla', apellido: 'Gimenez', edad: '28', nivel_formacion: 'Universitario', rol_tecnologico: 'Backend', seniority: 'Semi-Senior', antiguedad_meses: '18', modalidad_trabajo: 'Hibrido', tipo_contrato: 'Indefinido', salario_mensual: '8500000', cantidad_horas_extra_mes: '10', capacitacion_ultimo_anio: 'Si', evaluacion_desempeno: '4', cantidad_empresas_anteriores: '2', satisfaccion_laboral: '3', satisfaccion_ambiente: '4', equilibrio_vida_trabajo: '3', estancamiento_carrera: '2', feedback_lider: '4' },
  { codigo_empleado: 'EMP-002', nombre: 'Diego', apellido: 'Rojas', edad: '24', nivel_formacion: 'Tecnico', rol_tecnologico: 'Frontend', seniority: 'Junior', antiguedad_meses: '6', modalidad_trabajo: 'Remoto', tipo_contrato: 'Plazo fijo', salario_mensual: '5000000', cantidad_horas_extra_mes: '20', capacitacion_ultimo_anio: 'No', evaluacion_desempeno: '3', cantidad_empresas_anteriores: '1', satisfaccion_laboral: '2', satisfaccion_ambiente: '2', equilibrio_vida_trabajo: '2', estancamiento_carrera: '4', feedback_lider: '2' },
  { codigo_empleado: 'EMP-003', nombre: 'Sofia', apellido: 'Benitez', edad: '35', nivel_formacion: 'Posgrado', rol_tecnologico: 'DevOps', seniority: 'Senior', antiguedad_meses: '48', modalidad_trabajo: 'Presencial', tipo_contrato: 'Indefinido', salario_mensual: '16000000', cantidad_horas_extra_mes: '5', capacitacion_ultimo_anio: 'Si', evaluacion_desempeno: '5', cantidad_empresas_anteriores: '3', satisfaccion_laboral: '4', satisfaccion_ambiente: '5', equilibrio_vida_trabajo: '4', estancamiento_carrera: '1', feedback_lider: '5' },
  { codigo_empleado: 'EMP-004', nombre: 'Matias', apellido: 'Fernandez', edad: '22', nivel_formacion: 'Universitario', rol_tecnologico: 'QA', seniority: 'Trainee', antiguedad_meses: '3', modalidad_trabajo: 'Hibrido', tipo_contrato: 'Eventual', salario_mensual: '3500000', cantidad_horas_extra_mes: '25', capacitacion_ultimo_anio: 'No', evaluacion_desempeno: '3', cantidad_empresas_anteriores: '0', satisfaccion_laboral: '1', satisfaccion_ambiente: '2', equilibrio_vida_trabajo: '1', estancamiento_carrera: '3', feedback_lider: '2' },
  { codigo_empleado: 'EMP-005', nombre: 'Lucia', apellido: 'Ayala', edad: '30', nivel_formacion: 'Universitario', rol_tecnologico: 'Fullstack', seniority: 'Semi-Senior', antiguedad_meses: '24', modalidad_trabajo: 'Remoto', tipo_contrato: 'Indefinido', salario_mensual: '10000000', cantidad_horas_extra_mes: '8', capacitacion_ultimo_anio: 'Si', evaluacion_desempeno: '4', cantidad_empresas_anteriores: '2', satisfaccion_laboral: '4', satisfaccion_ambiente: '4', equilibrio_vida_trabajo: '4', estancamiento_carrera: '2', feedback_lider: '4' },
];

const EXAMPLE_COLS = ['codigo_empleado', 'nombre', 'apellido', 'rol_tecnologico', 'seniority', 'salario_mensual', 'satisfaccion_laboral'];

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

const ImportModal = ({ onClose, onImported, onVerEmpleados }) => {
  const fileRef = useRef(null);
  const [step, setStep]       = useState('idle'); // idle | preview | importing | done | error | guide
  const [parsed, setParsed]   = useState(null);
  const [errors, setErrors]   = useState([]);
  const [progress, setProgress] = useState('');
  const [showExample, setShowExample] = useState(false);
  const [showGuide, setShowGuide] = useState(false);
  const [results, setResults] = useState(null); // { summary, employees } tras importar
  const [deactivateAbsent, setDeactivateAbsent] = useState(false); // checkbox opt-in de bajas
  const [pendingDeactivation, setPendingDeactivation] = useState(null); // { bajasPendientes, umbralPorcentaje } cuando supera umbral

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
      const { data } = await api.post('/employees/import', {
        rows: parsed.rows,
        deactivateAbsent,
      }, {
        // La importación predice el riesgo de cada empleado con el ML y genera
        // estrategias: con muchos registros puede tardar más que el timeout
        // global (30s). Le damos hasta 5 minutos a esta operación.
        timeout: 5 * 60 * 1000,
      });
      const payload = data.data ?? data;
      setResults({
        summary: payload.summary ?? null,
        employees: payload.employees ?? [],
        creados: payload.creados ?? 0,
        actualizados: payload.actualizados ?? 0,
        dadosDeBaja: payload.dadosDeBaja ?? 0,
        recalculo: payload.recalculo ?? null,
      });
      onImported?.();

      // Si hay bajas que superan el umbral, primero pedir confirmacion.
      if (payload.needsConfirmation && (payload.bajasPendientes?.length ?? 0) > 0) {
        setPendingDeactivation({
          bajasPendientes: payload.bajasPendientes,
          umbralPorcentaje: payload.umbralPorcentaje,
        });
        setStep('confirmDeactivation');
      } else {
        setStep('done');
      }
    } catch (err) {
      setErrors([err.response?.data?.message ?? 'Error al importar. Intenta de nuevo.']);
      setStep('error');
    }
  };

  // Aplica las bajas que el usuario confirmo (2do paso, tras superar el umbral).
  const handleConfirmDeactivation = async () => {
    const codigos = (pendingDeactivation?.bajasPendientes ?? []).map((e) => e.codigo_empleado);
    if (codigos.length === 0) { setStep('done'); return; }
    setStep('importing');
    setProgress('Aplicando bajas...');
    try {
      await api.post('/employees/deactivate-absent', { codigos });
      onImported?.();
      setStep('done');
    } catch (err) {
      setErrors([err.response?.data?.message ?? 'Error al dar de baja. Intenta de nuevo.']);
      setStep('error');
    }
  };

  // El usuario decide NO dar de baja: los ausentes quedan activos.
  const handleSkipDeactivation = () => {
    setPendingDeactivation(null);
    setStep('done');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-2xl rounded-xl bg-white shadow-xl">

        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <h2 className="text-base font-semibold text-gray-800">
            {step === 'done' ? 'Resultados de la importación' : 'Importar empleados desde CSV'}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-lg leading-none">✕</button>
        </div>

        <div className="px-6 py-5 space-y-4">

          {/* Pantalla de resultados post-importación (guía de lo que pasó) */}
          {step === 'done' && (
            <ImportResults
              summary={results?.summary}
              employees={results?.employees ?? []}
              creados={results?.creados}
              actualizados={results?.actualizados}
              dadosDeBaja={results?.dadosDeBaja}
              onClose={onClose}
              onVerEmpleados={onVerEmpleados}
            />
          )}

          {/* Guia paso a paso */}
          {step !== 'done' && showGuide && (
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
                      {['codigo_empleado','nombre','apellido','rol_tecnologico','seniority','salario_mensual','satisfaccion_laboral'].map((h) => (
                        <th key={h} className="px-3 py-2 text-left font-medium">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {parsed.rows.slice(0, 5).map((row, i) => (
                      <tr key={i} className="hover:bg-gray-50">
                        {['codigo_empleado','nombre','apellido','rol_tecnologico','seniority','salario_mensual','satisfaccion_laboral'].map((h) => (
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

              {/* Opción de baja de ausentes (desactivada por defecto) */}
              <label className="mt-4 flex cursor-pointer items-start gap-2 rounded-lg border border-gray-200 bg-gray-50 p-3">
                <input
                  type="checkbox"
                  checked={deactivateAbsent}
                  onChange={(e) => setDeactivateAbsent(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-xs text-gray-600">
                  <span className="font-medium text-gray-700">Marcar como inactivos a los empleados que no estén en este archivo.</span>
                  <br />
                  Actívalo solo si este CSV contiene a <strong>toda</strong> tu plantilla actual. Si subís
                  una lista parcial, dejalo sin marcar para no dar de baja a quienes faltan.
                </span>
              </label>
            </div>
          )}

          {/* Confirmación de bajas que superan el umbral de seguridad */}
          {step === 'confirmDeactivation' && pendingDeactivation && (
            <div className="space-y-3">
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
                <div className="flex items-start gap-3">
                  <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-amber-500 text-white">
                    !
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-amber-800">Confirmá antes de dar de baja</h3>
                    <p className="mt-1 text-xs text-amber-700">
                      Los datos se importaron correctamente. Pero{' '}
                      <strong>{pendingDeactivation.bajasPendientes.length} empleado(s)</strong> que estaban
                      activos no aparecen en este archivo. Eso es más del {pendingDeactivation.umbralPorcentaje}%
                      de tu plantilla, así que preferimos confirmarlo con vos antes de marcarlos como inactivos.
                    </p>
                  </div>
                </div>
              </div>

              <p className="text-xs font-medium text-gray-500">Se marcarían como inactivos:</p>
              <div className="max-h-56 space-y-1 overflow-y-auto rounded-lg border border-gray-100 p-2">
                {pendingDeactivation.bajasPendientes.map((e) => (
                  <div key={e.id} className="flex items-center justify-between px-2 py-1 text-sm">
                    <span className="text-gray-700">
                      {e.nombre} {e.apellido}
                      <span className="ml-1.5 text-xs text-gray-400">{e.rol_tecnologico} · {e.seniority}</span>
                    </span>
                    <span className="text-xs text-gray-400">{e.codigo_empleado}</span>
                  </div>
                ))}
              </div>

              <p className="text-xs text-gray-500">
                Si fue un archivo parcial y no querés dar de baja a nadie, elegí “No dar de baja”.
              </p>
            </div>
          )}

          {/* Estado importando */}
          {step === 'importing' && (
            <div className="flex items-center gap-3 text-sm text-gray-600">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
              {progress}
            </div>
          )}

        </div>

        {/* Footer — oculto en la pantalla de resultados (tiene su propia navegación) */}
        {step !== 'done' && (
          <div className="flex justify-end gap-3 border-t border-gray-100 px-6 py-4">
            {step === 'confirmDeactivation' ? (
              <>
                <button
                  onClick={handleSkipDeactivation}
                  className="rounded-lg border border-gray-200 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50"
                >
                  No dar de baja
                </button>
                <button
                  onClick={handleConfirmDeactivation}
                  className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
                >
                  Sí, dar de baja {pendingDeactivation?.bajasPendientes.length}
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={onClose}
                  className="rounded-lg border border-gray-200 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50"
                >
                  Cancelar
                </button>
                {step === 'preview' && errors.length === 0 && (
                  <button
                    onClick={handleImport}
                    className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
                  >
                    Importar {parsed?.rows.length} empleados
                  </button>
                )}
              </>
            )}
          </div>
        )}
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
  const [predicting, setPredicting] = useState(false);
  const [predictMsg, setPredictMsg] = useState(null); // { type: 'ok'|'error'|'warn', text }

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

  // ── Predecir riesgo (paso aparte de la importación) ──
  // Llama a /employees/recalculate, que usa el modelo entrenado de la empresa.
  const handlePredecir = async () => {
    setPredicting(true);
    setPredictMsg(null);
    try {
      const { data } = await api.post('/employees/recalculate', {}, { timeout: 5 * 60 * 1000 });
      setPredictMsg({ type: 'ok', text: data.message ?? 'Predicción completada.' });
      fetchEmployees(filters); // refrescar la lista con el riesgo nuevo
    } catch (e) {
      const status = e.response?.status;
      const code = e.response?.data?.code;
      if (status === 409 || code === 'MODEL_NOT_TRAINED') {
        setPredictMsg({
          type: 'warn',
          text: 'Tu empresa todavía no tiene un modelo entrenado. Entrená el modelo en "Modelo ML" antes de predecir.',
        });
      } else if (status === 429) {
        setPredictMsg({ type: 'warn', text: e.response?.data?.message ?? 'Todavía no podés recalcular según tu plan.' });
      } else {
        setPredictMsg({ type: 'error', text: e.response?.data?.message ?? 'No se pudo completar la predicción.' });
      }
    } finally {
      setPredicting(false);
    }
  };

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-auto bg-gray-50 dark:bg-gray-900 transition-colors">
        <Navbar title="Empleados — Predicción de Deserción" />
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

              {/* Botón predecir */}
              <button
                onClick={handlePredecir}
                disabled={predicting || meta.total === 0}
                title={meta.total === 0 ? 'Primero importá empleados' : 'Calcular el riesgo con el modelo de tu empresa'}
                className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-2 text-xs font-medium text-white hover:bg-indigo-700 transition-colors disabled:cursor-not-allowed disabled:opacity-50"
              >
                {predicting ? (
                  <>
                    <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    Prediciendo...
                  </>
                ) : (
                  <>
                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                    Predecir
                  </>
                )}
              </button>

              <span className="text-sm text-gray-400 dark:text-gray-500">{meta.total} empleados</span>
            </div>
          </div>

          {/* Mensaje de resultado de la predicción */}
          {predictMsg && (
            <div className={`mb-4 rounded-lg px-4 py-3 text-sm ${
              predictMsg.type === 'ok' ? 'border border-green-200 bg-green-50 text-green-700'
              : predictMsg.type === 'warn' ? 'border border-amber-200 bg-amber-50 text-amber-700'
              : 'border border-red-200 bg-red-50 text-red-700'
            }`}>
              {predictMsg.text}
            </div>
          )}


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
                      <th className="px-4 py-3 text-left">Empleado</th>
                      <th className="px-4 py-3 text-left">Rol</th>
                      <th className="px-4 py-3 text-left">Seniority</th>
                      <th className="px-4 py-3 text-left">Edad</th>
                      <th className="px-4 py-3 text-left">Modalidad</th>
                      <th className="px-4 py-3 text-left">Contrato</th>
                      <th className="px-4 py-3 text-left">Antigüedad</th>
                      <th className="px-4 py-3 text-left">Salario (Gs.)</th>
                      <th className="px-4 py-3 text-left">Hs. Extra/mes</th>
                      <th
                        className="px-4 py-3 text-left cursor-help"
                        title="Satisfacción laboral (escala 1-5): 1=Muy baja, 5=Muy alta"
                      >
                        Satisfacción
                      </th>
                      <th className="px-4 py-3 text-left">Deserción</th>
                      <th className="px-4 py-3 text-left">Riesgo</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                    {employees.map((emp, idx) => (
                      <tr
                        key={emp.id}
                        onClick={() => navigate(`/employees/${emp.id}`)}
                        className="cursor-pointer hover:bg-blue-50 dark:hover:bg-gray-700/50 transition-colors"
                      >
                        <td className="px-4 py-3 text-gray-400 dark:text-gray-500 tabular-nums">
                          {(meta.page - 1) * filters.page_size + idx + 1}
                        </td>
                        <td className="px-4 py-3">
                          <div className="font-medium text-gray-900 dark:text-gray-100">
                            {emp.nombre} {emp.apellido}
                          </div>
                          <div className="text-xs text-gray-400 dark:text-gray-500">{emp.codigo_empleado}</div>
                        </td>
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
            // Refresca la tabla en segundo plano, pero deja el modal abierto
            // para que se muestre la pantalla de resultados.
            fetchEmployees(filters);
          }}
          onVerEmpleados={() => setShowImport(false)}
        />
      )}
    </div>
  );
}
