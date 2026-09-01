import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Sidebar from '../components/layout/Sidebar';
import Navbar from '../components/layout/Navbar';
import api from '../services/api';

// ─── Constantes ────────────────────────────────────────────────────────────────

const SATISFACTION_LABELS = {
  1: { text: 'Muy baja',  color: 'text-red-700',    bg: 'bg-red-50',     bar: 'bg-red-500'     },
  2: { text: 'Baja',      color: 'text-orange-700',  bg: 'bg-orange-50',  bar: 'bg-orange-400'  },
  3: { text: 'Media',     color: 'text-blue-700',    bg: 'bg-blue-50',    bar: 'bg-blue-500'    },
  4: { text: 'Alta',      color: 'text-green-700',   bg: 'bg-green-50',   bar: 'bg-green-500'   },
  5: { text: 'Muy alta',  color: 'text-emerald-700', bg: 'bg-emerald-50', bar: 'bg-emerald-500' },
};

const RiskGauge = ({ score }) => {
  const pct = Math.round(score * 100);
  const color =
    score >= 0.75 ? '#dc2626' :
    score >= 0.5 ? '#ef4444' :
    score >= 0.3 ? '#f59e0b' : '#22c55e';
  const label =
    score >= 0.75 ? 'RIESGO CRITICO' :
    score >= 0.5 ? 'RIESGO ALTO' :
    score >= 0.3 ? 'RIESGO MEDIO' : 'RIESGO BAJO';
  return (
    <div className="flex flex-col items-center">
      <svg viewBox="0 0 120 70" className="w-44">
        <path d="M10,60 A50,50 0 0,1 110,60" fill="none" stroke="#e5e7eb" strokeWidth="12" strokeLinecap="round" />
        <path
          d="M10,60 A50,50 0 0,1 110,60"
          fill="none"
          stroke={color}
          strokeWidth="12"
          strokeLinecap="round"
          strokeDasharray={`${(pct / 100) * 157} 157`}
        />
        <text x="60" y="58" textAnchor="middle" fontSize="18" fontWeight="bold" fill={color}>
          {pct}%
        </text>
      </svg>
      <span
        className="mt-1 rounded-full px-3 py-0.5 text-xs font-bold"
        style={{ background: color + '20', color }}
      >
        {label}
      </span>
    </div>
  );
};

const Field = ({ label, value, highlight }) => (
  <div className={`rounded-lg p-3 ${highlight ? 'bg-red-50' : 'bg-gray-50'}`}>
    <p className="text-xs text-gray-500">{label}</p>
    <p className={`mt-0.5 font-semibold ${highlight ? 'text-red-700' : 'text-gray-800'}`}>{value}</p>
  </div>
);

const SatisfactionBar = ({ label, value, max = 5, hint }) => {
  const meta  = SATISFACTION_LABELS[value] ?? SATISFACTION_LABELS[1];
  const pct   = (value / max) * 100;
  return (
    <div>
      <div className="mb-1 flex items-center justify-between gap-2">
        <div className="min-w-0">
          <span className="text-xs text-gray-600 font-medium">{label}</span>
          {hint && <span className="ml-1 text-xs text-gray-400">({hint})</span>}
        </div>
        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full flex-shrink-0 ${meta.bg} ${meta.color}`}>
          {meta.text}
        </span>
      </div>
      <div className="h-2 rounded-full bg-gray-100">
        <div className={`h-2 rounded-full transition-all ${meta.bar}`} style={{ width: `${pct}%` }} />
      </div>
      <div className="mt-0.5 flex justify-between text-xs text-gray-300">
        <span>Muy baja</span>
        <span>{value}/{max}</span>
        <span>Muy alta</span>
      </div>
    </div>
  );
};

export default function EmployeeDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [emp, setEmp]         = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');

  useEffect(() => {
    api.get(`/employees/${id}`)
      .then(({ data }) => setEmp(data.data))
      .catch(() => setError('No se encontró el empleado.'))
      .finally(() => setLoading(false));
  }, [id]);

  const riskFactors = emp ? [
    { label: 'Horas extra/mes',         risk: emp.cantidad_horas_extra_mes > 15,     text: `${emp.cantidad_horas_extra_mes}h/mes` },
    { label: 'Estancamiento carrera',    risk: emp.estancamiento_carrera >= 4,        text: `${emp.estancamiento_carrera}/5` },
    { label: 'Satisfacción laboral',     risk: emp.satisfaccion_laboral <= 2,         text: `${emp.satisfaccion_laboral}/5` },
    { label: 'Equilibrio vida-trabajo',  risk: emp.equilibrio_vida_trabajo <= 2,      text: `${emp.equilibrio_vida_trabajo}/5` },
    { label: 'Capacitación',             risk: !emp.capacitacion_ultimo_anio,         text: emp.capacitacion_ultimo_anio ? 'Si' : 'No' },
    { label: 'Antigüedad',               risk: emp.antiguedad_meses < 12,            text: `${emp.antiguedad_meses} meses` },
    { label: 'Tipo contrato',            risk: emp.tipo_contrato === 'Eventual',     text: emp.tipo_contrato },
    { label: 'Empresas anteriores',      risk: emp.cantidad_empresas_anteriores >= 4, text: `${emp.cantidad_empresas_anteriores} empresas` },
  ] : [];

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-auto bg-gray-50 dark:bg-gray-900 transition-colors">
        <Navbar title="Detalle del Empleado" />
        <main className="flex-1 p-6">

          {loading && (
            <div className="flex justify-center py-20">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent" />
            </div>
          )}

          {error && (
            <div className="rounded-lg bg-red-50 p-4 text-red-700">{error}</div>
          )}

          {emp && !loading && (
            <>
              {/* Breadcrumb */}
              <div className="mb-4 flex items-center justify-between flex-wrap gap-2">
                <button
                  onClick={() => navigate('/employees')}
                  className="text-sm text-blue-600 hover:underline"
                >
                  ← Volver a empleados
                </button>
              </div>

              <div className="grid gap-6 lg:grid-cols-3">

                {/* ── Col izquierda: identidad + riesgo ── */}
                <div className="space-y-4">
                  {/* Card de identidad */}
                  <div className="rounded-xl bg-white dark:bg-gray-800 p-5 shadow-sm transition-colors">
                    <div className="flex items-center gap-4">
                      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-blue-100 text-2xl font-bold text-blue-600">
                        {emp.rol_tecnologico.charAt(0)}
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900">{emp.rol_tecnologico}</p>
                        <p className="text-sm text-gray-500">{emp.seniority} · {emp.modalidad_trabajo}</p>
                        <p className="text-xs text-gray-400">ID #{emp.id}</p>
                      </div>
                    </div>
                    <div className="mt-4 flex flex-wrap gap-2 text-xs">
                      <span className="rounded-full bg-gray-100 px-2 py-1 text-gray-600">{emp.edad} anios</span>
                      <span className="rounded-full bg-gray-100 px-2 py-1 text-gray-600">{emp.nivel_formacion}</span>
                      <span className="rounded-full bg-gray-100 px-2 py-1 text-gray-600">{emp.tipo_contrato}</span>
                      {emp.desercion_real && (
                        <span className="rounded-full bg-red-100 px-2 py-1 text-red-700 font-semibold">Deserto</span>
                      )}
                    </div>
                  </div>

                  {/* Gauge de riesgo */}
                  <div className="rounded-xl bg-white dark:bg-gray-800 p-5 shadow-sm text-center transition-colors">
                    <p className="mb-3 text-sm font-semibold text-gray-700 dark:text-gray-200">Probabilidad de Deserción</p>
                    <RiskGauge score={emp.riesgo_desercion} />
                    {emp.es_modelo_base && (
                      <p className="mt-2 text-xs text-amber-500">Calculado con modelo heuristico base</p>
                    )}
                  </div>

                  {/* Factores de riesgo */}
                  <div className="rounded-xl bg-white dark:bg-gray-800 p-5 shadow-sm transition-colors">
                    <p className="mb-3 text-sm font-semibold text-gray-700 dark:text-gray-200">Factores de Riesgo</p>
                    <ul className="space-y-2">
                      {riskFactors.map((f) => (
                        <li key={f.label} className="flex items-center justify-between text-sm">
                          <span className="text-gray-600">{f.label}</span>
                          <span className={`font-medium ${f.risk ? 'text-red-600' : 'text-green-600'}`}>
                            {f.risk ? '⚠ ' : '✓ '}{f.text}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* ── Col derecha: métricas detalladas ── */}
                <div className="lg:col-span-2 space-y-4">

                  {/* Datos laborales */}
                  <div className="rounded-xl bg-white dark:bg-gray-800 p-5 shadow-sm transition-colors">
                    <p className="mb-3 text-sm font-semibold text-gray-700 dark:text-gray-200">Datos Laborales</p>
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                      <Field label="Edad" value={`${emp.edad} anios`} />
                      <Field label="Salario Mensual" value={`Gs. ${emp.salario_mensual?.toLocaleString('es-PY')}`} />
                      <Field label="Antigüedad" value={`${emp.antiguedad_meses} meses`} />
                      <Field label="Horas extra/mes" value={`${emp.cantidad_horas_extra_mes}h`} highlight={emp.cantidad_horas_extra_mes > 15} />
                      <Field label="Empresas anteriores" value={emp.cantidad_empresas_anteriores} highlight={emp.cantidad_empresas_anteriores >= 4} />
                      <Field label="Evaluacion desempeno" value={`${emp.evaluacion_desempeno}/5`} />
                      <Field label="Capacitación" value={emp.capacitacion_ultimo_anio ? 'Si' : 'No'} highlight={!emp.capacitacion_ultimo_anio} />
                      <Field label="Modalidad" value={emp.modalidad_trabajo} />
                      <Field label="Tipo contrato" value={emp.tipo_contrato} highlight={emp.tipo_contrato === 'Eventual'} />
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </main>
      </div>
    </div>
  );
}
