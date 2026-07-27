import { useEffect, useState, useCallback } from 'react';
import AdminSidebar from '../../components/admin/AdminSidebar';
import api from '../../services/api';

// ─── Constantes ───────────────────────────────────────────────────────────────

const STATUS_STYLES = {
  SUCCESS: { bg: 'bg-green-50',  text: 'text-green-700',  dot: 'bg-green-500',  label: 'Éxito'      },
  FAILURE: { bg: 'bg-red-50',    text: 'text-red-700',    dot: 'bg-red-500',    label: 'Fallo'      },
  WARNING: { bg: 'bg-amber-50',  text: 'text-amber-700',  dot: 'bg-amber-400',  label: 'Advertencia'},
};

const ACTION_GROUPS = {
  Auth:       ['LOGIN_SUCCESS', 'LOGIN_FAILED', 'LOGIN_BLOCKED', 'LOGOUT', 'TOKEN_REFRESHED'],
  Contraseña: ['PASSWORD_RESET_REQUESTED', 'PASSWORD_RESET_COMPLETED', 'PASSWORD_RESET_FAILED',
               'PASSWORD_CHANGED', 'ACCOUNT_LOCKED', 'ACCOUNT_UNLOCKED'],
  Empleados:  ['EMPLOYEE_VIEWED', 'EMPLOYEE_LIST_FILTERED', 'EMPLOYEE_IMPORT',
               'EMPLOYEE_CREATED', 'EMPLOYEE_UPDATED', 'EMPLOYEE_DELETED'],
  Sistema:    ['UNAUTHORIZED_ACCESS', 'RATE_LIMIT_EXCEEDED'],
};

const ALL_ACTIONS = Object.values(ACTION_GROUPS).flat();

const formatDate = (iso) =>
  new Date(iso).toLocaleString('es-PY', {
    timeZone: 'America/Asuncion',
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  });

// ─── Componentes ──────────────────────────────────────────────────────────────

const StatusBadge = ({ status }) => {
  const s = STATUS_STYLES[status] ?? STATUS_STYLES.WARNING;
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-semibold ${s.bg} ${s.text}`}>
      <span className={`h-1.5 w-1.5 rounded-full flex-shrink-0 ${s.dot}`} />
      {s.label}
    </span>
  );
};

const ActionBadge = ({ action }) => {
  const isAuth    = ACTION_GROUPS.Auth.includes(action);
  const isPass    = ACTION_GROUPS.Contraseña.includes(action);
  const isEmp     = ACTION_GROUPS.Empleados.includes(action);
  const colorClass = isAuth
    ? 'bg-blue-50 text-blue-700'
    : isPass
    ? 'bg-purple-50 text-purple-700'
    : isEmp
    ? 'bg-teal-50 text-teal-700'
    : 'bg-gray-100 text-gray-600';

  return (
    <span className={`rounded px-2 py-0.5 text-xs font-mono font-medium ${colorClass}`}>
      {action}
    </span>
  );
};

// Fila expandible con detalle del log
const LogRow = ({ log }) => {
  const [open, setOpen] = useState(false);

  return (
    <>
      <tr
        className="hover:bg-gray-50 cursor-pointer transition-colors"
        onClick={() => setOpen((v) => !v)}
      >
        <td className="px-4 py-3 text-xs text-gray-400 whitespace-nowrap tabular-nums">
          {formatDate(log.createdAt)}
        </td>
        <td className="px-4 py-3">
          <ActionBadge action={log.action} />
        </td>
        <td className="px-4 py-3 text-xs text-gray-500">{log.resource ?? '—'}</td>
        <td className="px-4 py-3 text-xs text-gray-500 font-mono truncate max-w-[120px]">
          {log.userId ?? <span className="text-gray-300">anónimo</span>}
        </td>
        <td className="px-4 py-3 text-xs text-gray-400">{log.ipAddress ?? '—'}</td>
        <td className="px-4 py-3"><StatusBadge status={log.status} /></td>
        <td className="px-4 py-3 text-gray-400 text-xs">
          {open ? '▲' : '▼'}
        </td>
      </tr>

      {open && (
        <tr className="bg-gray-50">
          <td colSpan={7} className="px-6 py-4">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 text-xs">

              {/* Info básica */}
              <div className="space-y-1.5">
                <p className="font-semibold text-gray-500 uppercase tracking-wide mb-2">Detalles</p>
                <p><span className="text-gray-400">ID log:</span> <span className="font-mono text-gray-700">{log.id}</span></p>
                {log.resourceId && <p><span className="text-gray-400">ID recurso:</span> <span className="font-mono text-gray-700">{log.resourceId}</span></p>}
                {log.tenantId   && <p><span className="text-gray-400">Empresa:</span> <span className="text-gray-700">{log.tenantId}</span></p>}
                {log.userAgent  && <p><span className="text-gray-400">User-agent:</span> <span className="text-gray-600 break-all">{log.userAgent}</span></p>}
                {log.errorMsg   && (
                  <p><span className="text-red-500">Error:</span> <span className="text-red-700">{log.errorMsg}</span></p>
                )}
              </div>

              {/* Datos del cambio */}
              {(log.newValue || log.oldValue) && (
                <div>
                  <p className="font-semibold text-gray-500 uppercase tracking-wide mb-2">Datos</p>
                  {log.newValue && (
                    <pre className="rounded bg-white border border-gray-100 p-2 text-xs text-gray-700 overflow-x-auto max-h-32">
                      {JSON.stringify(log.newValue, null, 2)}
                    </pre>
                  )}
                </div>
              )}
            </div>
          </td>
        </tr>
      )}
    </>
  );
};

// ─── Página principal ─────────────────────────────────────────────────────────

export default function AdminAuditLogs() {
  const [logs, setLogs]         = useState([]);
  const [meta, setMeta]         = useState({ total: 0, page: 1, total_pages: 1 });
  const [loading, setLoading]   = useState(true);

  const [filters, setFilters] = useState({
    action:   '',
    status:   '',
    tenantId: '',
    userId:   '',
    dateFrom: '',
    dateTo:   '',
    page:     1,
    pageSize: 50,
  });

  const fetchLogs = useCallback(async (f) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (f.action)   params.set('action',   f.action);
      if (f.status)   params.set('status',   f.status);
      if (f.tenantId) params.set('tenantId', f.tenantId);
      if (f.userId)   params.set('userId',   f.userId);
      if (f.dateFrom) params.set('dateFrom', f.dateFrom);
      if (f.dateTo)   params.set('dateTo',   f.dateTo);
      params.set('page',     f.page);
      params.set('pageSize', f.pageSize);

      const { data } = await api.get(`/admin/audit-logs?${params.toString()}`);
      setLogs(data.data);
      setMeta({ total: data.total, page: data.page, total_pages: data.total_pages });
    } catch (err) {
      console.error('[AuditLogs]', err);
      setLogs([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchLogs(filters); }, [filters, fetchLogs]);

  const setFilter = (key, value) =>
    setFilters((prev) => ({ ...prev, [key]: value, page: 1 }));

  const setPage = (p) =>
    setFilters((prev) => ({ ...prev, page: p }));

  return (
    <div className="flex h-screen overflow-hidden">
      <AdminSidebar />

      <div className="flex flex-1 flex-col overflow-auto bg-gray-50">

        {/* Header */}
        <header className="bg-white border-b border-gray-100 px-8 py-4 flex items-center justify-between flex-shrink-0">
          <div>
            <h1 className="text-lg font-bold text-gray-900">Auditoría del sistema</h1>
            <p className="text-xs text-gray-400 mt-0.5">Registro de todas las acciones — {meta.total} eventos</p>
          </div>
          <button
            onClick={() => fetchLogs(filters)}
            className="flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 transition-colors"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Actualizar
          </button>
        </header>

        <main className="flex-1 p-6 space-y-4">

          {/* ── Filtros ── */}
          <div className="rounded-xl bg-white border border-gray-100 shadow-sm p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-3">Filtros</p>
            <div className="flex flex-wrap gap-3">

              {/* Acción */}
              <select
                value={filters.action}
                onChange={(e) => setFilter('action', e.target.value)}
                className="rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:border-gray-400 min-w-[200px]"
              >
                <option value="">Todas las acciones</option>
                {Object.entries(ACTION_GROUPS).map(([group, actions]) => (
                  <optgroup key={group} label={group}>
                    {actions.map((a) => (
                      <option key={a} value={a}>{a}</option>
                    ))}
                  </optgroup>
                ))}
              </select>

              {/* Estado */}
              <select
                value={filters.status}
                onChange={(e) => setFilter('status', e.target.value)}
                className="rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:border-gray-400"
              >
                <option value="">Todos los estados</option>
                <option value="SUCCESS">Éxito</option>
                <option value="FAILURE">Fallo</option>
                <option value="WARNING">Advertencia</option>
              </select>

              {/* User ID */}
              <input
                type="text"
                placeholder="Filtrar por User ID..."
                value={filters.userId}
                onChange={(e) => setFilter('userId', e.target.value)}
                className="rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:border-gray-400 w-48"
              />

              {/* Fecha desde */}
              <input
                type="datetime-local"
                value={filters.dateFrom}
                onChange={(e) => setFilter('dateFrom', e.target.value)}
                className="rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:border-gray-400"
              />

              {/* Fecha hasta */}
              <input
                type="datetime-local"
                value={filters.dateTo}
                onChange={(e) => setFilter('dateTo', e.target.value)}
                className="rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:border-gray-400"
              />

              {/* Limpiar filtros */}
              {(filters.action || filters.status || filters.userId || filters.dateFrom || filters.dateTo) && (
                <button
                  onClick={() => setFilters((p) => ({ ...p, action: '', status: '', userId: '', dateFrom: '', dateTo: '', page: 1 }))}
                  className="rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-500 hover:bg-gray-50 transition-colors"
                >
                  Limpiar filtros
                </button>
              )}
            </div>
          </div>

          {/* ── Tabla ── */}
          <div className="rounded-xl bg-white border border-gray-100 shadow-sm overflow-hidden">
            {loading ? (
              <div className="flex justify-center py-20">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-900 border-t-transparent" />
              </div>
            ) : logs.length === 0 ? (
              <div className="py-16 text-center text-sm text-gray-400">
                No se encontraron registros con los filtros aplicados.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-xs uppercase text-gray-500 border-b border-gray-100">
                    <tr>
                      <th className="px-4 py-3 text-left whitespace-nowrap">Fecha / Hora</th>
                      <th className="px-4 py-3 text-left">Acción</th>
                      <th className="px-4 py-3 text-left">Recurso</th>
                      <th className="px-4 py-3 text-left">Usuario</th>
                      <th className="px-4 py-3 text-left">IP</th>
                      <th className="px-4 py-3 text-left">Estado</th>
                      <th className="px-4 py-3 text-left w-8"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {logs.map((log) => (
                      <LogRow key={log.id} log={log} />
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Paginación */}
            {!loading && meta.total_pages > 1 && (
              <div className="flex items-center justify-between border-t border-gray-100 px-5 py-3 text-sm text-gray-500">
                <span>
                  Mostrando {((meta.page - 1) * filters.pageSize) + 1}–{Math.min(meta.page * filters.pageSize, meta.total)} de {meta.total}
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setPage(meta.page - 1)}
                    disabled={meta.page <= 1}
                    className="rounded px-3 py-1 hover:bg-gray-100 disabled:opacity-40 transition-colors"
                  >
                    ← Anterior
                  </button>
                  <span className="text-xs text-gray-400">
                    Página {meta.page} / {meta.total_pages}
                  </span>
                  <button
                    onClick={() => setPage(meta.page + 1)}
                    disabled={meta.page >= meta.total_pages}
                    className="rounded px-3 py-1 hover:bg-gray-100 disabled:opacity-40 transition-colors"
                  >
                    Siguiente →
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Leyenda de colores de acciones */}
          <div className="rounded-xl bg-white border border-gray-100 shadow-sm p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-3">Leyenda de acciones</p>
            <div className="flex flex-wrap gap-3 text-xs">
              <span className="rounded px-2 py-1 bg-blue-50 text-blue-700 font-medium">Azul — Autenticación</span>
              <span className="rounded px-2 py-1 bg-purple-50 text-purple-700 font-medium">Violeta — Contraseñas</span>
              <span className="rounded px-2 py-1 bg-teal-50 text-teal-700 font-medium">Verde azul — Empleados</span>
              <span className="rounded px-2 py-1 bg-gray-100 text-gray-600 font-medium">Gris — Sistema</span>
            </div>
          </div>

        </main>
      </div>
    </div>
  );
}
