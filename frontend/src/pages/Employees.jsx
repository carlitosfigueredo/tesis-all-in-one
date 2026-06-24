import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/layout/Sidebar';
import Navbar from '../components/layout/Navbar';
import api from '../services/api';

// ─── Componentes de UI ────────────────────────────────────────────────────────

const RiskBadge = ({ level }) => {
  const styles = {
    ALTO:  'bg-red-100 text-red-700',
    MEDIO: 'bg-amber-100 text-amber-700',
    BAJO:  'bg-green-100 text-green-700',
  };
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${styles[level] ?? styles.BAJO}`}>
      {level}
    </span>
  );
};

const SatisfactionDots = ({ value, max = 4 }) => (
  <div className="flex gap-0.5">
    {Array.from({ length: max }).map((_, i) => (
      <span
        key={i}
        className={`h-2 w-2 rounded-full ${i < value ? 'bg-blue-500' : 'bg-gray-200'}`}
      />
    ))}
  </div>
);

// ─── Página principal ─────────────────────────────────────────────────────────

export default function Employees() {
  const navigate = useNavigate();
  const [employees, setEmployees] = useState([]);
  const [meta, setMeta]           = useState({ total: 0, page: 1, total_pages: 1 });
  const [loading, setLoading]     = useState(true);

  const [filters, setFilters] = useState({
    page:       1,
    page_size:  20,
    search:     '',
    department: '',
    risk_level: '',
    attrition:  '',
  });

  const fetchEmployees = useCallback(async (f) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (f.page)       params.set('page', f.page);
      if (f.page_size)  params.set('page_size', f.page_size);
      if (f.search)     params.set('search', f.search);
      if (f.department) params.set('department', f.department);
      if (f.risk_level) params.set('risk_level', f.risk_level);
      if (f.attrition)  params.set('attrition', f.attrition === 'true');

      const { data } = await api.get(`/employees?${params.toString()}`);
      setEmployees(data.data);
      setMeta({ total: data.total, page: data.page, total_pages: data.total_pages });
    } catch {
      setEmployees([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchEmployees(filters); }, [filters, fetchEmployees]);

  const setFilter = (key, value) =>
    setFilters((prev) => ({ ...prev, [key]: value, page: 1 }));

  const setPage = (p) => setFilters((prev) => ({ ...prev, page: p }));

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-auto">
        <Navbar title="Empleados — Dataset IBM HR" />
        <main className="flex-1 p-6">

          {/* ── Filtros ── */}
          <div className="mb-4 flex flex-wrap items-center gap-3">
            <input
              type="text"
              placeholder="Buscar por rol o departamento…"
              value={filters.search}
              onChange={(e) => setFilter('search', e.target.value)}
              className="rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100 w-64"
            />
            <select
              value={filters.department}
              onChange={(e) => setFilter('department', e.target.value)}
              className="rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-blue-400 focus:outline-none"
            >
              <option value="">Todos los departamentos</option>
              <option value="Sales">Ventas</option>
              <option value="Research & Development">I+D</option>
              <option value="Human Resources">Recursos Humanos</option>
            </select>
            <select
              value={filters.risk_level}
              onChange={(e) => setFilter('risk_level', e.target.value)}
              className="rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-blue-400 focus:outline-none"
            >
              <option value="">Todos los riesgos</option>
              <option value="ALTO">Riesgo Alto</option>
              <option value="MEDIO">Riesgo Medio</option>
              <option value="BAJO">Riesgo Bajo</option>
            </select>
            <select
              value={filters.attrition}
              onChange={(e) => setFilter('attrition', e.target.value)}
              className="rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-blue-400 focus:outline-none"
            >
              <option value="">Todos</option>
              <option value="true">Renunciaron (Attrition = Yes)</option>
              <option value="false">Permanecieron</option>
            </select>
            <span className="ml-auto text-sm text-gray-400">
              {meta.total} empleados
            </span>
          </div>

          {/* ── Tabla ── */}
          <div className="rounded-xl bg-white shadow-sm overflow-hidden">
            {loading ? (
              <div className="flex justify-center py-20">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent" />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-xs uppercase text-gray-500">
                    <tr>
                      <th className="px-4 py-3 text-left">#</th>
                      <th className="px-4 py-3 text-left">Rol / Cargo</th>
                      <th className="px-4 py-3 text-left">Departamento</th>
                      <th className="px-4 py-3 text-left">Edad</th>
                      <th className="px-4 py-3 text-left">Antigüedad</th>
                      <th className="px-4 py-3 text-left">Ingreso</th>
                      <th className="px-4 py-3 text-left">Satisfacción</th>
                      <th className="px-4 py-3 text-left">Horas extra</th>
                      <th className="px-4 py-3 text-left">Attrition</th>
                      <th className="px-4 py-3 text-left">Riesgo fuga</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {employees.map((emp) => (
                      <tr
                        key={emp.id}
                        onClick={() => navigate(`/employees/${emp.id}`)}
                        className="cursor-pointer hover:bg-blue-50 transition-colors"
                      >
                        <td className="px-4 py-3 text-gray-400 text-xs">{emp.id}</td>
                        <td className="px-4 py-3 font-medium text-gray-900">{emp.job_role}</td>
                        <td className="px-4 py-3 text-gray-600">{emp.department}</td>
                        <td className="px-4 py-3 text-gray-600">{emp.age}</td>
                        <td className="px-4 py-3 text-gray-600">{emp.years_at_company} años</td>
                        <td className="px-4 py-3 text-gray-600">
                          ${emp.monthly_income.toLocaleString()}
                        </td>
                        <td className="px-4 py-3">
                          <SatisfactionDots value={emp.job_satisfaction} />
                        </td>
                        <td className="px-4 py-3">
                          {emp.overtime
                            ? <span className="text-amber-600 font-medium">Sí</span>
                            : <span className="text-gray-400">No</span>}
                        </td>
                        <td className="px-4 py-3">
                          {emp.attrition
                            ? <span className="rounded-full bg-red-50 px-2 py-0.5 text-xs text-red-600 font-medium">Renunció</span>
                            : <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-500">Permanece</span>}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <RiskBadge level={emp.risk_level} />
                            <span className="text-xs text-gray-400">
                              {(emp.flight_risk * 100).toFixed(0)}%
                            </span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* ── Paginación ── */}
            {!loading && meta.total_pages > 1 && (
              <div className="flex items-center justify-between border-t border-gray-100 px-4 py-3 text-sm text-gray-500">
                <span>Página {meta.page} de {meta.total_pages}</span>
                <div className="flex gap-2">
                  <button
                    onClick={() => setPage(meta.page - 1)}
                    disabled={meta.page <= 1}
                    className="rounded px-3 py-1 hover:bg-gray-100 disabled:opacity-40"
                  >
                    ← Anterior
                  </button>
                  <button
                    onClick={() => setPage(meta.page + 1)}
                    disabled={meta.page >= meta.total_pages}
                    className="rounded px-3 py-1 hover:bg-gray-100 disabled:opacity-40"
                  >
                    Siguiente →
                  </button>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
