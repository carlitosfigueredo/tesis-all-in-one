import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, LineChart, Line,
} from 'recharts';
import Sidebar from '../components/layout/Sidebar';
import Navbar from '../components/layout/Navbar';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

const RISK_COLORS = ['#22c55e', '#f59e0b', '#ef4444'];
const USD_TO_GS = 7500;

// Datos mock de tendencia histórica (últimos 6 meses)
// En producción vendrían de /api/employees/trend
const generateTrend = () => {
  const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun'];
  return months.map((mes, i) => ({
    mes,
    alto:  Math.round(8 + i * 1.5 + Math.random() * 3),
    medio: Math.round(15 + Math.sin(i) * 4 + Math.random() * 2),
    bajo:  Math.round(40 - i * 0.8 + Math.random() * 5),
  }));
};

const formatIncome = (usdValue, inGs) => {
  if (inGs) {
    const gs = Math.round(usdValue * USD_TO_GS);
    return `Gs. ${gs.toLocaleString('es-PY')}`;
  }
  return `$${usdValue.toLocaleString('en-US')}`;
};

const KpiCard = ({ label, value, sub, color = 'blue', onClick }) => {
  const colors = {
    blue:  'bg-blue-50 text-blue-700',
    red:   'bg-red-50 text-red-700',
    green: 'bg-green-50 text-green-700',
    amber: 'bg-amber-50 text-amber-700',
  };
  const interactive = !!onClick;
  return (
    <div
      onClick={onClick}
      className={`rounded-xl p-5 ${colors[color]} ${
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
  const { user } = useAuth();
  const [stats, setStats]       = useState(null);
  const [currency, setCurrency] = useState('USD');
  const [trend]                 = useState(generateTrend);

  useEffect(() => {
    api.get('/employees/stats').then(({ data }) => setStats(data.data));
  }, []);

  // KPIs desde el endpoint de estadísticas reales
  const total    = stats?.total        ?? '—';
  const highRisk = stats?.high_risk    ?? '—';
  const medRisk  = stats?.med_risk     ?? '—';
  const avgScore = stats?.avg_performance != null
    ? stats.avg_performance.toFixed(1)
    : '—';

  // Ingreso promedio mensual (si el endpoint lo provee)
  const avgIncome = stats?.avg_monthly_income != null
    ? formatIncome(stats.avg_monthly_income, currency === 'GS')
    : null;

  // Datos para gráficos
  const riskPieData = [
    { name: 'Riesgo Bajo',  value: stats?.low_risk  ?? 0 },
    { name: 'Riesgo Medio', value: stats?.med_risk   ?? 0 },
    { name: 'Riesgo Alto',  value: stats?.high_risk  ?? 0 },
  ];

  const deptData = (stats?.dept_avg_risk ?? []).map(({ department, avg_risk }) => ({
    dept: department,
    avg:  avg_risk,
  }));

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-auto">
        <Navbar title="Dashboard de Retención de Talento" />
        <main className="flex-1 p-6">

          {/* Encabezado con nombre de empresa */}
          {user?.companyName && (
            <div className="mb-5 flex items-center gap-2">
              <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
                {user.companyName}
              </span>
              <span className="text-xs text-gray-400">— datos de tu organización</span>
            </div>
          )}

          {/* Toggle de moneda */}
          <div className="mb-5 flex items-center justify-end gap-2">
            <span className="text-xs text-gray-400">Ingresos en:</span>
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
                Guaraníes (Gs.)
              </button>
            </div>
          </div>

          {/* KPIs */}
          <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
            <KpiCard label="Total Empleados" value={total} color="blue" />
            <KpiCard
              label="Riesgo Alto de Fuga"
              value={highRisk}
              sub="≥ 70% probabilidad"
              color="red"
              onClick={() => navigate('/employees?risk_level=ALTO')}
            />
            <KpiCard
              label="Riesgo Medio"
              value={medRisk}
              sub="40% — 70%"
              color="amber"
              onClick={() => navigate('/employees?risk_level=MEDIO')}
            />
            {avgIncome ? (
              <KpiCard
                label="Ingreso Promedio Mensual"
                value={avgIncome}
                sub={currency === 'GS' ? 'Tipo de cambio: Gs. 7.500/USD' : 'Dólares estadounidenses'}
                color="green"
              />
            ) : (
              <KpiCard label="Perf. Promedio" value={avgScore} sub="Escala 0-5" color="green" />
            )}
          </div>

            {/* Gráficos fila 1 */}
            <div className="grid gap-6 lg:grid-cols-2">
              {/* Pie - distribución de riesgo */}
              <div className="rounded-xl bg-white p-5 shadow-sm">
                <h2 className="mb-4 text-base font-semibold text-gray-700">Distribución de Riesgo de Fuga</h2>
                <ResponsiveContainer width="100%" height={260}>
                  <PieChart>
                    <Pie data={riskPieData} dataKey="value" nameKey="name" outerRadius={90} label>
                      {riskPieData.map((_, i) => (
                        <Cell key={i} fill={RISK_COLORS[i]} />
                      ))}
                    </Pie>
                    <Legend />
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              {/* Bar - riesgo por departamento */}
              <div className="rounded-xl bg-white p-5 shadow-sm">
                <h2 className="mb-4 text-base font-semibold text-gray-700">Riesgo Promedio por Departamento</h2>
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={deptData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="dept" tick={{ fontSize: 12 }} />
                    <YAxis domain={[0, 1]} tick={{ fontSize: 12 }} />
                    <Tooltip formatter={(v) => `${(v * 100).toFixed(0)}%`} />
                    <Bar dataKey="avg" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Gráfico de tendencia histórica */}
            <div className="rounded-xl bg-white p-5 shadow-sm">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-base font-semibold text-gray-700">Tendencia Histórica de Riesgo</h2>
                <span className="text-xs text-gray-400">Últimos 6 meses · datos estimados</span>
              </div>
              <ResponsiveContainer width="100%" height={240}>
                <LineChart data={trend} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="mes" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="alto"  name="Riesgo Alto"  stroke="#ef4444" strokeWidth={2} dot={{ r: 3 }} />
                  <Line type="monotone" dataKey="medio" name="Riesgo Medio" stroke="#f59e0b" strokeWidth={2} dot={{ r: 3 }} />
                  <Line type="monotone" dataKey="bajo"  name="Riesgo Bajo"  stroke="#22c55e" strokeWidth={2} dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
        </main>
      </div>
    </div>
  );
}
