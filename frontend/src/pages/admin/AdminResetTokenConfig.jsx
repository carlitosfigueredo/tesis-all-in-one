// Panel SUPER_ADMIN — Configuración del token de reset de contraseña
// Permite definir cuanto tiempo es valido el enlace de recuperacion enviado por email.

import { useEffect, useState } from 'react';
import AdminSidebar from '../../components/admin/AdminSidebar';
import api from '../../services/api';

const DEFAULT_CONFIG = { ttlMinutes: 5, maxDailyRequests: 3 };

// Opciones rapidas de duracion
const PRESETS = [
  { label: '5 min',  value: 5  },
  { label: '10 min', value: 10 },
  { label: '15 min', value: 15 },
  { label: '30 min', value: 30 },
  { label: '1 hora', value: 60 },
];

export default function AdminResetTokenConfig() {
  const [config, setConfig]   = useState(DEFAULT_CONFIG);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving]   = useState(false);
  const [toast, setToast]     = useState(null);
  const [dirty, setDirty]     = useState(false);

  useEffect(() => {
    api.get('/admin/config/reset-token')
      .then((res) => setConfig({ ...DEFAULT_CONFIG, ...res.data.data }))
      .catch(() => setToast({ type: 'error', message: 'No se pudo cargar la configuración' }))
      .finally(() => setLoading(false));
  }, []);

  const update = (field, value) => {
    setConfig((prev) => ({ ...prev, [field]: value }));
    setDirty(true);
  };

  const handleSave = async () => {
    if (config.ttlMinutes < 1 || config.ttlMinutes > 1440) {
      setToast({ type: 'error', message: 'La duracion debe estar entre 1 minuto y 24 horas (1440 min)' });
      return;
    }
    if (config.maxDailyRequests < 1 || config.maxDailyRequests > 20) {
      setToast({ type: 'error', message: 'El máximo diario debe estar entre 1 y 20' });
      return;
    }

    setSaving(true);
    try {
      await api.put('/admin/config/reset-token', config);
      setDirty(false);
      setToast({ type: 'success', message: 'Configuración actualizada correctamente' });
    } catch (err) {
      setToast({ type: 'error', message: err.response?.data?.message ?? 'Error al guardar' });
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(t);
  }, [toast]);

  // Formato legible de la duracion actual
  const formatDuration = (minutes) => {
    if (minutes < 60) return `${minutes} minuto${minutes !== 1 ? 's' : ''}`;
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return m > 0 ? `${h}h ${m}min` : `${h} hora${h !== 1 ? 's' : ''}`;
  };

  return (
    <div className="flex h-screen overflow-hidden">
      <AdminSidebar />

      <div className="flex flex-1 flex-col overflow-auto bg-gray-50">
        {/* Header */}
        <div className="bg-white border-b border-gray-100 px-8 py-5 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Token de recuperacion de contraseña</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              Controla cuanto tiempo es valido el enlace enviado al correo del usuario.
            </p>
          </div>
          <button
            onClick={handleSave}
            disabled={saving || !dirty}
            className="flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {saving ? (
              <>
                <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Guardando...
              </>
            ) : (
              <>
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                Guardar cambios
              </>
            )}
          </button>
        </div>

        {/* Toast */}
        {toast && (
          <div className={`mx-8 mt-4 flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium ${
            toast.type === 'success'
              ? 'bg-green-50 text-green-800 border border-green-200'
              : 'bg-red-50 text-red-800 border border-red-200'
          }`}>
            {toast.type === 'success' ? (
              <svg className="h-4 w-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            ) : (
              <svg className="h-4 w-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
              </svg>
            )}
            {toast.message}
          </div>
        )}

        {loading ? (
          <div className="flex flex-1 items-center justify-center">
            <svg className="h-8 w-8 animate-spin text-blue-500" viewBox="0 0 24 24" fill="none" aria-label="Cargando">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          </div>
        ) : (
          <main className="p-8 max-w-2xl space-y-6">

            {/* Duracion del token */}
            <section className="rounded-xl bg-white border border-gray-100 shadow-sm p-6">
              <h2 className="text-base font-semibold text-gray-900 mb-1">Duracion del enlace</h2>
              <p className="text-sm text-gray-500 mb-5">
                Tiempo desde que se genera el token hasta que vence. Un valor corto es más seguro;
                uno largo es más comodo para el usuario.
              </p>

              {/* Opciones rapidas */}
              <div className="mb-5">
                <p className="text-xs font-semibold text-gray-500 mb-2">Opciones rapidas</p>
                <div className="flex flex-wrap gap-2">
                  {PRESETS.map((p) => (
                    <button
                      key={p.value}
                      type="button"
                      onClick={() => update('ttlMinutes', p.value)}
                      className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors border ${
                        config.ttlMinutes === p.value
                          ? 'bg-blue-600 text-white border-blue-600'
                          : 'bg-white text-gray-600 border-gray-200 hover:border-blue-300 hover:text-blue-600'
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Input manual */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1.5" htmlFor="ttlMinutes">
                  Valor personalizado (en minutos)
                </label>
                <div className="flex items-center gap-3">
                  <input
                    id="ttlMinutes"
                    type="number"
                    min={1}
                    max={1440}
                    value={config.ttlMinutes}
                    onChange={(e) => update('ttlMinutes', Number(e.target.value))}
                    className="w-28 rounded-lg border border-gray-200 px-3 py-2 text-sm text-center focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                  />
                  <span className="text-sm text-gray-400">minutos (1–1440)</span>
                </div>
              </div>

              {/* Preview */}
              <div className="mt-4 rounded-lg bg-gray-50 px-4 py-3 text-sm text-gray-600">
                El enlace enviado al correo sera valido durante{' '}
                <span className="font-semibold text-gray-900">{formatDuration(config.ttlMinutes)}</span>.
              </div>
            </section>

            {/* Max solicitudes diarias */}
            <section className="rounded-xl bg-white border border-gray-100 shadow-sm p-6">
              <h2 className="text-base font-semibold text-gray-900 mb-1">Limite de solicitudes diarias</h2>
              <p className="text-sm text-gray-500 mb-5">
                Máximo de enlaces de recuperacion que un mismo usuario puede solicitar por dia.
                Ayuda a prevenir abusos del sistema de email.
              </p>

              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1.5" htmlFor="maxDailyRequests">
                  Solicitudes por dia
                </label>
                <div className="flex items-center gap-3">
                  <input
                    id="maxDailyRequests"
                    type="number"
                    min={1}
                    max={20}
                    value={config.maxDailyRequests}
                    onChange={(e) => update('maxDailyRequests', Number(e.target.value))}
                    className="w-28 rounded-lg border border-gray-200 px-3 py-2 text-sm text-center focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                  />
                  <span className="text-sm text-gray-400">solicitudes (1–20)</span>
                </div>
              </div>

              <div className="mt-4 rounded-lg bg-gray-50 px-4 py-3 text-sm text-gray-600">
                Un usuario puede solicitar hasta{' '}
                <span className="font-semibold text-gray-900">{config.maxDailyRequests}</span>
                {' '}enlace{config.maxDailyRequests !== 1 ? 's' : ''} de recuperacion por dia.
              </div>
            </section>

            {/* Nota */}
            <div className="flex gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              <svg className="h-5 w-5 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8} aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>
                Los cambios aplican a tokens <strong>nuevos</strong> solamente.
                Los enlaces ya enviados conservan su duracion original.
              </span>
            </div>

          </main>
        )}
      </div>
    </div>
  );
}
