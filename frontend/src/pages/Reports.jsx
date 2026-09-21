import { useEffect, useState } from 'react';
import Sidebar from '../components/layout/Sidebar';
import Navbar from '../components/layout/Navbar';
import api from '../services/api';

const fmtGs = (n) => `Gs. ${Number(n || 0).toLocaleString('es-PY')}`;

const StatCard = ({ label, value, color }) => (
  <div className={`rounded-xl p-4 ${color}`}>
    <p className="text-xs font-medium opacity-75">{label}</p>
    <p className="mt-1 text-2xl font-bold">{value}</p>
  </div>
);

const GroupTable = ({ title, rows }) => (
  <div className="rounded-xl bg-white dark:bg-gray-800 p-5 shadow-sm">
    <p className="mb-3 text-sm font-semibold text-gray-700 dark:text-gray-200">{title}</p>
    {(!rows || rows.length === 0) ? (
      <p className="text-xs text-gray-400">Sin datos.</p>
    ) : (
      <table className="w-full text-left text-sm">
        <thead className="text-xs uppercase text-gray-400">
          <tr>
            <th className="pb-2">Grupo</th>
            <th className="pb-2 text-right">Empleados</th>
            <th className="pb-2 text-right">Riesgo prom.</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.grupo} className="border-t border-gray-50 dark:border-gray-700/50">
              <td className="py-1.5 text-gray-700 dark:text-gray-200">{r.grupo}</td>
              <td className="py-1.5 text-right text-gray-600 dark:text-gray-300">{r.count}</td>
              <td className="py-1.5 text-right font-medium text-gray-700 dark:text-gray-200">{r.riesgo_promedio}%</td>
            </tr>
          ))}
        </tbody>
      </table>
    )}
  </div>
);

export default function Reports() {
  const [report, setReport]   = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');
  const [downloading, setDownloading] = useState('');

  useEffect(() => {
    api.get('/reports/retention')
      .then(({ data }) => setReport(data.data))
      .catch(() => setError('No se pudo cargar el reporte.'))
      .finally(() => setLoading(false));
  }, []);

  // Descarga un archivo binario (PDF/Excel) desde el backend.
  const download = async (formato) => {
    setDownloading(formato);
    setError('');
    try {
      const ext = formato === 'pdf' ? 'pdf' : 'excel';
      const res = await api.get(`/reports/retention/${ext}`, { responseType: 'blob' });
      const blob = new Blob([res.data], {
        type: formato === 'pdf'
          ? 'application/pdf'
          : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `reporte-retencion-${new Date().toISOString().slice(0, 10)}.${formato === 'pdf' ? 'pdf' : 'xlsx'}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch {
      setError(`No se pudo descargar el reporte ${formato.toUpperCase()}.`);
    } finally {
      setDownloading('');
    }
  };

  const r = report?.resumen;

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-auto bg-gray-50 dark:bg-gray-900 transition-colors">
        <Navbar title="Reportes" />
        <main className="flex-1 p-6">

          {/* Header + descargas */}
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100">Reporte de Retención de Talento</h2>
              <p className="text-sm text-gray-500">
                Resumen del riesgo de deserción y estrategias de tu empresa.
                {report?.generadoEn && ` Generado: ${new Date(report.generadoEn).toLocaleString('es-PY')}`}
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => download('pdf')}
                disabled={downloading !== '' || loading}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-700 disabled:opacity-50"
              >
                {downloading === 'pdf' ? 'Generando…' : '⬇ Descargar PDF'}
              </button>
              <button
                onClick={() => download('excel')}
                disabled={downloading !== '' || loading}
                className="rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-green-700 disabled:opacity-50"
              >
                {downloading === 'excel' ? 'Generando…' : '⬇ Descargar Excel'}
              </button>
            </div>
          </div>

          {error && <div className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

          {loading ? (
            <div className="flex justify-center py-20">
              <div className="h-10 w-10 animate-spin rounded-full border-4 border-blue-500 border-t-transparent" />
            </div>
          ) : report && (
            <>
              {/* KPIs */}
              <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
                <StatCard label="Total empleados" value={r.total} color="bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200" />
                <StatCard label="En riesgo (crítico + alto)" value={r.en_riesgo} color="bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300" />
                <StatCard label="Riesgo promedio" value={`${r.riesgo_promedio}%`} color="bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300" />
                <StatCard label="Salario promedio" value={fmtGs(r.salario_promedio)} color="bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300" />
              </div>

              {/* Distribución por nivel */}
              <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
                <StatCard label="Crítico" value={r.criticos} color="bg-white dark:bg-gray-800 text-red-700 dark:text-red-300" />
                <StatCard label="Alto" value={r.altos} color="bg-white dark:bg-gray-800 text-orange-700 dark:text-orange-300" />
                <StatCard label="Medio" value={r.medios} color="bg-white dark:bg-gray-800 text-amber-700 dark:text-amber-300" />
                <StatCard label="Bajo" value={r.bajos} color="bg-white dark:bg-gray-800 text-green-700 dark:text-green-300" />
              </div>

              {/* Segmentaciones */}
              <div className="mb-6 grid gap-4 lg:grid-cols-3">
                <GroupTable title="Riesgo por rol" rows={report.por_rol} />
                <GroupTable title="Riesgo por seniority" rows={report.por_seniority} />
                <GroupTable title="Riesgo por modalidad" rows={report.por_modalidad} />
              </div>

              {/* Estrategias */}
              <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
                <StatCard label="Estrategias sugeridas" value={report.estrategias.SUGERIDA} color="bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300" />
                <StatCard label="En curso" value={report.estrategias.EN_CURSO} color="bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300" />
                <StatCard label="Completadas" value={report.estrategias.COMPLETADA} color="bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300" />
                <StatCard label="Descartadas" value={report.estrategias.DESCARTADA} color="bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400" />
              </div>

              {/* Top riesgo */}
              <div className="rounded-xl bg-white dark:bg-gray-800 p-5 shadow-sm">
                <p className="mb-3 text-sm font-semibold text-gray-700 dark:text-gray-200">Empleados con mayor riesgo</p>
                {report.top_riesgo.length === 0 ? (
                  <p className="text-xs text-gray-400">Sin empleados cargados.</p>
                ) : (
                  <table className="w-full text-left text-sm">
                    <thead className="text-xs uppercase text-gray-400">
                      <tr>
                        <th className="pb-2">Código</th>
                        <th className="pb-2">Nombre</th>
                        <th className="pb-2">Rol</th>
                        <th className="pb-2 text-right">Riesgo</th>
                        <th className="pb-2 text-right">Nivel</th>
                      </tr>
                    </thead>
                    <tbody>
                      {report.top_riesgo.map((e) => (
                        <tr key={e.codigo} className="border-t border-gray-50 dark:border-gray-700/50">
                          <td className="py-1.5 text-gray-500">{e.codigo}</td>
                          <td className="py-1.5 text-gray-700 dark:text-gray-200">{e.nombre}</td>
                          <td className="py-1.5 text-gray-600 dark:text-gray-300">{e.rol} · {e.seniority}</td>
                          <td className="py-1.5 text-right font-medium text-gray-700 dark:text-gray-200">{e.riesgo_pct}%</td>
                          <td className="py-1.5 text-right text-gray-600 dark:text-gray-300">{e.nivel}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </>
          )}
        </main>
      </div>
    </div>
  );
}
