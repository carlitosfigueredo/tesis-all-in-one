import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell,
} from 'recharts';
import Sidebar from '../components/layout/Sidebar';
import Navbar from '../components/layout/Navbar';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

// ─── Componentes auxiliares ──────────────────────────────────────────────────

const MetricCard = ({ label, value, sub, color = 'blue' }) => {
  const palette = {
    blue:  'bg-blue-50  text-blue-700  border-blue-100',
    green: 'bg-green-50 text-green-700 border-green-100',
    amber: 'bg-amber-50 text-amber-700 border-amber-100',
    indigo:'bg-indigo-50 text-indigo-700 border-indigo-100',
  };
  return (
    <div className={`rounded-xl border p-5 ${palette[color]}`}>
      <p className="text-xs font-medium uppercase tracking-wide opacity-70">{label}</p>
      <p className="mt-1 text-3xl font-bold">{value}</p>
      {sub && <p className="mt-1 text-xs opacity-60">{sub}</p>}
    </div>
  );
};

const StatusBadge = ({ ready }) =>
  ready ? (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-700">
      <span className="h-2 w-2 rounded-full bg-green-500" />
      Modelo entrenado
    </span>
  ) : (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700">
      <span className="h-2 w-2 rounded-full bg-amber-500" />
      Modelo dummy (sin entrenar)
    </span>
  );

const ConfusionMatrix = ({ cm }) => {
  if (!cm) return null;
  const total = cm.true_negative + cm.false_positive + cm.false_negative + cm.true_positive;
  const pct = (v) => ((v / total) * 100).toFixed(1);
  return (
    <div className="overflow-hidden rounded-xl border border-gray-100">
      <p className="border-b border-gray-100 bg-gray-50 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
        Matriz de Confusión
      </p>
      <div className="p-4">
        <div className="grid grid-cols-3 gap-1 text-center text-xs">
          <div />
          <div className="rounded bg-gray-100 py-1 font-semibold text-gray-600">Pred: Se queda</div>
          <div className="rounded bg-gray-100 py-1 font-semibold text-gray-600">Pred: Se va</div>
          <div className="flex items-center justify-end pr-2 font-semibold text-gray-600">Real: Se queda</div>
          <div className="rounded bg-green-100 py-3 font-bold text-green-700">
            {cm.true_negative}<br /><span className="font-normal opacity-60">({pct(cm.true_negative)}%)</span>
          </div>
          <div className="rounded bg-red-50 py-3 font-bold text-red-600">
            {cm.false_positive}<br /><span className="font-normal opacity-60">({pct(cm.false_positive)}%)</span>
          </div>
          <div className="flex items-center justify-end pr-2 font-semibold text-gray-600">Real: Se va</div>
          <div className="rounded bg-red-50 py-3 font-bold text-red-600">
            {cm.false_negative}<br /><span className="font-normal opacity-60">({pct(cm.false_negative)}%)</span>
          </div>
          <div className="rounded bg-green-100 py-3 font-bold text-green-700">
            {cm.true_positive}<br /><span className="font-normal opacity-60">({pct(cm.true_positive)}%)</span>
          </div>
        </div>
        <p className="mt-3 text-xs text-gray-400">
          Verde = predicciones correctas · Rojo = errores del modelo
        </p>
      </div>
    </div>
  );
};

// ─── Datos de las variables de entrenamiento ─────────────────────────────────
// Dataset custom: empresas de desarrollo de software - Asuncion, Paraguay
// 17 variables (12 datos RRHH + 5 encuesta clima) + 1 target (desercion)

const TRAINING_FEATURES = [
  // ── Variables CRITICAS (alto impacto en prediccion) ──
  {
    feature: 'satisfaccion_laboral',
    label: 'Satisfaccion Laboral',
    type: 'Ordinal',
    scale: '1 (Muy baja) — 5 (Muy alta)',
    source: 'Encuesta clima',
    tier: 'critica',
    description: 'Nivel de satisfaccion del empleado con su trabajo y responsabilidades diarias.',
    risk: 'Valores 1-2 son predictores directos de desercion. Variable de mayor impacto.',
  },
  {
    feature: 'equilibrio_vida_trabajo',
    label: 'Equilibrio Vida-Trabajo',
    type: 'Ordinal',
    scale: '1 (Muy malo) — 5 (Muy bueno)',
    source: 'Encuesta clima',
    tier: 'critica',
    description: 'Percepcion del empleado sobre el balance entre vida personal y laboral.',
    risk: 'Valores 1-2 correlacionan con burnout y fuga en equipos de desarrollo.',
  },
  {
    feature: 'estancamiento_carrera',
    label: 'Estancamiento de Carrera',
    type: 'Ordinal',
    scale: '1 (Nada estancado) — 5 (Muy estancado)',
    source: 'Encuesta clima',
    tier: 'critica',
    description: 'Percepcion de falta de crecimiento profesional. En IT, la falta de aprendizaje es critica.',
    risk: 'Valores >= 4 indican alto riesgo. Desarrolladores necesitan crecer constantemente.',
  },
  {
    feature: 'salario_mensual',
    label: 'Salario Mensual (Gs.)',
    type: 'Numerica',
    scale: '2.500.000 — 28.000.000 Gs.',
    source: 'Datos RRHH',
    tier: 'critica',
    description: 'Remuneracion mensual en guaranies. Predictor fuerte en un mercado IT competitivo.',
    risk: 'Salario por debajo de la mediana del seniority aumenta significativamente el riesgo.',
  },
  // ── Variables de ALTA importancia ──
  {
    feature: 'cantidad_horas_extra_mes',
    label: 'Horas Extra por Mes',
    type: 'Numerica',
    scale: '0 — 40 horas',
    source: 'Datos RRHH',
    tier: 'alta',
    description: 'Promedio de horas extra mensuales. Indicador de sobrecarga y desgaste.',
    risk: '> 15 horas/mes incrementa el riesgo. > 25 horas es critico.',
  },
  {
    feature: 'feedback_lider',
    label: 'Feedback del Lider',
    type: 'Ordinal',
    scale: '1 (Muy malo) — 5 (Muy bueno)',
    source: 'Encuesta clima',
    tier: 'alta',
    description: 'Calidad de retroalimentacion tecnica del lider directo o pares.',
    risk: 'Poco feedback genera desmotivacion, especialmente en perfiles junior y semi-senior.',
  },
  {
    feature: 'capacitacion_ultimo_anio',
    label: 'Capacitacion (ultimo anio)',
    type: 'Binaria',
    scale: 'Si / No',
    source: 'Datos RRHH',
    tier: 'alta',
    description: 'Si el empleado recibio alguna capacitacion formal en los ultimos 12 meses.',
    risk: 'Sin capacitacion indica falta de inversion en el empleado. Factor de retencion clave.',
  },
  {
    feature: 'antiguedad_meses',
    label: 'Antiguedad en la Empresa (meses)',
    type: 'Numerica',
    scale: '1 — 120 meses',
    source: 'Datos RRHH',
    tier: 'alta',
    description: 'Tiempo que lleva el empleado en la empresa. En meses para mayor precision.',
    risk: 'Los primeros 12 meses son los de mayor riesgo de salida.',
  },
  // ── Variables de importancia MEDIA ──
  {
    feature: 'tipo_contrato',
    label: 'Tipo de Contrato',
    type: 'Categorica',
    scale: 'Indefinido / Plazo fijo / Eventual',
    source: 'Datos RRHH',
    tier: 'media',
    description: 'Tipo de contrato laboral vigente. En Paraguay hay mucho contrato temporal en IT.',
    risk: 'Contratos eventuales y a plazo fijo tienen mayor rotacion natural.',
  },
  {
    feature: 'cantidad_empresas_anteriores',
    label: 'Empresas Anteriores',
    type: 'Numerica',
    scale: '0 — 8 empresas',
    source: 'Datos RRHH',
    tier: 'media',
    description: 'Cantidad de empresas donde trabajo antes. Indica perfil de movilidad laboral.',
    risk: '>= 4 empresas anteriores sugiere perfil con alta propension a cambiar.',
  },
  {
    feature: 'evaluacion_desempeno',
    label: 'Evaluacion de Desempeno',
    type: 'Ordinal',
    scale: '1 (Muy bajo) — 5 (Excelente)',
    source: 'Datos RRHH',
    tier: 'media',
    description: 'Ultima calificacion formal de desempeno del empleado.',
    risk: 'Desempeno bajo puede anticipar salida involuntaria o voluntaria.',
  },
  {
    feature: 'satisfaccion_ambiente',
    label: 'Satisfaccion con el Ambiente',
    type: 'Ordinal',
    scale: '1 (Muy baja) — 5 (Muy alta)',
    source: 'Encuesta clima',
    tier: 'media',
    description: 'Satisfaccion con el entorno fisico y social del trabajo.',
    risk: 'Ambiente negativo incrementa intencion de renuncia.',
  },
  // ── Variables de importancia BAJA (contextuales) ──
  {
    feature: 'modalidad_trabajo',
    label: 'Modalidad de Trabajo',
    type: 'Categorica',
    scale: 'Presencial / Hibrido / Remoto',
    source: 'Datos RRHH',
    tier: 'baja',
    description: 'Modalidad contractual de trabajo. Remoto tiende a retener mas en IT.',
    risk: 'Presencial sin opcion de flexibilidad puede ser factor de salida.',
  },
  {
    feature: 'edad',
    label: 'Edad',
    type: 'Numerica',
    scale: '20 — 55 anios',
    source: 'Datos RRHH',
    tier: 'baja',
    description: 'Edad del empleado. Empleados mas jovenes tienen mayor movilidad.',
    risk: 'Rango 25-32 asociado a mayor rotacion en mercado IT.',
  },
  {
    feature: 'nivel_formacion',
    label: 'Nivel de Formacion',
    type: 'Categorica',
    scale: 'Secundaria / Tecnico / Universitario / Posgrado',
    source: 'Datos RRHH',
    tier: 'baja',
    description: 'Nivel educativo mas alto alcanzado por el empleado.',
    risk: 'Posgrado sin reconocimiento salarial puede generar frustracion.',
  },
  {
    feature: 'rol_tecnologico',
    label: 'Rol Tecnologico',
    type: 'Categorica',
    scale: 'Frontend / Backend / Fullstack / Mobile / DevOps / QA / Data',
    source: 'Datos RRHH',
    tier: 'baja',
    description: 'Rol principal del empleado en el equipo de desarrollo.',
    risk: 'Roles con alta demanda en el mercado (DevOps, Data) tienen mas ofertas externas.',
  },
  {
    feature: 'seniority',
    label: 'Seniority',
    type: 'Categorica',
    scale: 'Trainee / Junior / Semi-Senior / Senior / Lead',
    source: 'Datos RRHH',
    tier: 'baja',
    description: 'Nivel de experiencia y responsabilidad dentro del equipo.',
    risk: 'Semi-Senior es el punto de mayor rotacion (ya tiene experiencia, busca mas).',
  },
];

const TYPE_COLORS = {
  'Numerica':   'bg-blue-100 text-blue-700',
  'Ordinal':    'bg-purple-100 text-purple-700',
  'Binaria':    'bg-amber-100 text-amber-700',
  'Categorica': 'bg-teal-100 text-teal-700',
};

const TIER_COLORS = {
  critica: 'bg-red-100 text-red-700 border-red-200',
  alta:    'bg-orange-100 text-orange-700 border-orange-200',
  media:   'bg-yellow-100 text-yellow-700 border-yellow-200',
  baja:    'bg-gray-100 text-gray-600 border-gray-200',
};

const TIER_LABELS = {
  critica: 'Critica',
  alta:    'Alta',
  media:   'Media',
  baja:    'Baja',
};

const SOURCE_COLORS = {
  'Datos RRHH':     'bg-sky-50 text-sky-700',
  'Encuesta clima': 'bg-violet-50 text-violet-700',
};



export default function ModelML() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [status, setStatus]   = useState(null);
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [training, setTraining] = useState(false);
  const [error, setError]     = useState('');

  // Solo CORPORATIVO puede entrenar bajo demanda
  const companyPlan = user?.companyPlan ?? 'BASICO';
  const canTrainNow = companyPlan === 'CORPORATIVO' || user?.roles?.includes('SUPER_ADMIN');

  const fetchStatus = async () => {
    try {
      const { data } = await api.get('/model/status');
      setStatus(data.data);
      if (data.data.last_metrics) setMetrics(data.data.last_metrics);
    } catch {
      setError('No se pudo conectar con el ML Service.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchStatus(); }, []);

  const handleTrain = async () => {
    setTraining(true);
    setError('');
    try {
      const { data } = await api.post('/model/train');
      setMetrics(data.data);
      await fetchStatus();
    } catch (e) {
      setError(e.response?.data?.message || 'Error durante el entrenamiento.');
    } finally {
      setTraining(false);
    }
  };

  // Prepara datos del gráfico de importancia
  const chartData = metrics?.feature_importances?.map((f) => ({
    name: f.label,
    pct: f.importance_pct,
  })) ?? [];

  const BAR_COLORS = [
    '#ef4444','#f97316','#f59e0b','#eab308',
    '#84cc16','#22c55e','#14b8a6','#06b6d4',
    '#0ea5e9','#3b82f6','#6366f1','#8b5cf6',
    '#a855f7','#d946ef','#ec4899','#f43f5e',
    '#64748b',
  ];

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-auto">
        <Navbar title="Modelo de Machine Learning" />
        <main className="flex-1 p-6">

          {/* ── Header ── */}
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-800">Random Forest — Prediccion de Desercion Laboral</h2>
              <p className="text-sm text-gray-500">Dataset custom: Software PY · 1.000 empleados · 17 variables</p>
            </div>
            <div className="flex items-center gap-3">
              {status && <StatusBadge ready={status.model_ready} />}

              {canTrainNow ? (
                /* Plan CORPORATIVO o Super Admin: puede entrenar ahora */
                <button
                  onClick={handleTrain}
                  disabled={training || !status?.dataset_available}
                  className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {training ? (
                    <span className="flex items-center gap-2">
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                      Entrenando...
                    </span>
                  ) : 'Entrenar ahora'}
                </button>
              ) : (
                /* Plan ESTANDAR o PROFESIONAL: no puede entrenar bajo demanda */
                <div className="text-right">
                  <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-2.5 max-w-xs">
                    <p className="text-xs font-semibold text-amber-700">
                      {companyPlan === 'PROFESIONAL'
                        ? 'Las predicciones se actualizan semanalmente'
                        : 'Las predicciones se actualizan mensualmente'}
                    </p>
                    <p className="mt-1 text-xs text-amber-600">
                      Aguarda unos dias para tener tus resultados actualizados.
                    </p>
                    <button
                      onClick={() => navigate('/checkout')}
                      className="mt-2 text-xs font-semibold text-blue-600 hover:text-blue-800 underline"
                    >
                      Actualiza tu plan y obtenelo ahora
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* ── Estado del dataset ── */}
          {status && !status.dataset_available && (
            <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              El dataset no esta disponible en el servidor. Coloca el archivo
              <code className="mx-1 rounded bg-amber-100 px-1">dataset_desercion_software_py.csv</code>
              en <code className="rounded bg-amber-100 px-1">ml-service/notebooks/data/</code>
            </div>
          )}

          {error && (
            <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              ❌ {error}
            </div>
          )}

          {loading && (
            <div className="flex justify-center py-20">
              <div className="h-10 w-10 animate-spin rounded-full border-4 border-blue-500 border-t-transparent" />
            </div>
          )}

          {/* ── Métricas ── */}
          {metrics && !loading && (
            <>
              <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
                <MetricCard
                  label="AUC-ROC"
                  value={metrics.auc_roc}
                  sub="Área bajo la curva ROC"
                  color="blue"
                />
                <MetricCard
                  label="Accuracy"
                  value={`${(metrics.accuracy * 100).toFixed(1)}%`}
                  sub="Exactitud general"
                  color="indigo"
                />
                <MetricCard
                  label="Recall (fuga)"
                  value={`${(metrics.recall_class1 * 100).toFixed(1)}%`}
                  sub="Empleados en riesgo detectados"
                  color="amber"
                />
                <MetricCard
                  label="Tiempo entreno"
                  value={`${metrics.training_time_seconds}s`}
                  sub={`Modelo: ${metrics.model_size_kb} KB`}
                  color="green"
                />
              </div>

              {/* ── Detalles + Matriz de Confusión ── */}
              <div className="mb-6 grid gap-6 lg:grid-cols-2">

                {/* Métricas detalladas */}
                <div className="rounded-xl bg-white p-5 shadow-sm">
                  <h3 className="mb-4 text-sm font-semibold text-gray-700">Métricas Detalladas</h3>
                  <table className="w-full text-sm">
                    <tbody className="divide-y divide-gray-50">
                      {[
                        ['AUC-ROC (test)',       metrics.auc_roc],
                        ['AUC-ROC CV (5-fold)',  `${metrics.auc_roc_cv_mean} ± ${metrics.auc_roc_cv_std}`],
                        ['Precision (fuga)',      metrics.precision_class1],
                        ['Recall (fuga)',         metrics.recall_class1],
                        ['F1-Score (fuga)',       metrics.f1_class1],
                        ['Accuracy',             `${(metrics.accuracy * 100).toFixed(1)}%`],
                        ['Muestras entrenamiento', metrics.training_samples],
                        ['Muestras test',          metrics.test_samples],
                        ['Versión del modelo',    metrics.model_version],
                      ].map(([label, value]) => (
                        <tr key={label} className="hover:bg-gray-50">
                          <td className="py-2 pr-4 text-gray-500">{label}</td>
                          <td className="py-2 font-semibold text-gray-800">{value}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Matriz de confusión */}
                <div className="rounded-xl bg-white p-5 shadow-sm">
                  <h3 className="mb-4 text-sm font-semibold text-gray-700">Resultados en Set de Test</h3>
                  <ConfusionMatrix cm={metrics.confusion_matrix} />
                  <div className="mt-4 grid grid-cols-2 gap-2 text-xs text-gray-500">
                    <div className="rounded-lg bg-gray-50 p-3">
                      <p className="font-semibold text-gray-700">Empleados que NO se van</p>
                      <p>Total en test: <strong>{metrics.support_class0}</strong></p>
                    </div>
                    <div className="rounded-lg bg-gray-50 p-3">
                      <p className="font-semibold text-gray-700">Empleados que SÍ se van</p>
                      <p>Total en test: <strong>{metrics.support_class1}</strong></p>
                    </div>
                  </div>
                </div>
              </div>

              {/* ── Importancia de variables ── */}
              <div className="rounded-xl bg-white p-5 shadow-sm">
                <h3 className="mb-1 text-sm font-semibold text-gray-700">Importancia de Variables</h3>
                <p className="mb-4 text-xs text-gray-400">
                  Qué tanto influye cada variable en la decisión del modelo
                </p>
                <ResponsiveContainer width="100%" height={450}>
                  <BarChart
                    data={chartData}
                    layout="vertical"
                    margin={{ left: 180, right: 30, top: 5, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f0f0f0" />
                    <XAxis
                      type="number"
                      unit="%"
                      tick={{ fontSize: 11 }}
                      domain={[0, 'dataMax + 2']}
                    />
                    <YAxis
                      type="category"
                      dataKey="name"
                      tick={{ fontSize: 11 }}
                      width={155}
                    />
                    <Tooltip formatter={(v) => [`${v}%`, 'Importancia']} />
                    <Bar dataKey="pct" radius={[0, 4, 4, 0]}>
                      {chartData.map((_, i) => (
                        <Cell key={i} fill={BAR_COLORS[i % BAR_COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </>
          )}

          {/* Estado inicial sin métricas */}
          {!metrics && !loading && status?.model_ready === false && (
            <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-200 bg-white py-20 text-center">
              <p className="text-4xl">🤖</p>
              <p className="mt-3 text-base font-semibold text-gray-700">El modelo aun no fue entrenado</p>
              <p className="mt-1 text-sm text-gray-400">
                Hace click en "Entrenar modelo" para iniciar el proceso con el dataset de desercion
              </p>
              {status?.dataset_records && (
                <p className="mt-2 text-xs text-gray-400">
                  Dataset disponible: {status.dataset_records} registros
                </p>
              )}
            </div>
          )}

          {/* ── Variables de entrenamiento ── */}
          <div className="mt-6 rounded-xl bg-white p-5 shadow-sm">
            <h3 className="text-sm font-semibold text-gray-700">Variables del Modelo de Prediccion</h3>
            <p className="mt-0.5 mb-2 text-xs text-gray-400">
              17 variables · Dataset custom para empresas de software de Asuncion, Paraguay
            </p>

            {/* Leyenda */}
            <div className="mb-4 flex flex-wrap gap-3 text-xs">
              <span className="font-medium text-gray-500">Importancia:</span>
              {Object.entries(TIER_COLORS).map(([tier, cls]) => (
                <span key={tier} className={`rounded-full border px-2 py-0.5 font-medium ${cls}`}>
                  {TIER_LABELS[tier]}
                </span>
              ))}
              <span className="ml-4 font-medium text-gray-500">Fuente:</span>
              {Object.entries(SOURCE_COLORS).map(([src, cls]) => (
                <span key={src} className={`rounded-full px-2 py-0.5 font-medium ${cls}`}>
                  {src}
                </span>
              ))}
            </div>

            {/* Grid de variables */}
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {TRAINING_FEATURES.map((f) => (
                <div
                  key={f.feature}
                  className={`rounded-lg border p-3 transition-colors hover:shadow-sm ${TIER_COLORS[f.tier]?.split(' ').slice(0, 1).join(' ')} bg-opacity-30 border-opacity-50`}
                  style={{ borderColor: undefined }}
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-semibold text-gray-800 text-sm">{f.label}</p>
                    <div className="flex shrink-0 gap-1">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${TYPE_COLORS[f.type]}`}>
                        {f.type}
                      </span>
                    </div>
                  </div>
                  <div className="mt-1 flex items-center gap-2">
                    <span className={`rounded-full border px-2 py-0.5 text-xs font-medium ${TIER_COLORS[f.tier]}`}>
                      {TIER_LABELS[f.tier]}
                    </span>
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${SOURCE_COLORS[f.source]}`}>
                      {f.source}
                    </span>
                  </div>
                  <p className="mt-0.5 text-xs text-gray-400 font-mono">{f.feature}</p>
                  <p className="mt-1.5 text-xs text-gray-500 leading-relaxed">{f.description}</p>
                  <div className="mt-2 flex items-center justify-between">
                    <span className="text-xs text-gray-400">Escala: <span className="font-medium text-gray-600">{f.scale}</span></span>
                  </div>
                  <div className="mt-1.5 rounded bg-red-50 px-2 py-1 text-xs text-red-600">
                    {f.risk}
                  </div>
                </div>
              ))}
            </div>

            {/* Nota sobre variables opcionales */}
            <div className="mt-4 rounded-lg border border-blue-100 bg-blue-50 px-4 py-3 text-xs text-blue-700">
              <p className="font-semibold">Sobre las variables de "Encuesta clima":</p>
              <p className="mt-1">
                Estas 5 variables son opcionales al cargar empleados, pero son las de mayor impacto
                en la prediccion. Si la empresa no las proporciona, el modelo usa valores neutros (3)
                y la confianza de la prediccion se reduce. Se recomienda que la empresa realice una
                encuesta de clima interna para obtener estos datos.
              </p>
            </div>
          </div>

        </main>
      </div>
    </div>
  );
}
