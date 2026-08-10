import { useEffect, useRef, useState } from 'react';
import { Link, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { PayPalScriptProvider, PayPalButtons } from '@paypal/react-paypal-js';
import { useAuth } from '../context/AuthContext';
import AlertMessage from '../components/AlertMessage';
import api from '../services/api';

// ─────────────────────────────────────────
// Checkout.jsx — PayPal + AdamsPay (pasarela local Paraguay)
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

// ── Iconos SVG reutilizables ─────────────────────────────────────────────────
const CheckIcon = ({ className = 'h-5 w-5' }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
  </svg>
);

const LockIcon = ({ className = 'h-4 w-4' }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
  </svg>
);

const CreditCardIcon = ({ className = 'h-5 w-5' }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
  </svg>
);

const SpinnerIcon = ({ className = 'h-4 w-4' }) => (
  <svg className={`animate-spin ${className}`} viewBox="0 0 24 24" fill="none">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
  </svg>
);

// ── Pantalla de comprobante ───────────────────────────────────────────────────
function ReceiptScreen({ receipt, onGoToDashboard }) {
  const [showBilling, setShowBilling] = useState(false);
  const [billingForm, setBillingForm] = useState({ razonSocial: '', ruc: '' });

  const paymentLabel = receipt.paymentMethod?.type === 'adamspay'
    ? 'AdamsPay'
    : receipt.paymentMethod?.type === 'paypal'
      ? 'PayPal'
      : receipt.paymentMethod?.type || 'plataforma de pago';

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white py-8 px-4 print:bg-white print:py-0">
      <div className="mx-auto max-w-2xl">
        <div className="rounded-2xl bg-white shadow-lg border border-gray-100 overflow-hidden print:shadow-none print:border-0">

          {/* Banda verde superior */}
          <div className="bg-gradient-to-r from-green-500 to-emerald-500 px-8 py-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2 text-white mb-1">
                  <CheckIcon className="h-5 w-5" />
                  <span className="font-semibold text-sm">Pago aprobado via {paymentLabel}</span>
                </div>
                <p className="text-green-100 text-xs">Tu empresa ya está activa</p>
              </div>
              <div className="text-right text-white">
                <p className="text-xs text-green-200">Comprobante N.°</p>
                <p className="font-mono font-bold text-sm">{receipt.receiptNumber}</p>
              </div>
            </div>
          </div>

          <div className="px-8 py-6 space-y-6">

            {/* Emisor + tipo de documento */}
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
                <span className="mt-1 inline-block rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-semibold text-green-700">
                  Pagado
                </span>
              </div>
            </div>

            <hr className="border-gray-100" />

            {/* Pagador */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Datos del pagador</p>
                {!showBilling && (
                  <button
                    type="button"
                    onClick={() => setShowBilling(true)}
                    className="text-xs text-primary-600 hover:text-primary-800 font-medium print:hidden"
                  >
                    + Agregar razón social / RUC
                  </button>
                )}
              </div>
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

              {/* Formulario de razón social / RUC (opcional) */}
              {showBilling && (
                <div className="mt-4 rounded-lg border border-blue-100 bg-blue-50/50 p-4 space-y-3 print:border-blue-200">
                  <p className="text-xs font-semibold text-blue-700">Datos de facturación (opcional)</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">Razón social</label>
                      <input
                        type="text"
                        value={billingForm.razonSocial}
                        onChange={(e) => setBillingForm(f => ({ ...f, razonSocial: e.target.value }))}
                        placeholder="Ej: Mi Empresa S.A."
                        className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100 print:border-gray-300"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">RUC</label>
                      <input
                        type="text"
                        value={billingForm.ruc}
                        onChange={(e) => setBillingForm(f => ({ ...f, ruc: e.target.value }))}
                        placeholder="Ej: 80012345-6"
                        className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100 print:border-gray-300"
                      />
                    </div>
                  </div>
                  <p className="text-xs text-gray-400 italic">
                    Estos datos se incluirán en el PDF al imprimir. No se emite factura fiscal.
                  </p>
                </div>
              )}

              {/* Datos de facturación para impresión (si fueron llenados) */}
              {billingForm.razonSocial && (
                <div className="hidden print:block mt-3 text-sm">
                  <p className="text-xs text-gray-400">Razón social</p>
                  <p className="font-medium text-gray-800">{billingForm.razonSocial}</p>
                  {billingForm.ruc && (
                    <>
                      <p className="text-xs text-gray-400 mt-1">RUC</p>
                      <p className="font-medium text-gray-800">{billingForm.ruc}</p>
                    </>
                  )}
                </div>
              )}
            </div>

            <hr className="border-gray-100" />

            {/* Concepto */}
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Detalle del concepto</p>
              <div className="rounded-lg border border-gray-100 overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left font-semibold text-gray-600 text-xs">Concepto</th>
                      <th className="px-4 py-2 text-right font-semibold text-gray-600 text-xs">Monto</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="px-4 py-3">
                        <p className="font-medium text-gray-800">{receipt.concept?.description}</p>
                        <p className="text-xs text-gray-400">
                          {receipt.concept?.period || (receipt.concept?.periodStart
                            ? `${formatDateShort(receipt.concept.periodStart)} — ${formatDateShort(receipt.concept.periodEnd)}`
                            : '')}
                        </p>
                      </td>
                      <td className="px-4 py-3 text-right font-bold text-gray-900">
                        {receipt.concept?.amountGs
                          ? formatGs(receipt.concept.amountGs)
                          : receipt.amount?.value
                            ? `${receipt.amount.currency === 'PYG' ? formatGs(receipt.amount.value) : `USD ${receipt.amount.value}`}`
                            : '—'}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
              {(receipt.concept?.amountWords || receipt.amount?.inWords) && (
                <p className="mt-2 text-xs text-gray-400 italic">
                  Son: {receipt.concept?.amountWords || receipt.amount?.inWords}
                </p>
              )}
            </div>

            <hr className="border-gray-100" />

            {/* Vigencia + método */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="rounded-lg bg-blue-50 border border-blue-100 p-3">
                <p className="text-xs font-semibold text-blue-600 uppercase tracking-wide mb-1">Vigencia</p>
                <p className="text-sm font-medium text-gray-800">
                  {receipt.validity?.from
                    ? `${formatDateShort(receipt.validity.from)} — ${formatDateShort(receipt.validity.to)}`
                    : receipt.concept?.periodStart
                      ? `${formatDateShort(receipt.concept.periodStart)} — ${formatDateShort(receipt.concept.periodEnd)}`
                      : '—'}
                </p>
              </div>
              <div className="rounded-lg bg-gray-50 border border-gray-100 p-3">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Método de pago</p>
                <div className="flex items-center gap-2">
                  <CreditCardIcon className="h-4 w-4 text-gray-400" />
                  <p className="font-medium text-gray-800 text-sm">
                    Pago via {paymentLabel}
                  </p>
                </div>
                <p className="text-xs text-gray-400 mt-0.5">
                  {receipt.paymentMethod?.type === 'adamspay'
                    ? 'Tarjeta · Tigo Money · Zimple'
                    : receipt.paymentMethod?.cardLast4
                      ? `Terminada en ${receipt.paymentMethod.cardLast4}`
                      : 'Sandbox'}
                </p>
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
                  <span>ID captura {paymentLabel}</span>
                  <span className="font-mono">{receipt.paypalCaptureId}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span>Procesado</span>
                <span>{formatDate(receipt.processedAt)}</span>
              </div>
            </div>

            {/* Leyenda legal + aviso de no factura */}
            <div className="rounded-lg bg-amber-50 border border-amber-100 p-4 space-y-2">
              <p className="text-xs font-semibold text-amber-700">Nota importante</p>
              <p className="text-xs text-amber-700 leading-relaxed">
                Este comprobante <strong>no constituye factura fiscal</strong>. Es un recibo digital de pago
                emitido por el Sistema BI de Retención de Talento (proyecto académico — UNIDA).
                A medida que la plataforma evolucione, se podrá emitir facturación electrónica conforme a
                las normativas de la SET (Subsecretaría de Estado de Tributación).
              </p>
            </div>

            {receipt.legalNote && (
              <div className="rounded-lg bg-gray-50 border border-gray-100 p-3">
                <p className="text-xs text-gray-500 italic leading-relaxed">{receipt.legalNote}</p>
              </div>
            )}

          </div>
        </div>

        {/* Acciones */}
        <div className="mt-6 flex flex-col sm:flex-row gap-3 justify-center print:hidden">
          <button
            type="button"
            onClick={() => window.print()}
            className="flex items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-5 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 shadow-sm transition-colors"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
            </svg>
            Imprimir / Guardar PDF
          </button>
          <button
            type="button"
            onClick={onGoToDashboard}
            className="flex items-center justify-center gap-2 rounded-xl bg-primary-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-primary-700 shadow-sm transition-colors"
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
  const navigate  = useNavigate();
  const location  = useLocation();
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const [plans, setPlans]               = useState([]);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [loading, setLoading]           = useState(false);
  const [adamsLoading, setAdamsLoading] = useState(false);
  const [error, setError]               = useState('');
  const [receipt, setReceipt]           = useState(null);
  const currentOrderRef                 = useRef({ orderId: null, planId: null });
  const preselectedPlanId = location.state?.preselectedPlan || null;

  // AdamsPay return detection
  const adamsDocIdRef = useRef(sessionStorage.getItem('adamspay_docId'));
  const adamsPayTxRef = useRef(new URLSearchParams(window.location.search).get('payTx'));
  const isReturningFromAdams = useRef(
    !!adamsDocIdRef.current ||
    window.location.search.includes('payProvider=adams') ||
    window.location.search.includes('payEndReason')
  );

  useEffect(() => {
    if (isReturningFromAdams.current) {
      localStorage.setItem('_returning_from_payment', '1');
      sessionStorage.removeItem('adamspay_docId');
      sessionStorage.removeItem('adamspay_planId');
      window.history.replaceState({}, '', window.location.pathname);
      setTimeout(() => localStorage.removeItem('_returning_from_payment'), 5000);
    }
  }, []);

  useEffect(() => {
    api.get('/payments/plans')
      .then(({ data }) => {
        const loadedPlans = data.data ?? [];
        setPlans(loadedPlans);
        if (loadedPlans.length > 0) {
          const match = preselectedPlanId
            ? loadedPlans.find((p) => p.id === preselectedPlanId)
            : null;
          setSelectedPlan(match || loadedPlans[0]);
        }
      })
      .catch(() => setError('No se pudieron cargar los planes. Intentá recargar la página.'));
  }, [preselectedPlanId]);

  // Verificar retorno de AdamsPay
  useEffect(() => {
    if (authLoading) return;
    if (!isReturningFromAdams.current) return;

    const docId = adamsDocIdRef.current;
    const urlParams    = new URLSearchParams(window.location.search);
    const payEndReason = urlParams.get('payEndReason') || sessionStorage.getItem('adamspay_lastEndReason');

    if (payEndReason === 'cancel' || payEndReason === 'cancelled') {
      setError('Cancelaste el pago con AdamsPay. Podés intentarlo de nuevo.');
      isReturningFromAdams.current = false;
      return;
    }

    if (!isAuthenticated) {
      setError('Tu sesión expiró mientras procesabas el pago. Iniciá sesión de nuevo.');
      isReturningFromAdams.current = false;
      return;
    }

    if (!docId) {
      setError('No se encontró el ID del pago. Si ya pagaste, verificá el estado en tu suscripción.');
      isReturningFromAdams.current = false;
      return;
    }

    isReturningFromAdams.current = false;
    setLoading(true);

    api.post(`/payments/adamspay/verify/${docId}`)
      .then(({ data }) => {
        if (data.success && data.data?.paymentId) {
          api.get(`/payments/receipt/${data.data.paymentId}`)
            .then(({ data: r }) => setReceipt({ ...r.data, paypalCaptureId: adamsPayTxRef.current || null }))
            .catch(() => {
              setError('Pago confirmado via AdamsPay! Redirigiendo al dashboard...');
              setTimeout(() => { navigate('/dashboard', { replace: true }); window.location.reload(); }, 2500);
            });
        } else {
          setError(data.message || 'El pago todavía no fue confirmado. Si ya pagaste, esperá unos minutos y recargá.');
        }
      })
      .catch((err) => {
        const msg = err.response?.data?.message ?? 'No se pudo verificar el pago de AdamsPay';
        setError(msg);
      })
      .finally(() => setLoading(false));
  }, [authLoading, isAuthenticated, navigate]);

  // PayPal: crear orden
  const handleCreateOrder = async () => {
    setError('');
    if (!selectedPlan) { setError('Seleccioná un plan primero'); return ''; }
    try {
      const { data: res } = await api.post('/payments/create-order', { planId: selectedPlan.id });
      currentOrderRef.current = { orderId: res.data.orderId, planId: selectedPlan.id };
      return res.data.orderId;
    } catch (err) {
      setError(err.response?.data?.message ?? 'Error al crear la orden con PayPal');
      return '';
    }
  };

  // PayPal: capturar pago aprobado
  const handleApprove = async (data) => {
    setLoading(true);
    setError('');
    try {
      const { data: res } = await api.post('/payments/capture-order', {
        orderId: data.orderID,
        planId:  currentOrderRef.current.planId || selectedPlan?.id,
      });
      if (res.success && res.data.status === 'APPROVED') {
        const { data: receiptRes } = await api.get(`/payments/receipt/${res.data.paymentId}`);
        setReceipt({ ...receiptRes.data, paypalCaptureId: res.data.paypalCaptureId });
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

  // AdamsPay: redirigir al link de pago
  const handleAdamsPay = async () => {
    setError('');
    if (!selectedPlan) { setError('Seleccioná un plan primero'); return; }
    setAdamsLoading(true);
    try {
      const { data: res } = await api.post('/payments/adamspay/create', { planId: selectedPlan.id });
      if (res.data?.payUrl) {
        sessionStorage.setItem('adamspay_docId', res.data.docId);
        sessionStorage.setItem('adamspay_planId', selectedPlan.id);
        window.location.href = res.data.payUrl;
      } else {
        setError('AdamsPay no devolvió un link de pago. Intentá de nuevo.');
      }
    } catch (err) {
      setError(err.response?.data?.message ?? 'Error al crear el cobro con AdamsPay');
    } finally {
      setAdamsLoading(false);
    }
  };

  const handleGoToDashboard = () => {
    navigate('/dashboard', { replace: true });
    window.location.reload();
  };

  // ── Guards ────────────────────────────────────────────────────────────────
  if (authLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary-500 border-t-transparent" />
      </div>
    );
  }

  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (receipt) return <ReceiptScreen receipt={receipt} onGoToDashboard={handleGoToDashboard} />;

  // ── Pantalla principal de checkout ────────────────────────────────────────
  return (
    <PayPalScriptProvider options={{
      clientId: PAYPAL_CLIENT_ID, currency: 'USD', intent: 'capture', components: 'buttons', locale: 'es_ES',
    }}>
      <div className="min-h-screen bg-gradient-to-b from-primary-900 via-primary-800 to-gray-900">

        {/* Header con branding */}
        <header className="border-b border-white/10 bg-white/5 backdrop-blur-sm">
          <div className="mx-auto max-w-5xl flex items-center justify-between px-6 py-4">
            <Link to="/" className="flex items-center gap-2 text-white">
              <span className="text-xl" aria-hidden="true">📈</span>
              <span className="text-sm font-bold">Sistema BI</span>
            </Link>
            <div className="flex items-center gap-2 text-sm text-primary-200">
              <LockIcon className="h-3.5 w-3.5" />
              <span>Pago seguro</span>
            </div>
          </div>
        </header>

        <main className="mx-auto max-w-5xl px-4 py-10">

          {/* Titulo */}
          <div className="mb-8 text-center">
            <h1 className="text-3xl font-extrabold text-white">Activar suscripción</h1>
            <p className="mt-2 text-sm text-primary-200">
              Elegí tu plan y completá el pago para activar{' '}
              <strong className="text-white">{user?.companyName}</strong>
            </p>
          </div>

          {/* Grid: Planes + Pago */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">

            {/* ─── Columna izquierda: Selección de plan ─── */}
            <div className="lg:col-span-5 space-y-3">
              <div className="rounded-2xl bg-white/10 backdrop-blur-sm border border-white/10 p-5">
                <h2 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary-500 text-xs font-bold text-white">1</span>
                  Seleccioná tu plan
                </h2>

                <div className="space-y-3">
                  {plans.map((plan) => {
                    const isSelected = selectedPlan?.id === plan.id;
                    return (
                      <button
                        key={plan.id}
                        type="button"
                        onClick={() => { setSelectedPlan(plan); setError(''); }}
                        className={`group w-full text-left rounded-xl border-2 p-4 transition-all duration-200 ${
                          isSelected
                            ? 'border-primary-400 bg-white shadow-lg shadow-primary-500/10 scale-[1.02]'
                            : 'border-white/20 bg-white/5 hover:border-white/40 hover:bg-white/10'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <p className={`font-semibold text-sm ${isSelected ? 'text-gray-900' : 'text-white'}`}>
                              {plan.name}
                            </p>
                            <p className={`text-xs mt-0.5 ${isSelected ? 'text-gray-500' : 'text-primary-200'}`}>
                              Hasta {plan.employeeLimit} colaboradores
                            </p>
                          </div>
                          <div className="text-right">
                            <p className={`font-bold text-sm ${isSelected ? 'text-gray-900' : 'text-white'}`}>
                              {formatGs(plan.priceGs)}
                            </p>
                            <p className={`text-xs ${isSelected ? 'text-gray-400' : 'text-primary-300'}`}>/mes</p>
                          </div>
                        </div>
                        {isSelected && (
                          <div className="mt-2 flex items-center gap-1 text-xs text-primary-600 font-medium">
                            <CheckIcon className="h-3.5 w-3.5" />
                            Seleccionado
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* Sandbox notice */}
                {import.meta.env.DEV && (
                  <div className="mt-4 rounded-lg bg-amber-500/10 border border-amber-400/30 p-3 text-xs text-amber-200">
                    <p className="font-semibold mb-1">🧪 Modo Sandbox</p>
                    <p>Usá una cuenta PayPal de sandbox para probar.</p>
                    <a
                      href="https://developer.paypal.com/tools/sandbox/accounts/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-1 inline-block underline hover:text-amber-100"
                    >
                      Ver cuentas de prueba →
                    </a>
                  </div>
                )}
              </div>
            </div>

            {/* ─── Columna derecha: Resumen + Pago ─── */}
            <div className="lg:col-span-7">
              <div className="rounded-2xl bg-white shadow-2xl shadow-black/20 border border-gray-100 overflow-hidden">

                {/* Cabecera de la tarjeta de pago */}
                <div className="bg-gradient-to-r from-gray-50 to-white px-6 py-5 border-b border-gray-100">
                  <h2 className="text-sm font-semibold text-gray-800 flex items-center gap-2">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary-500 text-xs font-bold text-white">2</span>
                    Completá tu pago
                  </h2>
                </div>

                <div className="p-6 space-y-5">

                  {/* Resumen del plan */}
                  {selectedPlan ? (
                    <div className="rounded-xl bg-gradient-to-r from-primary-50 to-blue-50 border border-primary-100 p-5">
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <p className="text-xs text-gray-500 uppercase tracking-wide font-medium">Plan seleccionado</p>
                          <p className="text-base font-bold text-gray-900 mt-0.5">{selectedPlan.name}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-2xl font-extrabold text-gray-900">{formatGs(selectedPlan.priceGs)}</p>
                          <p className="text-xs text-gray-500">por mes</p>
                        </div>
                      </div>
                      <div className="flex items-center justify-between pt-2 border-t border-primary-100/50">
                        <span className="text-xs text-gray-500">Equivalente aproximado</span>
                        <span className="text-sm font-semibold text-primary-700">
                          ≈ USD {(selectedPlan.priceGs / 7500).toFixed(2)}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="rounded-xl border-2 border-dashed border-gray-200 p-8 text-center">
                      <CreditCardIcon className="h-8 w-8 mx-auto text-gray-300 mb-2" />
                      <p className="text-sm text-gray-400">Seleccioná un plan para continuar</p>
                    </div>
                  )}

                  {/* Alertas */}
                  {error && (
                    <AlertMessage type="error" message={error} onClose={() => setError('')} />
                  )}

                  {/* Loading overlay */}
                  {loading && (
                    <div className="flex items-center justify-center gap-3 rounded-xl bg-blue-50 border border-blue-100 p-4 text-sm text-blue-700">
                      <SpinnerIcon className="h-5 w-5" />
                      <span className="font-medium">Procesando tu pago...</span>
                    </div>
                  )}

                  {/* Botones de pago */}
                  {!loading && selectedPlan && (
                    <div className="space-y-4">
                      {/* PayPal */}
                      <div>
                        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">Pagar con PayPal</p>
                        <PayPalButtons
                          style={{ layout: 'vertical', color: 'blue', shape: 'rect', label: 'pay', height: 48 }}
                          disabled={!selectedPlan}
                          forceReRender={[selectedPlan?.id]}
                          createOrder={handleCreateOrder}
                          onApprove={handleApprove}
                          onError={handleError}
                          onCancel={handleCancel}
                        />
                      </div>

                      {/* Separador */}
                      <div className="relative">
                        <div className="absolute inset-0 flex items-center">
                          <div className="w-full border-t border-gray-200" />
                        </div>
                        <div className="relative flex justify-center text-xs">
                          <span className="bg-white px-4 text-gray-400 font-medium">o pagá con</span>
                        </div>
                      </div>

                      {/* AdamsPay */}
                      <button
                        type="button"
                        onClick={handleAdamsPay}
                        disabled={adamsLoading || !selectedPlan}
                        className="w-full flex items-center justify-center gap-3 rounded-xl border-2 border-blue-600 bg-white px-4 py-3.5 text-sm font-semibold text-blue-700 transition-all hover:bg-blue-50 hover:shadow-md disabled:opacity-60 disabled:cursor-not-allowed"
                      >
                        {adamsLoading ? (
                          <>
                            <SpinnerIcon />
                            Generando link de pago...
                          </>
                        ) : (
                          <>
                            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-700 text-xs font-bold text-white shadow-sm">A</span>
                            Pagar con AdamsPay
                            <span className="ml-auto text-xs font-normal text-gray-400">Tarjeta · Tigo · Zimple</span>
                          </>
                        )}
                      </button>
                    </div>
                  )}

                  {/* Footer seguridad */}
                  <div className="flex items-center justify-center gap-4 pt-4 border-t border-gray-100">
                    <div className="flex items-center gap-1.5 text-xs text-gray-400">
                      <LockIcon className="h-3.5 w-3.5" />
                      <span>Cifrado SSL</span>
                    </div>
                    <div className="h-3 w-px bg-gray-200" />
                    <div className="flex items-center gap-1.5 text-xs text-gray-400">
                      <CreditCardIcon className="h-3.5 w-3.5" />
                      <span>Pago seguro</span>
                    </div>
                    <div className="h-3 w-px bg-gray-200" />
                    <div className="flex items-center gap-1.5 text-xs text-gray-400">
                      <CheckIcon className="h-3.5 w-3.5" />
                      <span>Activación inmediata</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Link volver */}
              <div className="mt-5 text-center">
                <Link to="/" className="text-xs text-primary-300 hover:text-white transition-colors">
                  ← Volver al inicio
                </Link>
              </div>
            </div>

          </div>
        </main>
      </div>
    </PayPalScriptProvider>
  );
}
