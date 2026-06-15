import { useEffect, useState } from 'react';
import Sidebar from '../components/layout/Sidebar';
import Navbar from '../components/layout/Navbar';
import api from '../services/api';

const RiskBadge = ({ score }) => {
  if (score >= 0.7) return <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-700">Alto</span>;
  if (score >= 0.4) return <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-700">Medio</span>;
  return <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-semibold text-green-700">Bajo</span>;
};

export default function Employees() {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get('/employees')
      .then(({ data }) => setEmployees(data.data))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-auto">
        <Navbar title="Gestión de Empleados" />
        <main className="flex-1 p-6">
          <div className="rounded-xl bg-white shadow-sm">
            <div className="border-b border-gray-100 px-6 py-4">
              <h2 className="text-base font-semibold text-gray-700">
                Listado de empleados ({employees.length})
              </h2>
            </div>

            {loading ? (
              <div className="flex justify-center py-16">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-500 border-t-transparent" />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-xs uppercase text-gray-500">
                    <tr>
                      <th className="px-6 py-3 text-left">Nombre</th>
                      <th className="px-6 py-3 text-left">Departamento</th>
                      <th className="px-6 py-3 text-left">Cargo</th>
                      <th className="px-6 py-3 text-left">Antigüedad</th>
                      <th className="px-6 py-3 text-left">Desempeño</th>
                      <th className="px-6 py-3 text-left">Riesgo de Fuga</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {employees.map((emp) => (
                      <tr key={emp.id} className="hover:bg-gray-50">
                        <td className="px-6 py-3 font-medium text-gray-900">{emp.name}</td>
                        <td className="px-6 py-3 text-gray-600">{emp.department}</td>
                        <td className="px-6 py-3 text-gray-600">{emp.position}</td>
                        <td className="px-6 py-3 text-gray-600">{emp.yearsInCompany} años</td>
                        <td className="px-6 py-3 text-gray-600">{emp.performanceScore}/5</td>
                        <td className="px-6 py-3">
                          <div className="flex items-center gap-2">
                            <RiskBadge score={emp.flightRisk} />
                            <span className="text-xs text-gray-400">
                              {(emp.flightRisk * 100).toFixed(0)}%
                            </span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
