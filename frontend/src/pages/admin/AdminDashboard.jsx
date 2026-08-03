import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AdminSidebar from '../../components/admin/AdminSidebar';
import api from '../../services/api';

const PLAN_COLORS = {
  BASICO:      'bg-gray-100 text-gray-700',
  PROFESIONAL: 'bg-blue-100 text-blue-700',
  CORPORATIVO: 'bg-purple-100 text-purple-700',
};

const KpiCard = ({ label, value, sub, color = 'blue' }) => {
  const colors = {
    blue:   'bg-blue-50 text-blue-700',
    green:  'bg-green-50 text-green-700',
    purple: 'bg-purple-50 text-purple-700',
    gray:   'bg-gray-50 text-gray-700',
  };
  return (
    <div className="rounded-xl bg-white border border-gray-100 p-6 shadow-sm">
      <p className="text-sm text-gray-500 mb-1">{label}</p>
      <p className={`text-3xl font-extrabold rounded-lg inline-block px-2 py-0.5 ${colors[color]}`}>
        {value}
      </p>
      {sub && <p className="mt-1 text-xs text-gray-400">{sub}</p>}
    </div>
  );
};

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [stats, setStats]       = useState(null);
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    Promise.all([
      api.get('/admin/stats'),
      api.get('/admin/companies'),
    ])
      .then(([statsRes, companiesRes]) => {
        setStats(statsRes.data.data);
        setCompanies(companiesRes.data.data.slice(0, 5)); // últimas 5
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="flex h-screen overflow-hidden">
      <AdminSidebar />

      <div className="flex flex-1 flex-col overflow-auto bg-gray-50">
        {/* Topbar */}
        <header className="bg-white border-b border-gray-100 px-8 py-4 flex items-center justify-between">
          <h1 className="text-lg font-bold text-gray-900">Resumen de la plataforma</h1>
          <span className="rounded-full bg-gray-900 px-3 py-1 text-xs font-semibold text-white">
            SUPER ADMIN
          </span>
        </header>

        <main className="flex-1 p-8 space-y-8">
          {loading ? (
            <div className="flex justify-center py-20">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-900 border-t-transparent" />
            </div>
          ) : (
            <>
              {/* KPIs */}
              <section>
                <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-gray-400">
                  Métricas globales
                </h2>
                <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                  <KpiCard label="Empresas totales"  value={stats?.totalCompanies ?? 0}  color="blue"   />
                  <KpiCard label="Empresas activas"  value={stats?.activeCompanies ?? 0} sub={`${stats?.totalCompanies - stats?.activeCompanies} inactivas`} color="green" />
                  <KpiCard label="Empleados en sistema" value={stats?.totalEmployees ?? 0} color="purple" />
                  <KpiCard label="Plan Empresarial"  value={stats?.byPlan?.EMPRESARIAL ?? 0} sub="clientes premium" color="gray" />
                </div>
              </section>

              {/* Distribución por plan */}
              <section>
                <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-gray-400">
                  Distribución por plan
                </h2>
                <div className="grid grid-cols-3 gap-4">
                  {['BASICO', 'PROFESIONAL', 'EMPRESARIAL'].map((plan) => (
                    <div key={plan} className="rounded-xl bg-white border border-gray-100 p-5 shadow-sm text-center">
                      <span className={`inline-block rounded-full px-3 py-1 text-xs font-semibold mb-3 ${PLAN_COLORS[plan]}`}>
                        {plan}
                      </span>
                      <p className="text-4xl font-extrabold text-gray-900">
                        {stats?.byPlan?.[plan] ?? 0}
                      </p>
                      <p className="mt-1 text-xs text-gray-400">empresas</p>
                    </div>
                  ))}
                </div>
              </section>

              {/* Últimas empresas */}
              <section>
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-400">
                    Empresas registradas
                  </h2>
                  <button
                    onClick={() => navigate('/admin/companies')}
                    className="text-xs text-blue-600 hover:underline"
                  >
                    Ver todas →
                  </button>
                </div>
                <div className="rounded-xl bg-white border border-gray-100 shadow-sm overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 text-xs uppercase text-gray-500">
                      <tr>
                        <th className="px-5 py-3 text-left">Empresa</th>
                        <th className="px-5 py-3 text-left">Plan</th>
                        <th className="px-5 py-3 text-left">Empleados</th>
                        <th className="px-5 py-3 text-left">Estado</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {companies.map((c) => (
                        <tr key={c.id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-5 py-3 font-medium text-gray-900">{c.name}</td>
                          <td className="px-5 py-3">
                            <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${PLAN_COLORS[c.plan]}`}>
                              {c.plan}
                            </span>
                          </td>
                          <td className="px-5 py-3 text-gray-600">{c.employeeCount}</td>
                          <td className="px-5 py-3">
                            {c.active
                              ? <span className="text-green-600 font-medium text-xs">Activa</span>
                              : <span className="text-gray-400 text-xs">Inactiva</span>
                            }
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            </>
          )}
        </main>
      </div>
    </div>
  );
}
