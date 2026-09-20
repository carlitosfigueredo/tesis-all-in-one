import { useState, useEffect, useCallback } from 'react';
import AdminSidebar from '../../components/admin/AdminSidebar';
import api from '../../services/api';

// ─── Constantes ───────────────────────────────────────────────────────────────

const LEVEL_STYLES = {
  INFO:  { bg: 'bg-blue-50',  text: 'text-blue-700',  label: 'INFO'  },
  WARN:  { bg: 'bg-amber-50', text: 'text-amber-700', label: 'WARN'  },
  ERROR: { bg: 'bg-red-50',   text: 'text-red-700',   label: 'ERROR' },
  HTTP:  { bg: 'bg-gray-100', text: 'text-gray-600',  label: 'HTTP'  },
};

const LEVELS = ['INFO', 'WARN', 'ERROR', 'HTTP'];

const formatDate = (iso) => {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString('es-PY', {
      timeZone: 'America/Asuncion',
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit', second: '2-digit',
    });
  } catch {
    return iso;
  }
};

// ─── Componentes ──────────────────────────────────────────────────────────────

const LevelBadge = ({ level }) => {
  const s = LEVEL_STYLES[level] ?? LEVEL_STYLES.INFO;
  return (
    <span className={`rounded px-2 py-0.5 text-xs font-mono font-semibold ${s.bg} ${s.text}`}>
      {s.label}
    </span>
  );
};

// ─── Página principal ─────────────────────────────────────────────────────────

export default function AdminSystemLogs() {
  const [logs, setLogs]       = useState([]);
  const [loading, setLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(false);

  const [filters, setFilters] = useState({ level: '', limit: 200 });

  const fetchLogs = useCallback(async (f) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (f.level) params.set('level', f.level);
      params.set('limit', f.limit);

      const { data } = await api.get(`/admin/system-logs?${params.toString()}`);
      setLogs(data.data ?? []);
    } catch (err) {
      console.error('[SystemLogs]', err);
      setLogs([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchLogs(filters); }, [filters, fetchLogs]);

  // Auto-refresh cada 5s si esta activado
  useEffect(() => {
    if (!autoRefresh) return undefined;
    const id = setInterval(() => fetchLogs(filters), 5000);
    return () => clearInterval(id);
  }, [autoRefresh, filters, fetchLogs]);

  const setFilter = (key, value) =>
    setFilters((prev) => ({ ...prev, [key]: value }));

  return (
    <div className="flex h-screen overflow-hidden">
      <AdminSidebar />

      <div className="flex flex-1 flex-col overflow-auto bg-gray-50">

        {/* Header */}
        <header className="bg-white border-b border-gray-100 px-8 py-4 flex items-center justify-between flex-shrink-0">
          <div>
            <h1 className="text-lg font-bold text-gray-900">Logs del sistema</h1>
            <p className="text-xs text-gray-400 mt-0.5">
              Salida de la aplicación y peticiones HTTP — {logs.length} líneas
            </p>
          </div>
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
              <input
                type="checkbox"
                checked={autoRefresh}
                onChange={(e) => setAutoRefresh(e.target.checked)}
                className="rounded border-gray-300"
              />
              Auto-actualizar (5s)
            </label>
            <button
              onClick={() => fetchLogs(filters)}
              className="flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 transition-colors"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Actualizar
            </button>
          </div>
        </header>

        <main className="flex-1 p-6 space-y-4">

          {/* ── Filtros ── */}
          <div className="rounded-xl bg-white border border-gray-100 shadow-sm p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-3">Filtros</p>
            <div className="flex flex-wrap gap-3">
              <select
                value={filters.level}
                onChange={(e) => setFilter('level', e.target.value)}
                className="rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:border-gray-400 min-w-[160px]"
              >
                <option value="">Todos los niveles</option>
                {LEVELS.map((l) => (
                  <option key={l} value={l}>{l}</option>
                ))}
              </select>

              <select
                value={filters.limit}
                onChange={(e) => setFilter('limit', Number(e.target.value))}
                className="rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:border-gray-400"
              >
                <option value={100}>Últimas 100</option>
                <option value={200}>Últimas 200</option>
                <option value={500}>Últimas 500</option>
                <option value={1000}>Últimas 1000</option>
              </select>

              {filters.level && (
                <button
                  onClick={() => setFilter('level', '')}
                  className="rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-500 hover:bg-gray-50 transition-colors"
                >
                  Limpiar filtros
                </button>
              )}
            </div>
          </div>

          {/* ── Consola de logs ── */}
          <div className="rounded-xl bg-white border border-gray-100 shadow-sm overflow-hidden">
            {loading && logs.length === 0 ? (
              <div className="flex justify-center py-20">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-900 border-t-transparent" />
              </div>
            ) : logs.length === 0 ? (
              <div className="py-16 text-center text-sm text-gray-400">
                No hay registros disponibles.
              </div>
            ) : (
              <div className="divide-y divide-gray-50 font-mono text-xs">
                {logs.map((entry, idx) => (
                  <div
                    key={idx}
                    className="flex items-start gap-3 px-4 py-2 hover:bg-gray-50 transition-colors"
                  >
                    <span className="text-gray-400 whitespace-nowrap tabular-nums pt-0.5">
                      {formatDate(entry.ts)}
                    </span>
                    <span className="pt-0.5 flex-shrink-0">
                      <LevelBadge level={entry.level} />
                    </span>
                    <span className="text-gray-700 break-all whitespace-pre-wrap flex-1">
                      {entry.message}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <p className="text-xs text-gray-400 px-1">
            Los logs se guardan en el servidor (logs/app.log) con rotación automática. Se muestran las líneas más recientes primero.
          </p>

        </main>
      </div>
    </div>
  );
}
