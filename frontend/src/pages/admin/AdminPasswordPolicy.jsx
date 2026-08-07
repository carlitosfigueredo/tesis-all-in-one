// Panel SUPER_ADMIN — Configuracion de politica de contrasenas
// Permite editar los requisitos de contrasenas que aplican a todos los usuarios.
// Los cambios se persisten en BD y el frontend los toma en ~1 minuto (cache TTL).

import { useEffect, useState } from 'react';
import AdminSidebar from '../../components/admin/AdminSidebar';
import api from '../../services/api';
import { invalidatePasswordPolicyCache } from '../../hooks/usePasswordPolicy';

const DEFAULT_POLICY = {
  minLength:        8,
  maxLength:        128,
  requireUppercase: true,
  requireLowercase: true,
  requireNumber:    true,
  requireSpecial:   true,
};

// ─── Toggle visual ────────────────────────────────────────────────────────────

const Toggle = ({ checked, onChange, label, description }) => (
  <label className="flex items-start gap-4 cursor-pointer group">
    <div className="relative mt-0.5 flex-shrink-0">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="sr-only"
        aria-label={label}
      />
      <div
        onClick={() => onChange(!checked)}
        className={`h-6 w-11 rounded-full transition-colors duration-200 ${checked ? 'bg-blue-600' : 'bg-gray-200'}`}
      >
        <div
          className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform duration-200 ${checked ? 'translate-x-5' : 'translate-x-0.5'}`}
        />
      </div>
    </div>
    <div>
      <p className="text-sm font-medium text-gray-800 group-hover:text-gray-900">{label}</p>
      {description && <p className="text-xs text-gray-500 mt-0.5">{description}</p>}
    </div>
  </label>
);

// ─── Componente principal ─────────────────────────────────────────────────────

export default function AdminPasswordPolicy() {
  const [policy, setPolicy]   = useState(DEFAULT_POLICY);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving]   = useState(false);
  const [toast, setToast]     = useState(null); // { type: 'success'|'error', message }
  const [dirty, setDirty]     = useState(false);

  // Cargar politica vigente
  useEffect(() => {
    api.get('/admin/config/password-policy')
      .then((res) => setPolicy({ ...DEFAULT_POLICY, ...res.data.data }))
      .catch(() => setToast({ type: 'error', message: 'No se pudo cargar la configuracion' }))
      .finally(() => setLoading(false));
  }, []);

  const update = (field, value) => {
    setPolicy((prev) => ({ ...prev, [field]: value }));
    setDirty(true);
  };

  const handleSave = async () => {
    // Validaciones locales antes de enviar
    if (policy.minLength < 4 || policy.minLength > 32) {
      setToast({ type: 'error', message: 'La longitud minima debe estar entre 4 y 32 caracteres' });
      return;
    }
    if (policy.maxLength < 32 || policy.maxLength > 256) {
      setToast({ type: 'error', message: 'La longitud maxima debe estar entre 32 y 256 caracteres' });
      return;
    }
    if (policy.minLength > policy.maxLength) {
      setToast({ type: 'error', message: 'La longitud minima no puede ser mayor que la maxima' });
      return;
    }

    setSaving(true);
    try {
      await api.put('/admin/config/password-policy', policy);
      // Invalidar cache del frontend para que tome los nuevos valores inmediatamente
      invalidatePasswordPolicyCache();
      setDirty(false);
      setToast({ type: 'success', message: 'Politica actualizada correctamente' });
    } catch (err) {
      const msg = err.response?.data?.message ?? 'Error al guardar la configuracion';
      setToast({ type: 'error', message: msg });
    } finally {
      setSaving(false);
    }
  };

  // Auto-ocultar toast
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(t);
  }, [toast]);

  return (
    <div className="flex h-screen overflow-hidden">
      <AdminSidebar />

      <div className="flex flex-1 flex-col overflow-auto bg-gray-50">
        {/* Header */}
        <div className="bg-white border-b border-gray-100 px-8 py-5 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Politica de contrasenas</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              Define los requisitos minimos que deben cumplir todas las contrasenas del sistema.
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

            {/* Longitud */}
            <section className="rounded-xl bg-white border border-gray-100 shadow-sm p-6">
              <h2 className="text-base font-semibold text-gray-900 mb-1">Longitud</h2>
              <p className="text-sm text-gray-500 mb-5">
                Rango de caracteres permitido. NIST recomienda un minimo de 8 y no imponer maximos bajos.
              </p>

              <div className="grid grid-cols-2 gap-6">
                {/* Minimo */}
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1.5" htmlFor="minLength">
                    Longitud minima
                  </label>
                  <div className="flex items-center gap-3">
                    <input
                      id="minLength"
                      type="number"
                      min={4}
                      max={32}
                      value={policy.minLength}
                      onChange={(e) => update('minLength', Number(e.target.value))}
                      className="w-24 rounded-lg border border-gray-200 px-3 py-2 text-sm text-center focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                    />
                    <span className="text-sm text-gray-400">caracteres (4–32)</span>
                  </div>
                </div>

                {/* Maximo */}
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1.5" htmlFor="maxLength">
                    Longitud maxima
                  </label>
                  <div className="flex items-center gap-3">
                    <input
                      id="maxLength"
                      type="number"
                      min={32}
                      max={256}
                      value={policy.maxLength}
                      onChange={(e) => update('maxLength', Number(e.target.value))}
                      className="w-24 rounded-lg border border-gray-200 px-3 py-2 text-sm text-center focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                    />
                    <span className="text-sm text-gray-400">caracteres (32–256)</span>
                  </div>
                </div>
              </div>

              {/* Preview visual */}
              <div className="mt-4 rounded-lg bg-gray-50 px-4 py-3 text-sm text-gray-600">
                Las contrasenas deben tener entre{' '}
                <span className="font-semibold text-gray-900">{policy.minLength}</span>
                {' '}y{' '}
                <span className="font-semibold text-gray-900">{policy.maxLength}</span>
                {' '}caracteres.
              </div>
            </section>

            {/* Complejidad */}
            <section className="rounded-xl bg-white border border-gray-100 shadow-sm p-6">
              <h2 className="text-base font-semibold text-gray-900 mb-1">Complejidad</h2>
              <p className="text-sm text-gray-500 mb-5">
                Requisitos adicionales de composicion. Cada regla activa se muestra en el indicador visual del formulario.
              </p>

              <div className="space-y-5">
                <Toggle
                  checked={policy.requireUppercase}
                  onChange={(v) => update('requireUppercase', v)}
                  label="Requiere mayusculas"
                  description="Al menos una letra en mayuscula (A-Z)"
                />
                <Toggle
                  checked={policy.requireLowercase}
                  onChange={(v) => update('requireLowercase', v)}
                  label="Requiere minusculas"
                  description="Al menos una letra en minuscula (a-z)"
                />
                <Toggle
                  checked={policy.requireNumber}
                  onChange={(v) => update('requireNumber', v)}
                  label="Requiere numeros"
                  description="Al menos un digito (0-9)"
                />
                <Toggle
                  checked={policy.requireSpecial}
                  onChange={(v) => update('requireSpecial', v)}
                  label="Requiere caracteres especiales"
                  description="Al menos uno de: !@#$%^&*()-_=+[]{}|;:',.<>?/"
                />
              </div>
            </section>

            {/* Nota informativa */}
            <div className="flex gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              <svg className="h-5 w-5 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8} aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>
                Los cambios aplican a contrasenas <strong>nuevas</strong> solamente.
                Las contrasenas ya guardadas no se ven afectadas.
                El frontend actualiza el indicador visual en la proxima carga de pagina.
              </span>
            </div>

          </main>
        )}
      </div>
    </div>
  );
}
