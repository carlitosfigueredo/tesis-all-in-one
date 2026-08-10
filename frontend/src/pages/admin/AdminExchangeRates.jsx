// Panel SUPER_ADMIN — Configuracion de tasa de cambio PYG/USD
// Permite ajustar la tasa de conversion que se usa para procesar pagos via PayPal.
// Los cambios se persisten en BD y se aplican en ~1 minuto (cache TTL del backend).

import { useEffect, useState } from 'react';
import AdminSidebar from '../../components/admin/AdminSidebar';
import api from '../../services/api';

export default function AdminExchangeRates() {
  const [rate, setRate]       = useState(7500);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving]   = useState(false);
  const [toast, setToast]     = useState(null);
  const [dirty, setDirty]     = useState(false);

  useEffect(() => {
    api.get('/admin/config/exchange-rates')
      .then((res) => setRate(res.data.data?.PYG_TO_USD ?? 7500))
      .catch(() => setToast({ type: 'error', message: 'No se pudo cargar la tasa de cambio' }))
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    const parsed = parseFloat(rate);
    if (isNaN(parsed) || parsed < 1000 || parsed > 50000) {
      setToast({ type: 'error', message: 'La tasa debe estar entre 1.000 y 50.000 Gs. por USD' });
      return;
    }
    setSaving(true);
    try {
      const res = await api.put('/admin/config/exchange-rates', { PYG_TO_USD: parsed });
      setDirty(false);
      setToast({ type: 'success', message: res.data.message || 'Tasa actualizada' });
    } catch (err) {
      setToast({ type: 'error', message: err.response?.data?.message ?? 'Error al guardar' });
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

  // Ejemplo de conversion
  const exampleGs = 1390000;
  const exampleUsd = rate > 0 ? (exampleGs / rate).toFixed(2) : '—';

  return (
    <div className="flex h-screen overflow-hidden">
      <AdminSidebar />
      <div className="flex flex-1 flex-col overflow-auto bg-gray-50">
        {/* Header */}
        <header className="flex h-16 items-center justify-between border-b border-gray-200 bg-white px-6 flex-shrink-0">
          <div>
            <h1 className="text-base font-semibold text-gray-800">Tasa de cambio</h1>
            <p className="text-xs text-gray-400">Configuracion de conversion PYG → USD para PayPal</p>
          </div>
        </header>

        <main className="flex-1 p-6 max-w-2xl">
          {loading ? (
            <div className="flex justify-center py-20">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent" />
            </div>
          ) : (
            <div className="space-y-6">

              {/* Card principal */}
              <div className="rounded-xl bg-white border border-gray-100 shadow-sm p-6">
                <h2 className="text-base font-semibold text-gray-900 mb-1">Tasa PYG → USD</h2>
                <p className="text-sm text-gray-500 mb-5">
                  Esta tasa se usa para convertir precios en guaranies a dolares al procesar pagos con PayPal.
                  Ajustala segun la cotizacion del BCP (Banco Central del Paraguay).
                </p>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      1 USD equivale a (Gs.)
                    </label>
                    <div className="flex items-center gap-3">
                      <div className="relative flex-1">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">Gs.</span>
                        <input
                          type="number"
                          min="1000"
                          max="50000"
                          step="100"
                          value={rate}
                          onChange={(e) => { setRate(e.target.value); setDirty(true); }}
                          className="w-full rounded-lg border border-gray-200 pl-10 pr-4 py-2.5 text-sm font-mono text-gray-900 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"
                        />
                      </div>
                      <span className="text-sm text-gray-500">por 1 USD</span>
                    </div>
                    <p className="mt-1.5 text-xs text-gray-400">Rango permitido: 1.000 — 50.000</p>
                  </div>

                  {/* Preview de conversion */}
                  <div className="rounded-lg bg-blue-50 border border-blue-100 p-4">
                    <p className="text-xs font-medium text-blue-600 uppercase tracking-wide mb-1">Vista previa</p>
                    <p className="text-sm text-gray-700">
                      Un plan de <strong>Gs. {Number(exampleGs).toLocaleString('es-PY')}</strong> se cobraria como{' '}
                      <strong className="text-blue-700">USD {exampleUsd}</strong> en PayPal.
                    </p>
                  </div>
                </div>

                {/* Boton guardar */}
                <div className="mt-6 flex items-center gap-3">
                  <button
                    onClick={handleSave}
                    disabled={!dirty || saving}
                    className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {saving ? 'Guardando...' : 'Guardar tasa'}
                  </button>
                  {dirty && (
                    <span className="text-xs text-amber-600 font-medium">Cambios sin guardar</span>
                  )}
                </div>
              </div>

              {/* Nota informativa */}
              <div className="rounded-xl bg-white border border-gray-100 shadow-sm p-6">
                <h3 className="text-sm font-semibold text-gray-800 mb-2">Como funciona</h3>
                <ul className="space-y-2 text-sm text-gray-600">
                  <li className="flex items-start gap-2">
                    <span className="mt-1 h-1.5 w-1.5 rounded-full bg-blue-500 flex-shrink-0" />
                    Cuando un usuario paga con PayPal, el sistema convierte el precio en guaranies a dolares usando esta tasa.
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="mt-1 h-1.5 w-1.5 rounded-full bg-blue-500 flex-shrink-0" />
                    Los cambios se aplican a los proximos pagos (cache de ~1 minuto en el servidor).
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="mt-1 h-1.5 w-1.5 rounded-full bg-blue-500 flex-shrink-0" />
                    Si no se configura, se usa el valor por defecto de Gs. 7.500 por USD.
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="mt-1 h-1.5 w-1.5 rounded-full bg-amber-500 flex-shrink-0" />
                    Recomendacion: actualizar semanalmente basandose en la cotizacion del BCP.
                  </li>
                </ul>
              </div>
            </div>
          )}
        </main>

        {/* Toast */}
        {toast && (
          <div className={`fixed bottom-6 right-6 z-50 rounded-xl border px-5 py-3 shadow-lg text-sm font-medium transition-all animate-[slideUp_0.3s_ease-out] ${
            toast.type === 'success'
              ? 'bg-green-50 border-green-200 text-green-800'
              : 'bg-red-50 border-red-200 text-red-800'
          }`}>
            {toast.message}
          </div>
        )}
      </div>
    </div>
  );
}
