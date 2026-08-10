import { useEffect, useRef, useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { PayPalScriptProvider, PayPalButtons } from '@paypal/react-paypal-js';
import { useAuth } from '../context/AuthContext';
import AlertMessage from '../components/AlertMessage';
import api from '../services/api';

// ─────────────────────────────────────────
// Checkout.jsx — Integración PayPal Orders API v2 (Sandbox)
// Flujo: seleccionar plan → botón PayPal → popup aprobación → capturar → comprobante
// ─────────────────────────────────────────

const PAYPAL_CLIENT_ID = import.meta.env.VITE_PAYPAL_CLIENT_ID;

const formatGs = (n) => `Gs. ${Number(n).toLocaleString('es-PY')}`;

const formatDate = (d) => {
  if (!d) return '—';
  return new Date(d).toLocaleString('es-PY', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
};

const formatDateShort = (d) => {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('es-PY', {
    day: '2-digit', month: '2-digit', year: 'numeric',
  });
};

// ── Pantalla de comprobante ───────────────────────────────────────────────────
function ReceiptScreen({ receipt, onGoToDashboard }) {
  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="mx-auto max-w-2xl">
        <div className="rounded-2xl bg-white shadow-sm border border-gray-200 overflow-hidden">

          {/* Banda verde superior */}
          <div className="bg-green-500 px-8 py-5 flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2 text-white mb-1">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                <span className="font-semibold text-sm">Pago aprobado por PayPal</span>
              </div>
              <p className="text-green-100 text-xs">Tu empresa ya está activa</p>
            </div>
            <div className="text-right text-white">
              <p className="text-xs text-green-200">Comprobante N.°</p>
              <p className="font-mono font-bold text-sm">{receipt.receiptNumber}</p>
            </div>
          </div>

          <div className="px-8 py-6 space-y-6">

            {/* Emisor */}
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Emisor</p>
                <p className="font-bold text-gray-900">{receipt.emitter.name}</p>
                <p className="text-xs text-gray-500">{receipt.emitter.email}</p>
                <p className="text-xs text-gray-400 italic mt-0.5">{receipt.emitter.note}</p>
              </div>
              <div className="text-right">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Fecha de emisión</p>
                <p className="text-sm text-gray-700">{formatDate(receipt.issuedAt)}</p>
                <span className="mt-1 inline-block rounded-full bg-green-100 px-2 py-0.5 text-xs font-semibold text-green-700">
                  Pagado
                </span>
              </div>
            </div>

            <hr className="border-gray-100" />

            {/* Pagador */}
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Datos del pagador</p>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-xs text-gray-400">Empresa</p>
                  <p className="font-medium text-gray-800">{receipt.payer.companyName}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400">Responsable</p>
                  <p className="font-medium text-gray-800">{receipt.payer.contactName}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-xs text-gray-400">Correo electrónico</p>
                  <p className="font-medium text-gray-800">{receipt.payer.email}</p>
                </div>
              </div>
            </div>

            <hr className="border-gray-100" />

            {/* Concepto */}
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Detalle del concepto</p>
              <div className="rounded-lg bg-gray-50 border border-gray-100 p-4 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Concepto</span>
                  <span className="font-medium text-gray-800">{receipt.concept.description}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Plan</span>
                  <span className="font-medium text-gray-800">{receipt.concept.plan}</span>
                </div>
                {receipt.concept.periodStart && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Período</span>
                    <span className="font-medium text-gray-800">
                      {formatDateShort(receipt.concept.periodStart)} al {formatDateShort(receipt.concept.periodEnd)}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Monto */}
            <div className="rounded-xl bg-primary-50 border border-primary-100 p-4">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-semibold text-gray-700">Total recibido</span>
                <span className="text-2xl font-extrabold text-primary-700">{formatGs(receipt.amount.value)}</span>
              </div>
              <p className="text-xs text-gray-500 capitalize">
                En letras: <em>{receipt.amount.inWords}</em>
              </p>
              <p className="text-xs text-gray-400 mt-0.5">Moneda: {receipt.amount.currency}</p>
            </div>

            {/* Forma de pago */}
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Forma de pago</p>
              <div className="flex items-center gap-3 text-sm">
                <div className="flex h-8 w-14 items-center justify-center rounded border border-blue-200 bg-blue-50">
                  <span className="text-xs font-bold text-blue-600">PayPal</span>
                </div>
                <div>
                  <p className="font-medium text-gray-800">Pago via PayPal</p>
                  <p className="text-xs text-gray-400">Sandbox · {receipt.paymentMethod.type}</p>
                </div>
              </div>
            </div>

            <hr className="border-gray-100" />

            {/* Trazabilidad */}
            <div className="text-xs text-gray-400 space-y-1">
              <div className="flex justify-between">
                <span>ID de comprobante</span>
                <span className="font-mono">{receipt.receiptId}</span>
              </div>
              {receipt.paypalCaptureId && (
                <div className="flex justify-between">
                  <span>ID captura PayPal</span>
                  <span className="font-mono">{receipt.paypalCaptureId}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span>Procesado</span>
                <span>{formatDate(receipt.processedAt)}</span>
              </div>
            </div>

            {/* Leyenda legal */}
            <div className="rounded-lg bg-gray-50 border border-gray-100 p-3">
              <p className="text-xs text-gray-500 italic leading-relaxed">{receipt.legalNote}</p>
            </div>

          </div>
        </div>

        {/* Acciones */}
        <div className="mt-6 flex flex-col sm:flex-row gap-3 justify-center">
          <button
            type="button"
            onClick={() => window.print()}
            className="flex items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-5 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
            </svg>
            Imprimir / Guardar PDF
          </button>
          <button
            type="button"
            onClick={onGoToDashboard}
            className="flex items-center justify-center gap-2 rounded-lg bg-primary-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-primary-700 transition-colors"
          >
            Ir al Dashboard
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Componente principal ──────────────────────────────────────────────────────
export default function Checkout() {
  const navigate = useNavigate();
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const [plans, setPlans]             = useState([]);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [loading, setLoading]         = useState(false);
  const [error, setError]             = useState('');
  const [receipt, setReceipt]         = useState(null);
  // orderId que devuelve /create-order, necesario para capturar
  const currentOrderRef               = useRef({ orderId: null, planId: null });

  useEffect(() => {
    api.get('/payments/plans')
      .then(({ data }) => {
        setPlans(data.data);
        if (data.data.length > 0) setSelectedPlan(data.data[0]);
      })
      .catch(() => setError('No se pudieron cargar los planes. Intentá recargar la página.'));
  }, []);

  // ── Paso 1: el SDK de PayPal llama esto para crear la orden en nuestro backend
  const handleCreateOrder = async () => {
    setError('');
    if (!selectedPlan) {
      setError('Seleccioná un plan primero');
      // Retornar cadena vacía evita que el SDK crashee
      return '';
    }
    try {
      const { data: res } = await api.post('/payments/create-order', {
        planId: selectedPlan.id,
      });
      // Guardamos para usarlo en el capture
      currentOrderRef.current = { orderId: res.data.orderId, planId: selectedPlan.id };
      return res.data.orderId;
    } catch (err) {
      setError(err.response?.data?.message ?? 'Error al crear la orden con PayPal');
      return '';
    }
  };

  // ── Paso 2: el usuario aprobó en el popup, capturamos el pago
  const handleApprove = async (data) => {
    setLoading(true);
    setError('');
    try {
      const { data: res } = await api.post('/payments/capture-order', {
        orderId: data.orderID,
        planId:  currentOrderRef.current.planId || selectedPlan?.id,
      });

      if (res.success && res.data.status === 'APPROVED') {
        // Obtener comprobante estructurado
        const { data: receiptRes } = await api.get(`/payments/receipt/${res.data.paymentId}`);
        // Enriquecer con el captureId de PayPal para trazabilidad
        setReceipt({
          ...receiptRes.data,
          paypalCaptureId: res.data.paypalCaptureId,
        });
      } else if (res.data?.status === 'PENDING') {
        setError('Tu pago está en proceso de verificación por PayPal. Te notificaremos cuando se confirme.');
      }
    } catch (err) {
      setError(err.response?.data?.message ?? 'Error al capturar el pago con PayPal');
    } finally {
      setLoading(false);
    }
  };

  const handleError = (err) => {
    console.error('PayPal error:', err);
    setError('Ocurrió un error con PayPal. Por favor intentá de nuevo.');
    setLoading(false);
  };

  const handleCancel = () => {
    setError('Cancelaste el pago. Podés intentarlo de nuevo cuando quieras.');
    setLoading(false);
  };

  const handleGoToDashboard = () => {
    navigate('/dashboard', { replace: true });
    window.location.reload();
  };

  // ── Guards ────────────────────────────────────────────────────────────────
  if (authLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary-500 border-t-transparent" />
      </div>
    );
  }

  if (!isAuthenticated) return <Navigate to="/login" replace />;

  if (receipt) {
    return <ReceiptScreen receipt={receipt} onGoToDashboard={handleGoToDashboard} />;
  }

  // ── Pantalla principal de checkout ────────────────────────────────────────
  return (
    <PayPalScriptProvider options={{
      clientId:   PAYPAL_CLIENT_ID,
      currency:   'USD',
      intent:     'capture',
      components: 'buttons',
    }}>
      <div className="min-h-screen bg-gray-50 py-8 px-4">
        <div className="mx-auto max-w-4xl">

          {/* Header */}
          <div className="mb-8 text-center">
            <h1 className="text-2xl font-bold text-gray-900">Activar suscripción</h1>
            <p className="mt-1 text-sm text-gray-500">
              Seleccioná tu plan y completá el pago con PayPal para activar tu empresa{' '}
              <strong>{user?.companyName}</strong>
            </p>
          </div>

          <div className="grid grid-cols-1 gap-8 lg:grid-cols-5">

            {/* Columna izquierda: Planes */}
            <div className="lg:col-span-2 space-y-4">
              <h2 className="text-sm font-semibold text-gray-700 mb-3">Seleccioná tu plan</h2>

              {plans.map((plan) => (
                <button
                  key={plan.id}
                  type="button"
                  onClick={() => { setSelectedPlan(plan); setError(''); }}
                  className={`w-full text-left rounded-xl border p-4 transition-all ${
                    selectedPlan?.id === plan.id
                      ? 'border-primary-500 bg-primary-50 ring-2 ring-primary-500/20'
                      : 'border-gray-200 bg-white hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-gray-900 text-sm">{plan.name}</p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        Hasta {plan.employeeLimit} colaboradores
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-gray-900 text-sm">{formatGs(plan.priceGs)}</p>
                      <p className="text-xs text-gray-400">/mes</p>
                    </div>
                  </div>
                  {selectedPlan?.id === plan.id && (
                    <div className="mt-2 flex items-center gap-1 text-xs text-primary-600">
                      <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                      Seleccionado
                    </div>
                  )}
                </button>
              ))}

              {/* Solo en desarrollo — recordatorio sandbox */}
              {import.meta.env.DEV && (
                <div className="mt-2 rounded-lg bg-amber-50 border border-amber-100 p-3 text-xs text-amber-700">
                  <p className="font-semibold mb-1">🧪 Modo Sandbox (solo desarrollo)</p>
                  <p>Usá una cuenta PayPal de sandbox para completar el pago.</p>
                  <a
                    href="https://developer.paypal.com/tools/sandbox/accounts/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-1 inline-block underline hover:text-amber-900"
                  >
                    Ver cuentas de prueba →
                  </a>
                </div>
              )}
            </div>

            {/* Columna derecha: Botón PayPal */}
            <div className="lg:col-span-3">
              <div className="rounded-2xl bg-white border border-gray-200 shadow-sm p-6">

                <h2 className="text-sm font-semibold text-gray-700 mb-1 flex items-center gap-2">
                  <svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                  </svg>
                  Pago seguro con PayPal
                </h2>
                <p className="text-xs text-gray-400 mb-5">
                  Al hacer clic en el botón serás redirigido al portal de PayPal para completar el pago.
                </p>

                {/* Resumen del plan seleccionado */}
                {selectedPlan && (
                  <div className="mb-5 rounded-lg bg-gray-50 border border-gray-100 px-4 py-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Total a pagar</span>
                      <span className="text-lg font-bold text-gray-900">{formatGs(selectedPlan.priceGs)}</span>
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {selectedPlan.name} · Cobro mensual recurrente ·{' '}
                      ≈ USD {(selectedPlan.priceGs / 7500).toFixed(2)} (Sandbox)
                    </p>
                  </div>
                )}

                {/* Alertas */}
                {error && (
                  <div className="mb-4">
                    <AlertMessage type="error" message={error} onClose={() => setError('')} />
                  </div>
                )}

                {/* Loading overlay */}
                {loading && (
                  <div className="mb-4 flex items-center justify-center gap-2 rounded-lg bg-blue-50 border border-blue-100 p-3 text-sm text-blue-700">
                    <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Procesando pago con PayPal...
                  </div>
                )}

                {/* Botón oficial PayPal */}
                {!loading && selectedPlan && (
                  <PayPalButtons
                    style={{
                      layout:  'vertical',
                      color:   'blue',
                      shape:   'rect',
                      label:   'pay',
                      height:  45,
                    }}
                    disabled={!selectedPlan}
                    forceReRender={[selectedPlan?.id]}
                    createOrder={handleCreateOrder}
                    onApprove={handleApprove}
                    onError={handleError}
                    onCancel={handleCancel}
                  />
                )}

                {!selectedPlan && (
                  <div className="rounded-lg bg-gray-100 border border-dashed border-gray-300 p-6 text-center text-sm text-gray-400">
                    Seleccioná un plan para habilitar el botón de pago
                  </div>
                )}

                {/* Seguridad */}
                <div className="mt-4 flex items-center justify-center gap-2 text-xs text-gray-400">
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                  Pago procesado por PayPal · Cifrado SSL
                </div>
              </div>

              <div className="mt-4 text-center">
                <Link to="/" className="text-xs text-gray-400 hover:text-gray-600 transition-colors">
                  ← Volver al inicio
                </Link>
              </div>
            </div>

          </div>
        </div>
      </div>
    </PayPalScriptProvider>
  );
}
