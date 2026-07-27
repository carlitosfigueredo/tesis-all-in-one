import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Sidebar from '../components/layout/Sidebar';
import Navbar from '../components/layout/Navbar';
import api from '../services/api';

// ─── Constantes ────────────────────────────────────────────────────────────────
const USD_TO_GS = 7500;

const SATISFACTION_LABELS = {
  1: { text: 'Muy insatisfecho', color: 'text-red-700',   bg: 'bg-red-50',    bar: 'bg-red-500'    },
  2: { text: 'Insatisfecho',     color: 'text-orange-700', bg: 'bg-orange-50', bar: 'bg-orange-400' },
  3: { text: 'Satisfecho',       color: 'text-blue-700',   bg: 'bg-blue-50',   bar: 'bg-blue-500'   },
  4: { text: 'Muy satisfecho',   color: 'text-green-700',  bg: 'bg-green-50',  bar: 'bg-green-500'  },
};

const RiskGauge = ({ score }) => {
  const pct = Math.round(score * 100);
  const color =
    score >= 0.7 ? '#ef4444' :
    score >= 0.4 ? '#f59e0b' : '#22c55e';
  return (
    <div className="flex flex-col items-center">
      <svg viewBox="0 0 120 70" className="w-44">
        {/* Fondo arco */}
        <path d="M10,60 A50,50 0 0,1 110,60" fill="none" stroke="#e5e7eb" strokeWidth="12" strokeLinecap="round" />
        {/* Arco de progreso */}
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
        {score >= 0.7 ? 'RIESGO ALTO' : score >= 0.4 ? 'RIESGO MEDIO' : 'RIESGO BAJO'}
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

const SatisfactionBar = ({ label, value, max = 4, hint }) => {
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
        <span>Muy insatisfecho</span>
        <span>{value}/{max}</span>
        <span>Muy satisfecho</span>
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
  const [currency, setCurrency] = useState('USD');

  const formatIncome = (val) => {
    if (currency === 'GS') return `Gs. ${Math.round(val * USD_TO_GS).toLocaleString('es-PY')}`;
    return `$${val.toLocaleString('en-US')}`;
  };

  useEffect(() => {
    api.get(`/employees/${id}`)
      .then(({ data }) => setEmp(data.data))
      .catch(() => setError('No se encontró el empleado.'))
      .finally(() => setLoading(false));
  }, [id]);

  const riskFactors = emp ? [
    { label: 'Horas extra',           risk: emp.overtime,                           text: emp.overtime ? 'Sí — factor de riesgo' : 'No' },
    { label: 'Años sin ascenso',       risk: emp.years_since_last_promotion >= 3,   text: `${emp.years_since_last_promotion} años` },
    { label: 'Satisfacción laboral',   risk: emp.job_satisfaction <= 2,             text: ['', 'Muy baja', 'Baja', 'Alta', 'Muy alta'][emp.job_satisfaction] },
    { label: 'Balance vida-trabajo',   risk: emp.work_life_balance <= 2,            text: ['', 'Muy malo', 'Malo', 'Bueno', 'Muy bueno'][emp.work_life_balance] },
    { label: 'Empresas anteriores',    risk: emp.num_companies_worked >= 4,         text: `${emp.num_companies_worked} empresas` },
    { label: 'Distancia al trabajo',   risk: emp.distance_from_home >= 20,         text: `${emp.distance_from_home} km` },
  ] : [];

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-auto">
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
              {/* Breadcrumb + toggle moneda */}
              <div className="mb-4 flex items-center justify-between flex-wrap gap-2">
                <button
                  onClick={() => navigate('/employees')}
                  className="text-sm text-blue-600 hover:underline"
                >
                  ← Volver a empleados
                </button>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-400">Ingreso en:</span>
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
                      Gs.
                    </button>
                  </div>
                </div>
              </div>

              <div className="grid gap-6 lg:grid-cols-3">

                {/* ── Col izquierda: identidad + riesgo ── */}
                <div className="space-y-4">
                  {/* Card de identidad */}
                  <div className="rounded-xl bg-white p-5 shadow-sm">
                    <div className="flex items-center gap-4">
                      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-blue-100 text-2xl font-bold text-blue-600">
                        {emp.job_role.charAt(0)}
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900">{emp.job_role}</p>
                        <p className="text-sm text-gray-500">{emp.department} · Nivel {emp.job_level}</p>
                        <p className="text-xs text-gray-400">ID #{emp.id}</p>
                      </div>
                    </div>
                    <div className="mt-4 flex flex-wrap gap-2 text-xs">
                      <span className="rounded-full bg-gray-100 px-2 py-1 text-gray-600">{emp.gender}</span>
                      <span className="rounded-full bg-gray-100 px-2 py-1 text-gray-600">{emp.marital_status}</span>
                      <span className="rounded-full bg-gray-100 px-2 py-1 text-gray-600">{emp.education_field}</span>
                      <span className="rounded-full bg-gray-100 px-2 py-1 text-gray-600">{emp.business_travel}</span>
                      {emp.attrition && (
                        <span className="rounded-full bg-red-100 px-2 py-1 text-red-700 font-semibold">Renunció</span>
                      )}
                    </div>
                  </div>

                  {/* Gauge de riesgo */}
                  <div className="rounded-xl bg-white p-5 shadow-sm text-center">
                    <p className="mb-3 text-sm font-semibold text-gray-700">Probabilidad de Fuga</p>
                    <RiskGauge score={emp.flight_risk} />
                    {emp.is_dummy && (
                      <p className="mt-2 text-xs text-amber-500">⚠️ Calculado con modelo dummy</p>
                    )}
                  </div>

                  {/* Factores de riesgo */}
                  <div className="rounded-xl bg-white p-5 shadow-sm">
                    <p className="mb-3 text-sm font-semibold text-gray-700">Factores de Riesgo</p>
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
                  <div className="rounded-xl bg-white p-5 shadow-sm">
                    <p className="mb-3 text-sm font-semibold text-gray-700">Datos Laborales</p>
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                      <Field label="Edad" value={`${emp.age} años`} />
                      <Field label="Ingreso Mensual" value={formatIncome(emp.monthly_income)} />
                      <Field label="Años en la empresa" value={`${emp.years_at_company} años`} />
                      <Field label="Años en el cargo" value={`${emp.years_in_current_role} años`} />
                      <Field label="Años sin ascenso" value={`${emp.years_since_last_promotion} años`} highlight={emp.years_since_last_promotion >= 3} />
                      <Field label="Años de experiencia" value={`${emp.total_working_years} años`} />
                      <Field label="Empresas anteriores" value={emp.num_companies_worked} highlight={emp.num_companies_worked >= 4} />
                      <Field label="Distancia al trabajo" value={`${emp.distance_from_home} km`} highlight={emp.distance_from_home >= 20} />
                      <Field label="Horas extra" value={emp.overtime ? 'Sí' : 'No'} highlight={emp.overtime} />
                    </div>
                  </div>

                  {/* Satisfacción — escala 1-4, con descripción verbal y extremos */}
                  <div className="rounded-xl bg-white p-5 shadow-sm">
                    <div className="mb-4 flex items-start justify-between gap-2">
                      <p className="text-sm font-semibold text-gray-700">Indicadores de Satisfacción</p>
                      <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-500 flex-shrink-0">
                        Escala 1–4
                      </span>
                    </div>
                    <div className="space-y-5">
                      <SatisfactionBar
                        label="Satisfacción Laboral"
                        value={emp.job_satisfaction}
                        hint="¿Qué tan satisfecho está con su trabajo?"
                      />
                      <SatisfactionBar
                        label="Satisfacción con el Ambiente"
                        value={emp.environment_satisfaction}
                        hint="¿Cómo percibe el entorno físico y social?"
                      />
                      <SatisfactionBar
                        label="Balance Vida-Trabajo"
                        value={emp.work_life_balance}
                        hint="¿Puede equilibrar vida personal y laboral?"
                      />
                      <SatisfactionBar
                        label="Calificación de Desempeño"
                        value={emp.performance_rating}
                        hint="Evaluación de desempeño del período"
                      />
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
