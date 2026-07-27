import { useEffect, useState } from 'react';
import AdminSidebar from '../../components/admin/AdminSidebar';
import api from '../../services/api';

const formatGs = (n) =>
  n != null ? `Gs. ${Number(n).toLocaleString('es-PY')}` : '—';

// ─── Editor de un plan individual ────────────────────────────────────────────

const PlanEditor = ({ plan, onChange }) => {
  const handleField = (field, value) =>
    onChange({ ...plan, [field]: value });

  const handleFeature = (i, value) => {
    const feats = [...(plan.features ?? [])];
    feats[i] = value;
    onChange({ ...plan, features: feats });
  };

  const addFeature = () =>
    onChange({ ...plan, features: [...(plan.features ?? []), ''] });

  const removeFeature = (i) => {
    const feats = [...(plan.features ?? [])];
    feats.splice(i, 1);
    onChange({ ...plan, features: feats });
  };

  return (
    <div className="rounded-xl bg-white border border-gray-100 shadow-sm p-6 space-y-4">
      {/* Nombre */}
      <div>
        <label className="block text-xs font-semibold text-gray-500 mb-1">Nombre del plan</label>
        <input
          value={plan.name}
          onChange={(e) => handleField('name', e.target.value)}
          className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:border-blue-400"
        />
      </div>

      {/* Precio */}
      <div>
        <label className="block text-xs font-semibold text-gray-500 mb-1">Precio mensual (Gs.)</label>
        <input
          type="number"
          min={0}
          value={plan.priceGs ?? ''}
          onChange={(e) => handleField('priceGs', e.target.value ? Number(e.target.value) : null)}
          className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:border-blue-400"
          placeholder="Ej: 999000"
        />
        <p className="mt-1 text-xs text-gray-400">{formatGs(plan.priceGs)}</p>
      </div>

      {/* Límite colaboradores */}
      <div>
        <label className="block text-xs font-semibold text-gray-500 mb-1">Límite de colaboradores</label>
        <input
          type="number"
          min={1}
          value={plan.employeeLimit ?? ''}
          onChange={(e) => handleField('employeeLimit', e.target.value ? Number(e.target.value) : null)}
          className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:border-blue-400"
          placeholder="Ej: 100"
        />
      </div>

      {/* Frecuencia predictiva */}
      <div>
        <label className="block text-xs font-semibold text-gray-500 mb-1">Frecuencia predictiva</label>
        <select
          value={plan.predictionFrequency ?? ''}
          onChange={(e) => handleField('predictionFrequency', e.target.value)}
          className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:border-blue-400"
        >
          <option value="Mensual">Mensual</option>
          <option value="Semanal">Semanal</option>
          <option value="Bajo demanda">Bajo demanda</option>
        </select>
      </div>

      {/* Tipo de dashboard */}
      <div>
        <label className="block text-xs font-semibold text-gray-500 mb-1">Tipo de dashboard</label>
        <input
          value={plan.dashboardType ?? ''}
          onChange={(e) => handleField('dashboardType', e.target.value)}
          className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:border-blue-400"
          placeholder="Ej: Avanzado"
        />
      </div>

      {/* CTA */}
      <div>
        <label className="block text-xs font-semibold text-gray-500 mb-1">Texto del botón</label>
        <input
          value={plan.cta ?? ''}
          onChange={(e) => handleField('cta', e.target.value)}
          className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:border-blue-400"
          placeholder="Ej: Contratar"
        />
      </div>

      {/* Destacado */}
      <div className="flex items-center gap-2">
        <input
          id={`highlight-${plan.id}`}
          type="checkbox"
          checked={plan.highlight ?? false}
          onChange={(e) => handleField('highlight', e.target.checked)}
          className="h-4 w-4 rounded border-gray-300 text-blue-600"
        />
        <label htmlFor={`highlight-${plan.id}`} className="text-sm text-gray-700">
          Marcar como "Más popular"
        </label>
      </div>

      {/* Features */}
      <div>
        <label className="block text-xs font-semibold text-gray-500 mb-2">Características incluidas</label>
        <div className="space-y-2">
          {(plan.features ?? []).map((f, i) => (
            <div key={i} className="flex gap-2">
              <input
                value={f}
                onChange={(e) => handleFeature(i, e.target.value)}
                className="flex-1 rounded-lg border border-gray-200 px-3 py-1.5 text-sm focus:outline-none focus:border-blue-400"
              />
              <button
                onClick={() => removeFeature(i)}
                className="rounded-lg px-2 py-1 text-red-400 hover:bg-red-50 transition-colors text-xs"
                title="Eliminar"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
        <button
          onClick={addFeature}
          className="mt-2 text-xs text-blue-600 hover:underline"
        >
          + Agregar característica
        </button>
      </div>
    </div>
  );
};

// ─── Página principal ─────────────────────────────────────────────────────────

export default function AdminPlans() {
  const [plans, setPlans]         = useState([]);
  const [payPerUse, setPayPerUse] = useState({ priceGs: 200000, collaboratorsBlock: 250, description: '' });
  const [loading, setLoading]     = useState(true);
  const [saving, setSaving]       = useState(false);
  const [saved, setSaved]         = useState(false);
  const [error, setError]         = useState('');

  useEffect(() => {
    api.get('/admin/plans')
      .then(({ data }) => {
        setPlans(data.data.plans ?? []);
        setPayPerUse(data.data.payPerUse ?? { priceGs: 200000, collaboratorsBlock: 250, description: '' });
      })
      .catch(() => setError('No se pudieron cargar los planes'))
      .finally(() => setLoading(false));
  }, []);

  const handlePlanChange = (i, updated) => {
    const next = [...plans];
    next[i] = updated;
    setPlans(next);
  };

  const handleSave = async () => {
    setSaving(true);
    setError('');
    setSaved(false);
    try {
      await api.put('/admin/plans', { plans, payPerUse });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      setError(err.response?.data?.message ?? 'Error al guardar los planes');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex h-screen overflow-hidden">
      <AdminSidebar />

      <div className="flex flex-1 flex-col overflow-auto bg-gray-50">
        <header className="bg-white border-b border-gray-100 px-8 py-4 flex items-center justify-between flex-shrink-0">
          <div>
            <h1 className="text-lg font-bold text-gray-900">Planes y precios</h1>
            <p className="text-sm text-gray-400 mt-0.5">Los cambios se reflejan en la landing page en tiempo real</p>
          </div>

          <div className="flex items-center gap-3">
            {saved && (
              <span className="text-sm text-green-600 font-medium flex items-center gap-1">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                Guardado
              </span>
            )}
            <button
              onClick={handleSave}
              disabled={saving}
              className="rounded-lg bg-blue-600 px-5 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60 transition-colors"
            >
              {saving ? 'Guardando...' : 'Guardar cambios'}
            </button>
          </div>
        </header>

        <main className="flex-1 p-8 space-y-8">
          {error && (
            <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">{error}</div>
          )}

          {loading ? (
            <div className="flex justify-center py-20">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-900 border-t-transparent" />
            </div>
          ) : (
            <>
              {/* Editores de planes */}
              <section>
                <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-400 mb-4">
                  Planes de suscripción
                </h2>
                <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                  {plans.map((plan, i) => (
                    <div key={plan.id}>
                      <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">{plan.id}</p>
                      <PlanEditor plan={plan} onChange={(updated) => handlePlanChange(i, updated)} />
                    </div>
                  ))}
                </div>
              </section>

              {/* Pay per use */}
              <section>
                <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-400 mb-4">
                  Modelo Pay-per-use
                </h2>
                <div className="rounded-xl bg-white border border-gray-100 shadow-sm p-6 max-w-xl space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 mb-1">Precio por bloque (Gs.)</label>
                    <input
                      type="number"
                      min={0}
                      value={payPerUse.priceGs ?? ''}
                      onChange={(e) => setPayPerUse((p) => ({ ...p, priceGs: Number(e.target.value) }))}
                      className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:border-blue-400"
                    />
                    <p className="mt-1 text-xs text-gray-400">{formatGs(payPerUse.priceGs)}</p>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 mb-1">Colaboradores por bloque</label>
                    <input
                      type="number"
                      min={1}
                      value={payPerUse.collaboratorsBlock ?? ''}
                      onChange={(e) => setPayPerUse((p) => ({ ...p, collaboratorsBlock: Number(e.target.value) }))}
                      className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:border-blue-400"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 mb-1">Descripción (visible en landing)</label>
                    <input
                      value={payPerUse.description ?? ''}
                      onChange={(e) => setPayPerUse((p) => ({ ...p, description: e.target.value }))}
                      className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:border-blue-400"
                      placeholder="Ej: Gs. 200.000 por cada 250 colaboradores adicionales"
                    />
                  </div>
                </div>
              </section>

              {/* Preview tabla comparativa */}
              <section>
                <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-400 mb-4">
                  Vista previa — Tabla comparativa (landing)
                </h2>
                <div className="overflow-x-auto rounded-xl border border-gray-100 shadow-sm">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-900 text-white">
                        <th className="px-5 py-4 text-left font-semibold">Característica</th>
                        {plans.map((p) => (
                          <th key={p.id} className={`px-5 py-4 text-left font-semibold ${p.highlight ? 'text-blue-300' : ''}`}>
                            {p.name}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {[
                        { label: 'Precio Mensual',        key: (p) => formatGs(p.priceGs) },
                        { label: 'Colaboradores',         key: (p) => `Hasta ${p.employeeLimit?.toLocaleString('es-PY') ?? '—'}` },
                        { label: 'Frecuencia Predictiva', key: (p) => p.predictionFrequency ?? '—' },
                        { label: 'Tipos de Dashboards',   key: (p) => p.dashboardType ?? '—' },
                      ].map((row, i) => (
                        <tr key={row.label} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                          <td className="px-5 py-3 font-medium text-gray-700">{row.label}</td>
                          {plans.map((p) => (
                            <td key={p.id} className={`px-5 py-3 ${row.label === 'Precio Mensual' ? 'font-bold text-blue-600' : 'text-gray-600'}`}>
                              {row.key(p)}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {payPerUse?.description && (
                  <p className="mt-3 text-center text-sm italic text-gray-500">
                    Modelo Pay-per-use: {payPerUse.description}
                  </p>
                )}
              </section>
            </>
          )}
        </main>
      </div>
    </div>
  );
}
