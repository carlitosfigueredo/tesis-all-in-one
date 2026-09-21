import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/layout/Sidebar';
import Navbar from '../components/layout/Navbar';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

const ESTADO_TABS = [
  { key: '',           label: 'Todas' },
  { key: 'SUGERIDA',   label: 'Sugeridas' },
  { key: 'EN_CURSO',   label: 'En curso' },
  { key: 'COMPLETADA', label: 'Completadas' },
  { key: 'DESCARTADA', label: 'Descartadas' },
];

const ESTADO_BADGE = {
  SUGERIDA:   'bg-blue-50 text-blue-700 border-blue-200',
  EN_CURSO:   'bg-amber-50 text-amber-700 border-amber-200',
  COMPLETADA: 'bg-green-50 text-green-700 border-green-200',
  DESCARTADA: 'bg-gray-100 text-gray-500 border-gray-200',
};

const PRIORIDAD_DOT = {
  CRITICA: 'bg-red-600', ALTA: 'bg-orange-500', MEDIA: 'bg-amber-400', BAJA: 'bg-gray-400',
};

const ACCIONES = {
  SUGERIDA:   [{ estado: 'EN_CURSO', label: 'Iniciar' }, { estado: 'DESCARTADA', label: 'Descartar' }],
  EN_CURSO:   [{ estado: 'COMPLETADA', label: 'Completar' }, { estado: 'DESCARTADA', label: 'Descartar' }],
  COMPLETADA: [{ estado: 'EN_CURSO', label: 'Reabrir' }],
  DESCARTADA: [{ estado: 'SUGERIDA', label: 'Restaurar' }],
};

const SummaryCard = ({ label, value, color }) => (
  <div className={`rounded-xl p-4 ${color}`}>
    <p className="text-xs font-medium opacity-75">{label}</p>
    <p className="mt-1 text-2xl font-bold">{value}</p>
  </div>
);

export default function Retention() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const canManage = !!user?.permissions?.includes('retention.manage')
    || !!user?.roles?.includes('SUPER_ADMIN')
    || !!user?.roles?.includes('COMPANY_ADMIN');

  const [summary, setSummary] = useState(null);
  const [items, setItems]     = useState([]);
  const [estado, setEstado]   = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy]       = useState(false);
  const [error, setError]     = useState('');

  const loadSummary = useCallback(async () => {
    try {
      const { data } = await api.get('/retention/strategies/summary');
      setSummary(data.data);
    } catch { /* no bloquea */ }
  }, []);

  const loadList = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const { data } = await api.get('/retention/strategies', {
        params: { estado: estado || undefined, page_size: 200 },
      });
      setItems(data.data ?? []);
    } catch {
      setError('No se pudieron cargar las estrategias.');
    } finally {
      setLoading(false);
    }
  }, [estado]);

  useEffect(() => { loadSummary(); }, [loadSummary]);
  useEffect(() => { loadList(); }, [loadList]);

  const cambiarEstado = async (id, nuevo) => {
    setBusy(true);
    try {
      await api.patch(`/retention/strategies/${id}`, { estado: nuevo });
      await Promise.all([loadList(), loadSummary()]);
    } catch (e) {
      setError(e.response?.data?.message || 'No se pudo actualizar.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-auto bg-gray-50 dark:bg-gray-900 transition-colors">
        <Navbar title="Estrategias de Retención" />
        <main className="flex-1 p-6">

          {/* Resumen */}
          <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-5">
            <SummaryCard label="Total" value={summary?.total ?? '—'} color="bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200" />
            <SummaryCard label="Sugeridas" value={summary?.sugeridas ?? '—'} color="bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300" />
            <SummaryCard label="En curso" value={summary?.en_curso ?? '—'} color="bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300" />
            <SummaryCard label="Completadas" value={summary?.completadas ?? '—'} color="bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300" />
            <SummaryCard label="Críticas pendientes" value={summary?.criticas_pendientes ?? '—'} color="bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300" />
          </div>

          {/* Tabs de estado */}
          <div className="mb-4 flex flex-wrap gap-2">
            {ESTADO_TABS.map((t) => (
              <button
                key={t.key}
                onClick={() => setEstado(t.key)}
                className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                  estado === t.key
                    ? 'bg-blue-600 text-white'
                    : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {error && <div className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

          {loading ? (
            <div className="flex justify-center py-20">
              <div className="h-10 w-10 animate-spin rounded-full border-4 border-blue-500 border-t-transparent" />
            </div>
          ) : items.length === 0 ? (
            <div className="rounded-xl bg-white dark:bg-gray-800 p-10 text-center text-sm text-gray-500">
              No hay estrategias{estado ? ' en este estado' : ''}. Generá estrategias desde el detalle de
              un empleado en riesgo.
            </div>
          ) : (
            <div className="overflow-hidden rounded-xl bg-white dark:bg-gray-800 shadow-sm">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-gray-100 dark:border-gray-700 text-xs uppercase text-gray-400">
                  <tr>
                    <th className="px-4 py-3">Empleado</th>
                    <th className="px-4 py-3">Estrategia</th>
                    <th className="px-4 py-3">Estado</th>
                    <th className="px-4 py-3">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((s) => (
                    <tr key={s.id} className="border-b border-gray-50 dark:border-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-700/30">
                      <td className="px-4 py-3">
                        {s.employee ? (
                          <button
                            onClick={() => navigate(`/employees/${s.employee.id}`)}
                            className="text-left"
                          >
                            <span className="font-medium text-blue-600 hover:underline">
                              {s.employee.nombre} {s.employee.apellido}
                            </span>
                            <span className="block text-xs text-gray-400">
                              {s.employee.rol_tecnologico} · {s.employee.seniority}
                              {typeof s.employee.riesgo_desercion === 'number' &&
                                ` · ${Math.round(s.employee.riesgo_desercion * 100)}% riesgo`}
                            </span>
                          </button>
                        ) : '—'}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className={`inline-block h-2 w-2 rounded-full ${PRIORIDAD_DOT[s.prioridad] ?? 'bg-gray-400'}`} />
                          <span className="font-medium text-gray-800 dark:text-gray-100">{s.titulo}</span>
                        </div>
                        <p className="mt-0.5 text-xs text-gray-500 max-w-md leading-snug">{s.descripcion}</p>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`rounded-full border px-2 py-0.5 text-xs font-semibold ${ESTADO_BADGE[s.estado] ?? ESTADO_BADGE.SUGERIDA}`}>
                          {s.estado}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {canManage ? (
                          <div className="flex flex-wrap gap-1.5">
                            {(ACCIONES[s.estado] ?? []).map((a) => (
                              <button
                                key={a.estado}
                                onClick={() => cambiarEstado(s.id, a.estado)}
                                disabled={busy}
                                className="rounded border border-gray-200 dark:border-gray-600 px-2 py-1 text-xs font-medium text-gray-700 dark:text-gray-200 transition hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50"
                              >
                                {a.label}
                              </button>
                            ))}
                          </div>
                        ) : (
                          <span className="text-xs text-gray-400">Solo lectura</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
