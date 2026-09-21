import { useEffect, useState, useCallback } from 'react';
import api from '../../services/api';

// Metadata visual por estado y prioridad.
const ESTADO_META = {
  SUGERIDA:    { label: 'Sugerida',    badge: 'bg-blue-50 text-blue-700 border-blue-200' },
  EN_CURSO:    { label: 'En curso',    badge: 'bg-amber-50 text-amber-700 border-amber-200' },
  COMPLETADA:  { label: 'Completada',  badge: 'bg-green-50 text-green-700 border-green-200' },
  DESCARTADA:  { label: 'Descartada',  badge: 'bg-gray-100 text-gray-500 border-gray-200' },
};

const PRIORIDAD_META = {
  CRITICA: { label: 'Crítica', dot: 'bg-red-600',   text: 'text-red-700' },
  ALTA:    { label: 'Alta',    dot: 'bg-orange-500', text: 'text-orange-700' },
  MEDIA:   { label: 'Media',   dot: 'bg-amber-400',  text: 'text-amber-700' },
  BAJA:    { label: 'Baja',    dot: 'bg-gray-400',   text: 'text-gray-600' },
};

// Orden de la maquina de estados: qué acciones ofrecer según el estado actual.
const ACCIONES = {
  SUGERIDA:   [{ estado: 'EN_CURSO', label: 'Iniciar' }, { estado: 'DESCARTADA', label: 'Descartar' }],
  EN_CURSO:   [{ estado: 'COMPLETADA', label: 'Completar' }, { estado: 'DESCARTADA', label: 'Descartar' }],
  COMPLETADA: [{ estado: 'EN_CURSO', label: 'Reabrir' }],
  DESCARTADA: [{ estado: 'SUGERIDA', label: 'Restaurar' }],
};

/**
 * Panel de estrategias de retención de un empleado.
 * Lista las estrategias persistidas, permite generarlas desde los factores de
 * riesgo actuales y gestionar su ciclo de vida (estado + notas).
 *
 * @param {string} employeeId
 * @param {boolean} canManage - si el usuario puede generar/actualizar (permiso retention.manage)
 */
export default function RetentionPanel({ employeeId, canManage = true }) {
  const [items, setItems]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy]       = useState(false);
  const [error, setError]     = useState('');
  const [msg, setMsg]         = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const { data } = await api.get(`/retention/employees/${employeeId}/strategies`);
      setItems(data.data ?? []);
    } catch {
      setError('No se pudieron cargar las estrategias.');
    } finally {
      setLoading(false);
    }
  }, [employeeId]);

  useEffect(() => { load(); }, [load]);

  const generar = async () => {
    setBusy(true);
    setError('');
    setMsg('');
    try {
      const { data } = await api.post(`/retention/employees/${employeeId}/generate`);
      setMsg(data.message ?? 'Estrategias generadas.');
      await load();
    } catch (e) {
      setError(e.response?.data?.message || 'No se pudieron generar las estrategias.');
    } finally {
      setBusy(false);
    }
  };

  const cambiarEstado = async (id, estado) => {
    setBusy(true);
    setError('');
    try {
      await api.patch(`/retention/strategies/${id}`, { estado });
      await load();
    } catch (e) {
      setError(e.response?.data?.message || 'No se pudo actualizar la estrategia.');
    } finally {
      setBusy(false);
    }
  };

  const guardarNota = async (id, notas) => {
    setBusy(true);
    try {
      await api.patch(`/retention/strategies/${id}`, { notas });
      await load();
    } catch (e) {
      setError(e.response?.data?.message || 'No se pudo guardar la nota.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="rounded-xl bg-white dark:bg-gray-800 p-5 shadow-sm transition-colors">
      <div className="mb-3 flex items-center justify-between gap-2">
        <div>
          <p className="text-sm font-semibold text-gray-700 dark:text-gray-200">Estrategias de retención</p>
          <p className="text-xs text-gray-500">Acciones concretas para reducir el riesgo, con seguimiento.</p>
        </div>
        {canManage && (
          <button
            onClick={generar}
            disabled={busy}
            className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-blue-700 disabled:opacity-50"
          >
            {busy ? 'Generando…' : 'Generar sugerencias'}
          </button>
        )}
      </div>

      {msg && <div className="mb-3 rounded-lg bg-green-50 px-3 py-2 text-xs text-green-700">{msg}</div>}
      {error && <div className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">{error}</div>}

      {loading ? (
        <div className="flex justify-center py-6">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
        </div>
      ) : items.length === 0 ? (
        <p className="py-4 text-center text-xs text-gray-500">
          Todavía no hay estrategias registradas.
          {canManage && ' Usá "Generar sugerencias" para crearlas a partir de los factores de riesgo actuales.'}
        </p>
      ) : (
        <ul className="space-y-3">
          {items.map((s) => (
            <StrategyItem
              key={s.id}
              strategy={s}
              canManage={canManage}
              busy={busy}
              onEstado={cambiarEstado}
              onNota={guardarNota}
            />
          ))}
        </ul>
      )}
    </div>
  );
}

function StrategyItem({ strategy: s, canManage, busy, onEstado, onNota }) {
  const [nota, setNota] = useState(s.notas ?? '');
  const [editing, setEditing] = useState(false);
  const est = ESTADO_META[s.estado] ?? ESTADO_META.SUGERIDA;
  const pri = PRIORIDAD_META[s.prioridad] ?? PRIORIDAD_META.MEDIA;
  const acciones = ACCIONES[s.estado] ?? [];

  const descartada = s.estado === 'DESCARTADA';

  return (
    <li className={`rounded-lg border p-3 ${descartada ? 'opacity-60' : ''} border-gray-200 dark:border-gray-700`}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className={`inline-block h-2 w-2 rounded-full ${pri.dot}`} title={`Prioridad ${pri.label}`} />
            <span className="text-sm font-semibold text-gray-800 dark:text-gray-100">{s.titulo}</span>
          </div>
          <p className="mt-0.5 text-xs text-gray-600 dark:text-gray-300 leading-snug">{s.descripcion}</p>
          {s.motivo && <p className="mt-1 text-xs text-gray-400 italic leading-snug">{s.motivo}</p>}
        </div>
        <span className={`flex-shrink-0 rounded-full border px-2 py-0.5 text-xs font-semibold ${est.badge}`}>
          {est.label}
        </span>
      </div>

      {/* Nota de seguimiento */}
      <div className="mt-2">
        {editing ? (
          <div className="flex flex-col gap-2">
            <textarea
              value={nota}
              onChange={(e) => setNota(e.target.value)}
              rows={2}
              placeholder="Anotá qué se hizo, resultado, próximos pasos…"
              className="w-full rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-900 px-2 py-1.5 text-xs text-gray-700 dark:text-gray-200"
            />
            <div className="flex gap-2">
              <button
                onClick={async () => { await onNota(s.id, nota); setEditing(false); }}
                disabled={busy}
                className="rounded bg-blue-600 px-2 py-1 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
              >
                Guardar nota
              </button>
              <button onClick={() => { setNota(s.notas ?? ''); setEditing(false); }} className="text-xs text-gray-500 hover:underline">
                Cancelar
              </button>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs text-gray-500 truncate">
              {s.notas ? `📝 ${s.notas}` : 'Sin notas de seguimiento.'}
            </p>
            {canManage && (
              <button onClick={() => setEditing(true)} className="flex-shrink-0 text-xs text-blue-600 hover:underline">
                {s.notas ? 'Editar nota' : 'Agregar nota'}
              </button>
            )}
          </div>
        )}
      </div>

      {/* Acciones de estado */}
      {canManage && acciones.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-2">
          {acciones.map((a) => (
            <button
              key={a.estado}
              onClick={() => onEstado(s.id, a.estado)}
              disabled={busy}
              className="rounded-lg border border-gray-200 dark:border-gray-600 px-2.5 py-1 text-xs font-medium text-gray-700 dark:text-gray-200 transition hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50"
            >
              {a.label}
            </button>
          ))}
        </div>
      )}
    </li>
  );
}
