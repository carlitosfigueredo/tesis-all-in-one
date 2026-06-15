import { useEffect, useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts';
import Sidebar from '../components/layout/Sidebar';
import Navbar from '../components/layout/Navbar';
import api from '../services/api';

const RISK_COLORS = ['#22c55e', '#f59e0b', '#ef4444'];

const KpiCard = ({ label, value, sub, color = 'blue' }) => {
  const colors = {
    blue: 'bg-blue-50 text-blue-700',
    red: 'bg-red-50 text-red-700',
    green: 'bg-green-50 text-green-700',
    amber: 'bg-amber-50 text-amber-700',
  };
  return (
    <div className={`rounded-xl p-5 ${colors[color]}`}>
      <p className="text-sm font-medium opacity-75">{label}</p>
      <p className="mt-1 text-3xl font-bold">{value}</p>
      {sub && <p className="mt-1 text-xs opacity-60">{sub}</p>}
    </div>
  );
};

export default function Dashboard() {
  const [employees, setEmployees] = useState([]);

  useEffect(() => {
    api.get('/employees').then(({ data }) => setEmployees(data.data));
  }, []);

  // KPIs calculados desde los datos
  const highRisk = employees.filter((e) => e.flightRisk >= 0.7).length;
  const medRisk = employees.filter((e) => e.flightRisk >= 0.4 && e.flightRisk < 0.7).length;
  const lowRisk = employees.filter((e) => e.flightRisk < 0.4).length;

  const avgScore =
    employees.length > 0
      ? (employees.reduce((s, e) => s + e.performanceScore, 0) / employees.length).toFixed(1)
      : '—';

  // Datos para gráficos
  const riskPieData = [
    { name: 'Riesgo Bajo', value: lowRisk },
    { name: 'Riesgo Medio', value: medRisk },
    { name: 'Riesgo Alto', value: highRisk },
  ];

  const deptData = [...new Set(employees.map((e) => e.department))].map((dept) => {
    const group = employees.filter((e) => e.department === dept);
    return {
      dept,
      avg: parseFloat(
        (group.reduce((s, e) => s + e.flightRisk, 0) / group.length).toFixed(2)
      ),
    };
  });

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-auto">
        <Navbar title="Dashboard de Retención de Talento" />
        <main className="flex-1 p-6">

          {/* KPIs */}
          <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
            <KpiCard label="Total Empleados" value={employees.length} color="blue" />
            <KpiCard label="Riesgo Alto de Fuga" value={highRisk} sub="≥ 70% probabilidad" color="red" />
            <KpiCard label="Riesgo Medio" value={medRisk} sub="40% — 70%" color="amber" />
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
