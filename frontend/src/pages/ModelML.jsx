import { useEffect, useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell,
} from 'recharts';
import Sidebar from '../components/layout/Sidebar';
import Navbar from '../components/layout/Navbar';
import api from '../services/api';

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

// ─── Página principal ─────────────────────────────────────────────────────────

export default function ModelML() {
  const [status, setStatus]   = useState(null);
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [training, setTraining] = useState(false);
  const [error, setError]     = useState('');

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
    '#3b82f6','#6366f1','#8b5cf6','#a78bfa',
    '#c4b5fd','#ddd6fe','#e0e7ff','#c7d2fe',
    '#a5b4fc','#818cf8','#6366f1','#4f46e5',
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
              <h2 className="text-lg font-semibold text-gray-800">Random Forest — Predicción de Fuga de Talento</h2>
              <p className="text-sm text-gray-500">Dataset IBM HR Analytics · 1.470 empleados · 12 variables</p>
            </div>
            <div className="flex items-center gap-3">
              {status && <StatusBadge ready={status.model_ready} />}
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
                ) : '⚡ Entrenar modelo'}
              </button>
            </div>
          </div>

          {/* ── Estado del dataset ── */}
          {status && !status.dataset_available && (
            <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              ⚠️ El dataset no está disponible en el servidor. Colocá el archivo
              <code className="mx-1 rounded bg-amber-100 px-1">WA_Fn-UseC_-HR-Employee-Attrition.csv</code>
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
                <ResponsiveContainer width="100%" height={320}>
                  <BarChart
                    data={chartData}
                    layout="vertical"
                    margin={{ left: 160, right: 30, top: 5, bottom: 5 }}
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
              <p className="mt-3 text-base font-semibold text-gray-700">El modelo aún no fue entrenado</p>
              <p className="mt-1 text-sm text-gray-400">
                Hacé click en "Entrenar modelo" para iniciar el proceso con el dataset IBM HR Analytics
              </p>
            </div>
          )}

        </main>
      </div>
    </div>
  );
}
