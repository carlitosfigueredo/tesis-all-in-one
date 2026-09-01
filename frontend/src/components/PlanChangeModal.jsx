import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { PayPalScriptProvider, PayPalButtons } from '@paypal/react-paypal-js';
import api from '../services/api';

const PAYPAL_CLIENT_ID = import.meta.env.VITE_PAYPAL_CLIENT_ID;

const formatGs = (n) => `Gs. ${Number(n).toLocaleString('es-PY')}`;

/**
 * Modal de cambio de plan para el portal empresa.
 *
 * Flujo:
 *  1. Lista los planes disponibles (excluye el actual).
 *  2. Al seleccionar uno, consulta el preview de prorrateo.
 *  3. DOWNGRADE → botón que programa el cambio para el próximo ciclo (sin pago).
 *  4. UPGRADE → botón PayPal que cobra la diferencia prorrateada; al aprobar, captura.
 *
 * Props:
 *   open: boolean
 *   currentPlanId: string   — plan_config.id actual (ESTANDAR|PROFESIONAL|CORPORATIVO)
 *   onClose: () => void
 *   onSuccess: (result) => void  — se llama tras aplicar/programar/pagar
 */
export default function PlanChangeModal({ open, currentPlanId, onClose, onSuccess }) {
  const [plans, setPlans]       = useState([]);
  const [selected, setSelected] = useState(null);   // plan_config seleccionado
  const [preview, setPreview]   = useState(null);   // resultado de /plan-change/preview
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [error, setError]       = useState('');
  const [orderCtx, setOrderCtx] = useState(null);   // { orderId, planId } para captura PayPal

  // Cargar planes al abrir
  useEffect(() => {
    if (!open) return;
    setError('');
    setSelected(null);
    setPreview(null);
    setOrderCtx(null);
    api.get('/payments/plans')
      .then(({ data }) => setPlans(data.data ?? []))
      .catch(() => setError('No se pudieron cargar los planes.'));
  }, [open]);

  // Al seleccionar un plan, pedir preview
  const handleSelect = async (plan) => {
    setSelected(plan);
    setPreview(null);
    setOrderCtx(null);
    setError('');
    setLoadingPreview(true);
    try {
      const { data } = await api.get(`/payments/plan-change/preview?planId=${plan.id}`);
      setPreview(data.data);
    } catch (err) {
      setError(err.response?.data?.message ?? 'No se pudo calcular el cambio de plan.');
    } finally {
      setLoadingPreview(false);
    }
  };

  // DOWNGRADE (o upgrade sin costo): ejecutar cambio directo
  const handleScheduleOrFreeChange = async () => {
    setProcessing(true);
    setError('');
    try {
      const { data } = await api.post('/payments/plan-change', { planId: selected.id });
      onSuccess?.(data.data);
    } catch (err) {
      setError(err.response?.data?.message ?? 'No se pudo aplicar el cambio de plan.');
    } finally {
      setProcessing(false);
    }
  };

  // UPGRADE: crear la orden (POST plan-change devuelve orderId de PayPal)
  const handleCreateOrder = async () => {
    setError('');
    try {
      const { data } = await api.post('/payments/plan-change', { planId: selected.id });
      // Si el backend aplicó gratis (crédito cubría todo), no hay orderId
      if (data.data?.applied) {
        onSuccess?.(data.data);
        return '';
      }
      setOrderCtx({ orderId: data.data.orderId, planId: selected.id });
      return data.data.orderId;
    } catch (err) {
      setError(err.response?.data?.message ?? 'No se pudo crear la orden de pago.');
      return '';
    }
  };

  // UPGRADE: capturar el pago aprobado → aplica el plan nuevo
  const handleApprove = async (data) => {
    setProcessing(true);
    setError('');
    try {
      const { data: res } = await api.post('/payments/capture-order', {
        orderId: data.orderID,
        planId:  orderCtx?.planId || selected.id,
      });
      if (res.success && res.data.status === 'APPROVED') {
        onSuccess?.({ type: 'UPGRADE', paid: true, paymentId: res.data.paymentId });
      } else if (res.data?.status === 'PENDING') {
        setError('Tu pago está en verificación por PayPal. Te notificaremos cuando se confirme.');
      } else {
        setError('El pago no se completó. Intentá de nuevo.');
      }
    } catch (err) {
      setError(err.response?.data?.message ?? 'Error al capturar el pago.');
    } finally {
      setProcessing(false);
    }
  };

  if (!open) return null;

  const availablePlans = plans.filter((p) => p.id !== currentPlanId);
  const isUpgrade   = preview?.type === 'UPGRADE';
  const isDowngrade = preview?.type === 'DOWNGRADE';
  const upgradeHasCost = isUpgrade && preview.amountToPayGs > 0;

  // El PayPalScriptProvider envuelve el modal completo (montaje único mientras
  // está abierto). Montarlo/desmontarlo de forma anidada y condicional hace
  // fallar al SDK de PayPal (web-vitals: "startTime").
  const modalContent = (
    <div className="fixed inset-0 z-[9998] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={processing ? undefined : onClose} aria-hidden="true" />

      <div className="relative w-full max-w-lg rounded-2xl bg-white shadow-2xl max-h-[90vh] overflow-y-auto" role="dialog" aria-modal="true">
        {/* Header */}
        <div className="sticky top-0 flex items-center justify-between border-b border-gray-100 bg-white px-6 py-4">
          <h3 className="text-base font-bold text-gray-900">Cambiar de plan</h3>
          <button
            onClick={processing ? undefined : onClose}
            className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
            aria-label="Cerrar"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-6 space-y-4">
          {error && (
            <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-2.5 text-sm text-red-700">
              {error}
            </div>
          )}

          {/* Lista de planes */}
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase text-gray-500">Elegí tu nuevo plan</p>
            {availablePlans.map((plan) => {
              const isSel = selected?.id === plan.id;
              return (
                <button
                  key={plan.id}
                  type="button"
                  disabled={processing}
                  onClick={() => handleSelect(plan)}
                  className={`w-full text-left rounded-xl border-2 p-4 transition-all disabled:opacity-60 ${
                    isSel ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-sm text-gray-900">{plan.name}</p>
                      <p className="text-xs text-gray-500 mt-0.5">Hasta {plan.employeeLimit} colaboradores</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-sm text-gray-900">{formatGs(plan.priceGs)}</p>
                      <p className="text-xs text-gray-400">/mes</p>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Preview del cambio */}
          {loadingPreview && (
            <div className="flex justify-center py-6">
              <div className="h-6 w-6 animate-spin rounded-full border-4 border-blue-500 border-t-transparent" />
            </div>
          )}

          {preview && !loadingPreview && (
            <div className={`rounded-xl border p-4 ${isUpgrade ? 'bg-blue-50 border-blue-200' : 'bg-amber-50 border-amber-200'}`}>
              {isUpgrade ? (
                <div className="space-y-2 text-sm">
                  <p className="font-semibold text-blue-800">Mejora de plan (inmediata)</p>
                  <div className="flex justify-between text-gray-600">
                    <span>Precio {selected.name}</span>
                    <span className="tabular-nums">{formatGs(preview.targetPriceGs)}</span>
                  </div>
                  <div className="flex justify-between text-gray-600">
                    <span>Crédito por {preview.daysRemaining} días restantes</span>
                    <span className="tabular-nums text-green-600">− {formatGs(preview.unusedCreditGs)}</span>
                  </div>
                  <div className="flex justify-between font-bold text-gray-900 border-t border-blue-200 pt-2">
                    <span>Total a pagar hoy</span>
                    <span className="tabular-nums">{formatGs(preview.amountToPayGs)}</span>
                  </div>
                  {!upgradeHasCost && (
                    <p className="text-xs text-green-700 mt-1">Tu crédito cubre el upgrade. No pagás nada hoy.</p>
                  )}
                </div>
              ) : isDowngrade ? (
                <div className="space-y-1 text-sm">
                  <p className="font-semibold text-amber-800">Cambio a plan inferior (programado)</p>
                  <p className="text-gray-600">
                    Tu plan cambiará a <strong>{selected.name}</strong> al finalizar el ciclo actual
                    ({new Date(preview.currentPeriodEnd).toLocaleDateString('es-PY')}).
                    Seguís con tu plan actual hasta esa fecha. No se cobra nada ahora.
                  </p>
                </div>
              ) : null}
            </div>
          )}

          {/* Acciones según tipo */}
          {preview && !loadingPreview && (
            <div className="pt-1">
              {isDowngrade || (isUpgrade && !upgradeHasCost) ? (
                <button
                  onClick={handleScheduleOrFreeChange}
                  disabled={processing}
                  className="w-full rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-50"
                >
                  {processing ? 'Procesando…' : isDowngrade ? 'Programar cambio de plan' : 'Aplicar mejora'}
                </button>
              ) : (
                // Upgrade con costo: pago por PayPal de la diferencia
                <div className="space-y-2">
                  <p className="text-xs text-gray-500 text-center">Pagá la diferencia de forma segura con PayPal</p>
                  {PAYPAL_CLIENT_ID ? (
                    <PayPalButtons
                      style={{ layout: 'vertical', color: 'blue', shape: 'rect' }}
                      disabled={processing}
                      forceReRender={[selected?.id, preview?.amountToPayGs]}
                      createOrder={handleCreateOrder}
                      onApprove={handleApprove}
                      onError={() => setError('Ocurrió un error con PayPal. Intentá de nuevo.')}
                      onCancel={() => setError('Cancelaste el pago. Podés intentarlo de nuevo.')}
                    />
                  ) : (
                    <p className="text-xs text-red-500 text-center">PayPal no está configurado.</p>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );

  // Envolver todo el modal en el provider: se monta una sola vez mientras
  // el modal está abierto, evitando el re-montaje que rompe el SDK de PayPal.
  const wrapped = PAYPAL_CLIENT_ID ? (
    <PayPalScriptProvider options={{ clientId: PAYPAL_CLIENT_ID, currency: 'USD', intent: 'capture', components: 'buttons', locale: 'es_ES' }}>
      {modalContent}
    </PayPalScriptProvider>
  ) : (
    modalContent
  );

  return createPortal(wrapped, document.body);
}
