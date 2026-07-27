import { useEffect, useState } from 'react';
import AdminSidebar from '../../components/admin/AdminSidebar';
import api from '../../services/api';

const PLAN_COLORS = {
  BASICO:      'bg-gray-100 text-gray-700',
  PROFESIONAL: 'bg-blue-100 text-blue-700',
  EMPRESARIAL: 'bg-purple-100 text-purple-700',
};

export default function AdminCompanies() {
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading]     = useState(true);
  const [filterPlan, setFilterPlan]     = useState('');
  const [filterActive, setFilterActive] = useState('');

  useEffect(() => {
    const params = new URLSearchParams();
    if (filterPlan)   params.set('plan', filterPlan);
    if (filterActive) params.set('active', filterActive);

    api.get(`/admin/companies?${params.toString()}`)
      .then(({ data }) => setCompanies(data.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [filterPlan, filterActive]);

  return (
    <div className="flex h-screen overflow-hidden">
      <AdminSidebar />

      <div className="flex flex-1 flex-col overflow-auto bg-gray-50">
        <header className="bg-white border-b border-gray-100 px-8 py-4 flex items-center justify-between">
          <h1 className="text-lg font-bold text-gray-900">Empresas cliente</h1>
          <span className="text-sm text-gray-400">{companies.length} empresa(s)</span>
        </header>

        <main className="flex-1 p-8">
          {/* Filtros */}
          <div className="mb-5 flex flex-wrap gap-3">
            <select
              value={filterPlan}
              onChange={(e) => { setFilterPlan(e.target.value); setLoading(true); }}
              className="rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:border-gray-400"
            >
              <option value="">Todos los planes</option>
              <option value="BASICO">Básico</option>
              <option value="PROFESIONAL">Profesional</option>
              <option value="EMPRESARIAL">Empresarial</option>
            </select>
            <select
              value={filterActive}
              onChange={(e) => { setFilterActive(e.target.value); setLoading(true); }}
              className="rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:border-gray-400"
            >
              <option value="">Todos los estados</option>
              <option value="true">Activas</option>
              <option value="false">Inactivas</option>
            </select>
          </div>

          {/* Tabla */}
          <div className="rounded-xl bg-white border border-gray-100 shadow-sm overflow-hidden">
            {loading ? (
              <div className="flex justify-center py-20">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-900 border-t-transparent" />
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-xs uppercase text-gray-500">
                  <tr>
                    <th className="px-5 py-3 text-left">Empresa</th>
                    <th className="px-5 py-3 text-left">Plan</th>
                    <th className="px-5 py-3 text-left">Empleados</th>
                    <th className="px-5 py-3 text-left">Estado</th>
                    <th className="px-5 py-3 text-left">Registrada</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {companies.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-5 py-10 text-center text-sm text-gray-400">
                        No se encontraron empresas con los filtros aplicados.
                      </td>
                    </tr>
                  ) : companies.map((c) => (
                    <tr key={c.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-5 py-3 font-medium text-gray-900">{c.name}</td>
                      <td className="px-5 py-3">
                        <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${PLAN_COLORS[c.plan]}`}>
                          {c.plan}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-gray-600 tabular-nums">{c.employeeCount}</td>
                      <td className="px-5 py-3">
                        {c.active
                          ? <span className="inline-flex items-center gap-1 text-green-600 text-xs font-medium"><span className="h-1.5 w-1.5 rounded-full bg-green-500 inline-block" />Activa</span>
                          : <span className="inline-flex items-center gap-1 text-gray-400 text-xs"><span className="h-1.5 w-1.5 rounded-full bg-gray-300 inline-block" />Inactiva</span>
                        }
                      </td>
                      <td className="px-5 py-3 text-gray-400 text-xs">
                        {new Date(c.createdAt).toLocaleDateString('es-PY')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
