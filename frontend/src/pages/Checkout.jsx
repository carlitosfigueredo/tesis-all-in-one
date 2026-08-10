import { useEffect, useRef, useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import AlertMessage from '../components/AlertMessage';
import api from '../services/api';

// Formatear numero de tarjeta con espacios cada 4 digitos
const formatCardNumber = (value) => {
  const clean = value.replace(/\D/g, '').slice(0, 16);
  return clean.replace(/(\d{4})(?=\d)/g, '$1 ');
};

// Detectar marca por primer digito
const detectBrand = (number) => {
  const clean = number.replace(/\s/g, '');
  if (clean.startsWith('4')) return 'VISA';
  if (clean.startsWith('5')) return 'MASTERCARD';
  if (clean.startsWith('3')) return 'AMEX';
  return null;
};

const BRAND_COLORS = {
  VISA: 'text-blue-600',
  MASTERCARD: 'text-orange-500',
  AMEX: 'text-green-600',
};

export default function Checkout() {
  const navigate = useNavigate();
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const [plans, setPlans] = useState([]);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [testCards, setTestCards] = useState([]);
  const [showTestCards, setShowTestCards] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [receipt, setReceipt] = useState(null); // comprobante estructurado
  const receiptRef = useRef(null);
  const [form, setForm] = useState({
    cardNumber: '',
    expiryMonth: '',
    expiryYear: '',
    cvv: '',
    cardholderName: '',
  });

  const cardBrand = detectBrand(form.cardNumber);

  useEffect(() => {
    // Cargar planes
    api.get('/payments/plans')
      .then(({ data }) => {
        setPlans(data.data);
        // Preseleccionar primer plan si no hay seleccion
        if (data.data.length > 0) {
          setSelectedPlan(data.data[0]);
        }
      })
      .catch((err) => {
        console.error('Error al cargar planes:', err);
        setError('No se pudieron cargar los planes. Intenta recargar la pagina.');
      });

    // Cargar tarjetas de prueba
    api.get('/payments/test-cards').then(({ data }) => {
      setTestCards(data.data);
    }).catch(() => {});
  }, []);

  const handleCardNumberChange = (e) => {
    setForm((prev) => ({ ...prev, cardNumber: formatCardNumber(e.target.value) }));
  };

  const handleChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const fillTestCard = (card) => {
    setForm({
      cardNumber: formatCardNumber(card.number),
      expiryMonth: '12',
      expiryYear: '2028',
      cvv: '123',
      cardholderName: 'Test User',
    });
    setShowTestCards(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!selectedPlan) {
      setError('Selecciona un plan');
      return;
    }

    setLoading(true);
    try {
      const { data: res } = await api.post('/payments/process', {
        planId: selectedPlan.id,
        cardNumber: form.cardNumber.replace(/\s/g, ''),
        expiryMonth: form.expiryMonth,
        expiryYear: form.expiryYear,
        cvv: form.cvv,
        cardholderName: form.cardholderName,
      });

      if (res.success && res.data.status === 'APPROVED') {
        // Obtener el comprobante estructurado (punto 36 Apuntes UNIDA)
        try {
          const { data: receiptRes } = await api.get(`/payments/receipt/${res.data.paymentId}`);
          setReceipt(receiptRes.data);
        } catch {
          // Si falla el comprobante, igual mostrar exito y redirigir
          setSuccess('Pago aprobado! Tu empresa esta activa. Redirigiendo...');
          setTimeout(() => { navigate('/dashboard', { replace: true }); window.location.reload(); }, 2000);
        }
      } else if (res.data?.status === 'PENDING') {
        setSuccess('Pago en proceso de verificacion. Te notificaremos cuando se confirme.');
      }
    } catch (err) {
      const msg = err.response?.data?.message ?? 'Error al procesar el pago';
      const errors = err.response?.data?.errors;
      if (errors && Array.isArray(errors)) {
        setError(errors.join('. '));
      } else {
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  };

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
    return new Date(d).toLocaleDateString('es-PY', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  // ── Pantalla de comprobante (se muestra cuando el pago fue aprobado) ────────
  if (receipt) {
    return (
      <div className="min-h-screen bg-gray-50 py-8 px-4">
        <div className="mx-auto max-w-2xl">

          {/* Encabezado del comprobante */}
          <div ref={receiptRef} className="rounded-2xl bg-white shadow-sm border border-gray-200 overflow-hidden">

            {/* Banda superior verde */}
            <div className="bg-green-500 px-8 py-5 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2 text-white mb-1">
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="font-semibold text-sm">Pago aprobado</span>
                </div>
                <p className="text-green-100 text-xs">Tu empresa ya esta activa</p>
              </div>
              <div className="text-right text-white">
                <p className="text-xs text-green-200">Comprobante N.°</p>
                <p className="font-mono font-bold text-sm">{receipt.receiptNumber}</p>
              </div>
            </div>

            <div className="px-8 py-6 space-y-6">

              {/* Datos del emisor */}
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Emisor</p>
                  <p className="font-bold text-gray-900">{receipt.emitter.name}</p>
                  <p className="text-xs text-gray-500">{receipt.emitter.email}</p>
                  <p className="text-xs text-gray-400 italic mt-0.5">{receipt.emitter.note}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Fecha de emision</p>
                  <p className="text-sm text-gray-700">{formatDate(receipt.issuedAt)}</p>
                  <span className={`mt-1 inline-block rounded-full px-2 py-0.5 text-xs font-semibold ${
                    receipt.status === 'APPROVED' ? 'bg-green-100 text-green-700' :
                    receipt.status === 'PENDING'  ? 'bg-amber-100 text-amber-700' :
                    'bg-red-100 text-red-700'
                  }`}>
                    {receipt.status === 'APPROVED' ? 'Pagado' : receipt.status === 'PENDING' ? 'Pendiente' : 'Rechazado'}
                  </span>
                </div>
              </div>

              <hr className="border-gray-100" />

              {/* Datos del pagador */}
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

              {/* Detalle del concepto */}
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
                  <div className="flex h-8 w-12 items-center justify-center rounded border border-gray-200 bg-gray-50">
                    <span className={`text-xs font-bold ${
                      receipt.paymentMethod.cardBrand === 'VISA' ? 'text-blue-600' :
                      receipt.paymentMethod.cardBrand === 'MASTERCARD' ? 'text-orange-500' :
                      'text-gray-500'
                    }`}>
                      {receipt.paymentMethod.cardBrand ?? 'TARJETA'}
                    </span>
                  </div>
                  <div>
                    <p className="font-medium text-gray-800">
                      Tarjeta terminada en {receipt.paymentMethod.cardLast4 ?? '****'}
                    </p>
                    <p className="text-xs text-gray-400 capitalize">{receipt.paymentMethod.type}</p>
                  </div>
                </div>
              </div>

              <hr className="border-gray-100" />

              {/* Trazabilidad */}
              <div className="text-xs text-gray-400 space-y-1">
                <div className="flex justify-between">
                  <span>ID de transacción</span>
                  <span className="font-mono">{receipt.receiptId}</span>
                </div>
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

          {/* Acciones post-comprobante */}
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
              onClick={() => { navigate('/dashboard', { replace: true }); window.location.reload(); }}
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

  // Guard: si todavia esta cargando el auth, mostrar spinner
  if (authLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary-500 border-t-transparent" />
      </div>
    );
  }

  // Guard: si no esta autenticado, redirigir al login
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="mx-auto max-w-4xl">
        {/* Header */}
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold text-gray-900">Activar suscripcion</h1>
          <p className="mt-1 text-sm text-gray-500">
            Completa el pago para activar tu empresa <strong>{user?.companyName}</strong>
          </p>
        </div>

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-5">
          {/* Columna izquierda: Seleccion de plan */}
          <div className="lg:col-span-2 space-y-4">
            <h2 className="text-sm font-semibold text-gray-700 mb-3">Selecciona tu plan</h2>
            {plans.map((plan) => (
              <button
                key={plan.id}
                type="button"
                onClick={() => setSelectedPlan(plan)}
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

            {/* Tarjetas de prueba */}
            {testCards.length > 0 && (
              <div className="mt-4">
                <button
                  type="button"
                  onClick={() => setShowTestCards((v) => !v)}
                  className="text-xs text-gray-400 hover:text-gray-600 underline"
                >
                  {showTestCards ? 'Ocultar' : 'Ver'} tarjetas de prueba
                </button>
                {showTestCards && (
                  <div className="mt-2 rounded-lg bg-gray-100 p-3 space-y-2">
                    <p className="text-xs font-semibold text-gray-500 mb-1">Click para autocompletar:</p>
                    {testCards.map((card) => (
                      <button
                        key={card.number}
                        type="button"
                        onClick={() => fillTestCard(card)}
                        className="w-full text-left rounded-lg bg-white border border-gray-200 px-3 py-2 text-xs hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-mono">{card.number.replace(/(\d{4})/g, '$1 ').trim()}</span>
                          <span className={`font-semibold ${
                            card.expectedResult === 'APPROVED' ? 'text-green-600' :
                            card.expectedResult === 'REJECTED' ? 'text-red-500' : 'text-amber-500'
                          }`}>
                            {card.expectedResult}
                          </span>
                        </div>
                        {card.reason && (
                          <p className="text-gray-400 mt-0.5">{card.reason}</p>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Columna derecha: Formulario de tarjeta */}
          <div className="lg:col-span-3">
            <div className="rounded-2xl bg-white border border-gray-200 shadow-sm p-6">
              <h2 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
                <svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                </svg>
                Datos de la tarjeta
              </h2>

              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Numero de tarjeta */}
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-gray-600">Numero de tarjeta</label>
                  <div className="relative">
                    <input
                      type="text"
                      name="cardNumber"
                      value={form.cardNumber}
                      onChange={handleCardNumberChange}
                      placeholder="4242 4242 4242 4242"
                      maxLength={19}
                      required
                      className="w-full rounded-lg border border-gray-300 px-4 py-2.5 pr-16 text-sm font-mono tracking-wider focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                    />
                    {cardBrand && (
                      <span className={`absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold ${BRAND_COLORS[cardBrand] || 'text-gray-400'}`}>
                        {cardBrand}
                      </span>
                    )}
                  </div>
                </div>

                {/* Vencimiento + CVV */}
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-gray-600">Mes</label>
                    <select
                      name="expiryMonth"
                      value={form.expiryMonth}
                      onChange={handleChange}
                      required
                      className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                    >
                      <option value="">MM</option>
                      {Array.from({ length: 12 }, (_, i) => (
                        <option key={i + 1} value={String(i + 1).padStart(2, '0')}>
                          {String(i + 1).padStart(2, '0')}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-gray-600">Ano</label>
                    <select
                      name="expiryYear"
                      value={form.expiryYear}
                      onChange={handleChange}
                      required
                      className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                    >
                      <option value="">AAAA</option>
                      {Array.from({ length: 8 }, (_, i) => {
                        const year = new Date().getFullYear() + i;
                        return <option key={year} value={year}>{year}</option>;
                      })}
                    </select>
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-gray-600">CVV</label>
                    <input
                      type="text"
                      name="cvv"
                      value={form.cvv}
                      onChange={(e) => setForm((prev) => ({ ...prev, cvv: e.target.value.replace(/\D/g, '').slice(0, 4) }))}
                      placeholder="123"
                      maxLength={4}
                      required
                      className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm font-mono text-center focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                    />
                  </div>
                </div>

                {/* Nombre del titular */}
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-gray-600">Nombre del titular</label>
                  <input
                    type="text"
                    name="cardholderName"
                    value={form.cardholderName}
                    onChange={handleChange}
                    placeholder="Como aparece en la tarjeta"
                    required
                    className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm uppercase focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                  />
                </div>

                {/* Resumen */}
                {selectedPlan && (
                  <div className="rounded-lg bg-gray-50 border border-gray-100 px-4 py-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Total a pagar</span>
                      <span className="text-lg font-bold text-gray-900">{formatGs(selectedPlan.priceGs)}</span>
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {selectedPlan.name} · Cobro mensual recurrente
                    </p>
                  </div>
                )}

                {/* Alertas */}
                {error && (
                  <AlertMessage type="error" message={error} onClose={() => setError('')} />
                )}
                {success && (
                  <AlertMessage type="success" message={success} />
                )}

                {/* Boton de pagar */}
                <button
                  type="submit"
                  disabled={loading || !!success}
                  className="w-full rounded-lg bg-primary-600 px-4 py-3 text-sm font-semibold text-white shadow-sm transition-all hover:bg-primary-700 hover:shadow-md disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      Procesando pago...
                    </span>
                  ) : selectedPlan ? (
                    `Pagar ${formatGs(selectedPlan.priceGs)}`
                  ) : (
                    'Selecciona un plan'
                  )}
                </button>

                {/* Seguridad */}
                <div className="flex items-center justify-center gap-2 text-xs text-gray-400">
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                  Pago seguro · Datos encriptados
                </div>
              </form>
            </div>

            {/* Volver */}
            <div className="mt-4 text-center">
              <Link to="/" className="text-xs text-gray-400 hover:text-gray-600 transition-colors">
                ← Volver al inicio
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
