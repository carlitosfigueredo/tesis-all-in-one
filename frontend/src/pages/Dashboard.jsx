import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, LineChart, Line,
} from 'recharts';
import Sidebar from '../components/layout/Sidebar';
import Navbar from '../components/layout/Navbar';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useExchangeRate } from '../hooks/useExchangeRate';

const RISK_COLORS = ['#22c55e', '#f59e0b', '#ef4444'];

// El valor base viene del backend EN GUARANIES. Si se pide en USD, se convierte
// dividiendo por el tipo de cambio (Gs por USD).
const formatIncome = (gsValue, inGs, usdToGs) => {
  if (inGs) {
    return `Gs. ${Math.round(gsValue).toLocaleString('es-PY')}`;
  }
  const usd = usdToGs ? gsValue / usdToGs : gsValue;
  return `$${usd.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
};

const KpiCard = ({ label, value, sub, color = 'blue', onClick }) => {
  const colors = {
    blue:  'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300',
    red:   'bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300',
    green: 'bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300',
    amber: 'bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300',
  };
  const interactive = !!onClick;
  return (
    <div
      onClick={onClick}
      className={`rounded-xl p-5 ${colors[color]} transition-colors ${
        interactive ? 'cursor-pointer transition-transform hover:scale-[1.02] hover:shadow-md' : ''
      }`}
    >
      <p className="text-sm font-medium opacity-75">{label}</p>
      <p className="mt-1 text-3xl font-bold">{value}</p>
      {sub && <p className="mt-1 text-xs opacity-60">{sub}</p>}
      {interactive && (
        <p className="mt-2 text-xs font-semibold opacity-50">Ver empleados →</p>
      )}
    </div>
  );
};

export default function Dashboard() {
  const navigate = useNavigate();
  const { user, hasPermission } = useAuth();
  const [stats, setStats]       = useState(null);
  const [currency, setCurrency] = useState('GS'); // los datos están en guaraníes
  const [trend, setTrend]       = useState([]);
  const [trendHasData, setTrendHasData] = useState(false);
  const [topRisk, setTopRisk]   = useState([]);
  const [strategies, setStrategies] = useState(null);
  const { rate: usdToGs }       = useExchangeRate();

  // ── Configuración de widgets (personalización) ──
  const [widgets, setWidgets]   = useState(null);   // config actual del usuario
  const [available, setAvailable] = useState([]);   // catálogo de widgets
  const [customizing, setCustomizing] = useState(false);
  const [savingCfg, setSavingCfg] = useState(false);

  const canConfig = hasPermission?.('dashboard.config')
    || user?.roles?.includes('SUPER_ADMIN')
    || user?.roles?.includes('COMPANY_ADMIN');

  const loadConfig = useCallback(async () => {
    try {
      const { data } = await api.get('/dashboard/config');
      setWidgets(data.data.widgets);
      setAvailable(data.data.available ?? []);
    } catch {
      setWidgets(null);
    }
  }, []);

  useEffect(() => {
    api.get('/employees/stats').then(({ data }) => setStats(data.data)).catch(() => {});
    api.get('/dashboard/trend', { params: { months: 6 } })
      .then(({ data }) => { setTrend(data.data ?? []); setTrendHasData(!!data.hasData); })
      .catch(() => setTrend([]));
    api.get('/employees', { params: { page_size: 5 } })
      .then(({ data }) => setTopRisk(data.data ?? []))
      .catch(() => setTopRisk([]));
    api.get('/retention/strategies/summary')
      .then(({ data }) => setStrategies(data.data))
      .catch(() => setStrategies(null));
    loadConfig();
  }, [loadConfig]);

  // KPIs desde el endpoint de estadísticas reales
  const total    = stats?.total        ?? '—';
  const highRisk = stats?.riesgo_alto   ?? '—';
  const medRisk  = stats?.riesgo_medio  ?? '—';
  const avgIncome = stats?.salario_promedio != null
    ? formatIncome(stats.salario_promedio, currency === 'GS', usdToGs)
    : null;

  const riskPieData = [
    { name: 'Riesgo Bajo',  value: stats?.riesgo_bajo  ?? 0 },
    { name: 'Riesgo Medio', value: stats?.riesgo_medio  ?? 0 },
    { name: 'Riesgo Alto',  value: (stats?.riesgo_alto ?? 0) + (stats?.riesgo_critico ?? 0) },
  ];

  const deptData = (stats?.riesgo_por_area ?? []).map(({ area, riesgo_promedio }) => ({
    dept: area,
    avg:  riesgo_promedio,
  }));

  // Helper: ¿este widget está visible según la config?
  const isVisible = (key) => {
    if (!widgets) return true; // sin config aún → mostrar todo
    const w = widgets.find((x) => x.key === key);
    return w ? w.visible !== false : true;
  };

  // Orden de widgets según config (los que no están, al final).
  const orderedKeys = (() => {
    if (!widgets) return ['kpis', 'risk_distribution', 'risk_by_dept', 'trend', 'top_risk', 'strategies'];
    return [...widgets].sort((a, b) => (a.orden ?? 0) - (b.orden ?? 0)).map((w) => w.key);
  })();

  const toggleWidget = (key) => {
    setWidgets((prev) =>
      (prev ?? available).map((w) => (w.key === key ? { ...w, visible: !w.visible } : w))
    );
  };

  const moveWidget = (key, dir) => {
    setWidgets((prev) => {
      const list = [...(prev ?? available)].sort((a, b) => (a.orden ?? 0) - (b.orden ?? 0));
      const idx = list.findIndex((w) => w.key === key);
      const swap = idx + dir;
      if (idx < 0 || swap < 0 || swap >= list.length) return prev;
      [list[idx], list[swap]] = [list[swap], list[idx]];
      return list.map((w, i) => ({ ...w, orden: i }));
    });
  };

  const saveConfig = async () => {
    setSavingCfg(true);
    try {
      await api.put('/dashboard/config', { widgets: widgets ?? available });
      setCustomizing(false);
    } catch { /* noop */ }
    finally { setSavingCfg(false); }
  };

  const resetConfig = async () => {
    setSavingCfg(true);
    try {
      const { data } = await api.delete('/dashboard/config');
      setWidgets(data.data.widgets);
      setCustomizing(false);
    } catch { /* noop */ }
    finally { setSavingCfg(false); }
  };

  // ── Render de cada widget por key ──
  const renderWidget = (key) => {
    if (!isVisible(key)) return null;
    switch (key) {
      case 'kpis':
        return (
          <div key="kpis" className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
            <KpiCard label="Total Empleados" value={total} color="blue" />
            <KpiCard label="Riesgo Alto de Fuga" value={highRisk} sub="≥ 50% probabilidad" color="red"
              onClick={() => navigate('/employees?nivel_riesgo=ALTO')} />
            <KpiCard label="Riesgo Medio" value={medRisk} sub="30% — 50%" color="amber"
              onClick={() => navigate('/employees?nivel_riesgo=MEDIO')} />
            {avgIncome ? (
              <KpiCard label="Ingreso Promedio Mensual" value={avgIncome}
                sub={currency === 'GS' ? `Tipo de cambio: Gs. ${Number(usdToGs).toLocaleString('es-PY')}/USD` : 'Dólares estadounidenses'}
                color="green" />
            ) : (
              <KpiCard label="En riesgo" value={(stats?.riesgo_alto ?? 0) + (stats?.riesgo_critico ?? 0)} color="green" />
            )}
          </div>
        );

      case 'risk_distribution':
        return (
          <div key="risk_distribution" className="mb-6 rounded-xl bg-white dark:bg-gray-800 p-5 shadow-sm transition-colors">
            <h2 className="mb-4 text-base font-semibold text-gray-700 dark:text-gray-200">Distribución de Riesgo de Fuga</h2>
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie data={riskPieData} dataKey="value" nameKey="name" outerRadius={90} label>
                  {riskPieData.map((_, i) => (<Cell key={i} fill={RISK_COLORS[i]} />))}
                </Pie>
                <Legend />
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        );

      case 'risk_by_dept':
        return (
          <div key="risk_by_dept" className="mb-6 rounded-xl bg-white dark:bg-gray-800 p-5 shadow-sm transition-colors">
            <h2 className="mb-4 text-base font-semibold text-gray-700 dark:text-gray-200">Riesgo Promedio por Rol</h2>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={deptData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="dept" tick={{ fontSize: 12 }} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} />
                <Tooltip formatter={(v) => `${v}%`} />
                <Bar dataKey="avg" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        );

      case 'trend':
        return (
          <div key="trend" className="mb-6 rounded-xl bg-white dark:bg-gray-800 p-5 shadow-sm transition-colors">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-base font-semibold text-gray-700 dark:text-gray-200">Tendencia Histórica de Riesgo</h2>
              <span className="text-xs text-gray-400 dark:text-gray-500">
                Últimos 6 meses · {trendHasData ? 'datos reales' : 'sin historial suficiente'}
              </span>
            </div>
            {!trendHasData ? (
              <p className="py-8 text-center text-sm text-gray-500">
                Todavía no hay historial suficiente. A medida que recalcules predicciones o importes datos,
                acá vas a ver cómo evoluciona el riesgo mes a mes.
              </p>
            ) : (
              <ResponsiveContainer width="100%" height={240}>
                <LineChart data={trend} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="mes" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="alto"  name="Alto/Crítico" stroke="#ef4444" strokeWidth={2} dot={{ r: 3 }} />
                  <Line type="monotone" dataKey="medio" name="Medio" stroke="#f59e0b" strokeWidth={2} dot={{ r: 3 }} />
                  <Line type="monotone" dataKey="bajo"  name="Bajo"  stroke="#22c55e" strokeWidth={2} dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        );

      case 'top_risk':
        return (
          <div key="top_risk" className="mb-6 rounded-xl bg-white dark:bg-gray-800 p-5 shadow-sm transition-colors">
            <h2 className="mb-4 text-base font-semibold text-gray-700 dark:text-gray-200">Empleados con Mayor Riesgo</h2>
            {topRisk.length === 0 ? (
              <p className="text-xs text-gray-400">Sin empleados cargados.</p>
            ) : (
              <ul className="divide-y divide-gray-50 dark:divide-gray-700/50">
                {topRisk.map((e) => (
                  <li key={e.id} className="flex items-center justify-between py-2">
                    <button onClick={() => navigate(`/employees/${e.id}`)} className="text-left">
                      <span className="text-sm font-medium text-blue-600 hover:underline">{e.nombre} {e.apellido}</span>
                      <span className="block text-xs text-gray-400">{e.rol_tecnologico} · {e.seniority}</span>
                    </button>
                    <span className="text-sm font-semibold text-red-600">{Math.round((e.riesgo_desercion ?? 0) * 100)}%</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        );

      case 'strategies':
        return (
          <div key="strategies" className="mb-6 rounded-xl bg-white dark:bg-gray-800 p-5 shadow-sm transition-colors">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-base font-semibold text-gray-700 dark:text-gray-200">Estrategias de Retención</h2>
              <button onClick={() => navigate('/retention')} className="text-xs font-semibold text-blue-600 hover:underline">Ver todas →</button>
            </div>
            {!strategies ? (
              <p className="text-xs text-gray-400">Sin datos.</p>
            ) : (
              <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                <div className="rounded-lg bg-blue-50 dark:bg-blue-900/30 p-3"><p className="text-xs text-blue-700 dark:text-blue-300">Sugeridas</p><p className="text-xl font-bold text-blue-700 dark:text-blue-300">{strategies.sugeridas}</p></div>
                <div className="rounded-lg bg-amber-50 dark:bg-amber-900/30 p-3"><p className="text-xs text-amber-700 dark:text-amber-300">En curso</p><p className="text-xl font-bold text-amber-700 dark:text-amber-300">{strategies.en_curso}</p></div>
                <div className="rounded-lg bg-green-50 dark:bg-green-900/30 p-3"><p className="text-xs text-green-700 dark:text-green-300">Completadas</p><p className="text-xl font-bold text-green-700 dark:text-green-300">{strategies.completadas}</p></div>
                <div className="rounded-lg bg-red-50 dark:bg-red-900/30 p-3"><p className="text-xs text-red-700 dark:text-red-300">Críticas pend.</p><p className="text-xl font-bold text-red-700 dark:text-red-300">{strategies.criticas_pendientes}</p></div>
              </div>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  const widgetsForPanel = (widgets ?? available)
    .slice()
    .sort((a, b) => (a.orden ?? 0) - (b.orden ?? 0));

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-auto bg-gray-50 dark:bg-gray-900 transition-colors">
        <Navbar title="Dashboard de Retención de Talento" />
        <main className="flex-1 p-6">

          {/* Encabezado + acciones */}
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            {user?.companyName && (
              <div className="flex items-center gap-2">
                <span className="rounded-full bg-blue-50 dark:bg-blue-900/30 px-3 py-1 text-xs font-semibold text-blue-700 dark:text-blue-300">
                  {user.companyName}
                </span>
                <span className="text-xs text-gray-400 dark:text-gray-500">— datos de tu organización</span>
              </div>
            )}
            <div className="flex items-center gap-2">
              {/* Toggle moneda */}
              <div className="flex rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden text-xs font-medium">
                <button onClick={() => setCurrency('USD')} className={`px-3 py-1.5 transition-colors ${currency === 'USD' ? 'bg-blue-600 text-white' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'}`}>USD</button>
                <button onClick={() => setCurrency('GS')} className={`px-3 py-1.5 transition-colors ${currency === 'GS' ? 'bg-blue-600 text-white' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'}`}>Guaraníes</button>
              </div>
              {canConfig && (
                <button
                  onClick={() => setCustomizing((v) => !v)}
                  className="rounded-lg border border-gray-200 dark:border-gray-700 px-3 py-1.5 text-xs font-medium text-gray-600 dark:text-gray-300 transition hover:bg-gray-50 dark:hover:bg-gray-800"
                >
                  ⚙ Personalizar
                </button>
              )}
            </div>
          </div>

          {/* Panel de personalización */}
          {customizing && canConfig && (
            <div className="mb-6 rounded-xl border border-blue-200 bg-blue-50 dark:bg-blue-900/20 p-5">
              <div className="mb-3 flex items-center justify-between">
                <p className="text-sm font-semibold text-blue-800 dark:text-blue-200">Personalizar dashboard</p>
                <div className="flex gap-2">
                  <button onClick={resetConfig} disabled={savingCfg} className="text-xs text-gray-500 hover:underline disabled:opacity-50">Restaurar por defecto</button>
                  <button onClick={saveConfig} disabled={savingCfg} className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-50">
                    {savingCfg ? 'Guardando…' : 'Guardar'}
                  </button>
                </div>
              </div>
              <ul className="space-y-2">
                {widgetsForPanel.map((w, i) => (
                  <li key={w.key} className="flex items-center justify-between rounded-lg bg-white dark:bg-gray-800 px-3 py-2">
                    <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-200">
                      <input type="checkbox" checked={w.visible !== false} onChange={() => toggleWidget(w.key)} />
                      {w.label ?? w.key}
                    </label>
                    <div className="flex gap-1">
                      <button onClick={() => moveWidget(w.key, -1)} disabled={i === 0} className="rounded border border-gray-200 dark:border-gray-600 px-2 py-0.5 text-xs disabled:opacity-30">↑</button>
                      <button onClick={() => moveWidget(w.key, 1)} disabled={i === widgetsForPanel.length - 1} className="rounded border border-gray-200 dark:border-gray-600 px-2 py-0.5 text-xs disabled:opacity-30">↓</button>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Widgets en el orden configurado */}
          {orderedKeys.map((key) => renderWidget(key))}
        </main>
      </div>
    </div>
  );
}
