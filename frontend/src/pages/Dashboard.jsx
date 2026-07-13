import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts';
import Sidebar from '../components/layout/Sidebar';
import Navbar from '../components/layout/Navbar';
import api from '../services/api';

const RISK_COLORS = ['#22c55e', '#f59e0b', '#ef4444'];

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
  const [stats, setStats] = useState(null);

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
            <KpiCard label="Perf. Promedio" value={avgScore} sub="Escala 0-5" color="green" />
          </div>

          {/* Gráficos */}
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
        </main>
      </div>
    </div>
  );
}
