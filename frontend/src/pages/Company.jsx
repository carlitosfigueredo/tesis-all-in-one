import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/layout/Sidebar';
import Navbar from '../components/layout/Navbar';
import PlanChangeModal from '../components/PlanChangeModal';
import Toast from '../components/Toast';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

// ─── Constantes ──────────────────────────────────────────────────────────────

const PLAN_INFO = {
  BASICO: {
    nombre: 'Plan Estandar',
    color: 'bg-gray-100 text-gray-700 border-gray-200',
    frecuencia: 'Mensual',
    descripcion: 'Predicciones actualizadas 1 vez por mes',
  },
  PROFESIONAL: {
    nombre: 'Plan Profesional',
    color: 'bg-blue-100 text-blue-700 border-blue-200',
    frecuencia: 'Semanal',
    descripcion: 'Predicciones actualizadas semanalmente',
  },
  CORPORATIVO: {
    nombre: 'Plan Corporativo',
    color: 'bg-purple-100 text-purple-700 border-purple-200',
    frecuencia: 'Bajo demanda',
    descripcion: 'Entrena y predice cuando quieras',
  },
};

// Estado de la CUENTA (company.status) — distinto del estado de la suscripción.
// Distingue "recién registrado sin pagar" (PENDING_PAYMENT) de "suspendido".
const COMPANY_STATUS_INFO = {
  ACTIVE: {
    label: 'Activa',
    badge: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300',
    icon: '✅',
    hint: 'Tu cuenta está al día.',
  },
  TRIAL: {
    label: 'Período de prueba',
    badge: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300',
    icon: '🎁',
    hint: 'Estás en período de prueba.',
  },
  PENDING_PAYMENT: {
    label: 'Pendiente de activación',
    badge: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300',
    icon: '⏳',
    hint: 'Tu cuenta aún no fue activada. Completá el pago de tu plan para acceder a todas las funcionalidades.',
  },
  SUSPENDED: {
    label: 'Suspendida',
    badge: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300',
    icon: '⛔',
    hint: 'Tu cuenta está suspendida (por falta de pago o suscripción vencida). Renová tu plan para reactivarla.',
  },
};

const FIELD_EXPLANATIONS = [
  {
    grupo: 'Datos que la empresa carga (RRHH)',
    color: 'border-sky-200 bg-sky-50',
    campos: [
      { nombre: 'Rol', descripcion: 'Rol principal del empleado: Frontend, Backend, Fullstack, Mobile, DevOps, QA, Data' },
      { nombre: 'Seniority', descripcion: 'Nivel de experiencia: Trainee, Junior, Semi-Senior, Senior, Lead' },
      { nombre: 'Edad', descripcion: 'Edad del empleado en anios' },
      { nombre: 'Modalidad', descripcion: 'Modalidad de trabajo: Presencial, Hibrido, Remoto' },
      { nombre: 'Contrato', descripcion: 'Tipo de contrato: Indefinido, Plazo fijo, Eventual' },
      { nombre: 'Antiguedad', descripcion: 'Meses que lleva en la empresa' },
      { nombre: 'Salario (Gs.)', descripcion: 'Salario mensual en guaranies' },
      { nombre: 'Hs. Extra/mes', descripcion: 'Promedio de horas extra trabajadas por mes' },
    ],
  },
  {
    grupo: 'Datos de encuesta clima (opcionales)',
    color: 'border-violet-200 bg-violet-50',
    campos: [
      { nombre: 'Satisfaccion', descripcion: 'Satisfaccion laboral del empleado (1-5). Viene de una encuesta interna. NO lo calcula el sistema.' },
      { nombre: 'Equilibrio vida-trabajo', descripcion: 'Percepcion de balance entre lo personal y lo laboral (1-5)' },
      { nombre: 'Estancamiento', descripcion: 'Si el empleado siente que no crece profesionalmente (1-5)' },
      { nombre: 'Feedback del lider', descripcion: 'Calidad de retroalimentacion que recibe (1-5)' },
    ],
  },
  {
    grupo: 'Campos calculados por el sistema (ML)',
    color: 'border-green-200 bg-green-50',
    campos: [
      { nombre: 'Riesgo', descripcion: 'Probabilidad de desercion calculada por el modelo de Machine Learning (0-100%). Es el UNICO campo que predice el sistema.' },
      { nombre: 'Nivel de riesgo', descripcion: 'Clasificacion automatica: BAJO (<30%), MEDIO (30-50%), ALTO (50-75%), CRITICO (>75%)' },
    ],
  },
  {
    grupo: 'Dato historico',
    color: 'border-amber-200 bg-amber-50',
    campos: [
      { nombre: 'Desercion', descripcion: 'Indica si el empleado efectivamente se fue de la empresa. Es un dato real, no una prediccion. Sirve para validar que tan bien predice el modelo.' },
    ],
  },
];

// ─── Componente principal ────────────────────────────────────────────────────

export default function Company() {
  const { user, isSuperAdmin, isCompanyAdmin } = useAuth();
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [subscription, setSubscription] = useState(null);
  const [stats, setStats] = useState(null);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [planModalOpen, setPlanModalOpen] = useState(false);
  const [cancelingSchedule, setCancelingSchedule] = useState(false);
  const [toast, setToast] = useState(null);

  const plan = user?.companyPlan ?? 'BASICO';
  const planInfo = PLAN_INFO[plan] ?? PLAN_INFO.BASICO;

  // Estado de la cuenta (company.status). El status de la suscripción va aparte.
  // Preferimos el valor fresco del endpoint de suscripción; si no, el del token.
  const companyStatus = subscription?.companyStatus ?? user?.companyStatus ?? 'ACTIVE';
  const statusInfo = COMPANY_STATUS_INFO[companyStatus] ?? COMPANY_STATUS_INFO.ACTIVE;
  const needsAttention = companyStatus === 'SUSPENDED' || companyStatus === 'PENDING_PAYMENT';

  const fetchData = async () => {
    try {
      const [usersRes, subRes, statsRes, paymentsRes] = await Promise.allSettled([
        api.get('/users'),
        api.get('/payments/subscription/status'),
        api.get('/employees/stats'),
        api.get('/payments/history'),
      ]);
      if (usersRes.status === 'fulfilled') setUsers(usersRes.value.data.data || []);
      if (subRes.status === 'fulfilled') setSubscription(subRes.value.data.data);
      if (statsRes.status === 'fulfilled') setStats(statsRes.value.data.data);
      if (paymentsRes.status === 'fulfilled') setPayments(paymentsRes.value.data.data || []);
    } catch { /* silenciar */ }
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Cerrar modal, refrescar datos y notificar según el resultado
  const handlePlanChangeSuccess = (result) => {
    setPlanModalOpen(false);
    if (result?.type === 'DOWNGRADE' && result?.scheduled) {
      setToast({ type: 'success', title: 'Cambio programado', message: result.message || 'Tu plan cambiará al próximo ciclo.' });
    } else if (result?.paid) {
      setToast({ type: 'success', title: 'Plan actualizado', message: 'Tu upgrade fue aplicado. Refrescando datos…' });
      // El plan del token cambió: recargar para reflejarlo en toda la app
      setTimeout(() => window.location.reload(), 1500);
    } else if (result?.applied) {
      setToast({ type: 'success', title: 'Plan actualizado', message: 'Mejora aplicada sin costo adicional.' });
      setTimeout(() => window.location.reload(), 1500);
    }
    fetchData();
  };

  const handleCancelSchedule = async () => {
    setCancelingSchedule(true);
    try {
      await api.delete('/payments/plan-change');
      setToast({ type: 'success', title: 'Cancelado', message: 'Se canceló el cambio de plan programado.' });
      fetchData();
    } catch (err) {
      setToast({ type: 'error', title: 'Error', message: err.response?.data?.message ?? 'No se pudo cancelar.' });
    } finally {
      setCancelingSchedule(false);
    }
  };

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-auto bg-gray-50 dark:bg-gray-900 transition-colors">
        <Navbar title="Mi Empresa" />
        <main className="flex-1 p-6 space-y-6">

          {loading && (
            <div className="flex justify-center py-20">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent" />
            </div>
          )}

          {!loading && (
            <>
              {/* ── Aviso destacado si la cuenta requiere atención ── */}
              {needsAttention && (
                <div className={`rounded-xl border p-5 flex flex-col sm:flex-row sm:items-center gap-4 ${
                  companyStatus === 'SUSPENDED'
                    ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
                    : 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800'
                }`}>
                  <div className="flex items-start gap-3 flex-1">
                    <span className="text-2xl" aria-hidden="true">{statusInfo.icon}</span>
                    <div>
                      <p className={`text-sm font-bold ${
                        companyStatus === 'SUSPENDED'
                          ? 'text-red-800 dark:text-red-200'
                          : 'text-amber-800 dark:text-amber-200'
                      }`}>
                        {companyStatus === 'SUSPENDED' ? 'Cuenta suspendida' : 'Cuenta pendiente de activación'}
                      </p>
                      <p className={`text-sm mt-0.5 ${
                        companyStatus === 'SUSPENDED'
                          ? 'text-red-700 dark:text-red-300'
                          : 'text-amber-700 dark:text-amber-300'
                      }`}>
                        {statusInfo.hint}
                      </p>
                    </div>
                  </div>
                  {isCompanyAdmin && (
                    <button
                      onClick={() => navigate('/checkout')}
                      className={`flex-shrink-0 rounded-lg px-4 py-2 text-sm font-semibold text-white transition ${
                        companyStatus === 'SUSPENDED'
                          ? 'bg-red-600 hover:bg-red-700'
                          : 'bg-amber-600 hover:bg-amber-700'
                      }`}
                    >
                      {companyStatus === 'SUSPENDED' ? 'Reactivar cuenta' : 'Activar mi plan'}
                    </button>
                  )}
                </div>
              )}

              {/* ── Info de la empresa ── */}
              <div className="grid gap-6 lg:grid-cols-3">

                {/* Card empresa */}
                <div className="rounded-xl bg-white dark:bg-gray-800 p-6 shadow-sm border border-gray-100 dark:border-gray-700 transition-colors">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-100 text-xl">
                      🏢
                    </div>
                    <div>
                      <h2 className="text-lg font-bold text-gray-900">{user?.companyName ?? 'Mi Empresa'}</h2>
                      <p className="text-xs text-gray-500">ID: {user?.companyId?.slice(0, 8)}...</p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-500">Estado de la cuenta</span>
                      <span className={`rounded-full px-3 py-1 text-xs font-semibold ${statusInfo.badge}`}>
                        {statusInfo.icon} {statusInfo.label}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-500">Plan actual</span>
                      <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${planInfo.color}`}>
                        {planInfo.nombre}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-500">Frecuencia prediccion</span>
                      <span className="text-sm font-medium text-gray-700">{planInfo.frecuencia}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-500">Empleados cargados</span>
                      <span className="text-sm font-medium text-gray-700">{stats?.total ?? 0}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-500">Usuarios</span>
                      <span className="text-sm font-medium text-gray-700">{users.length}</span>
                    </div>
                    {subscription && (
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-500">Proxima renovacion</span>
                        <span className="text-sm font-medium text-gray-700">
                          {new Date(subscription.currentPeriodEnd).toLocaleDateString('es-PY')}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Aviso de downgrade programado */}
                  {subscription?.scheduledPlanId && (
                    <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-xs text-amber-800">
                      <p className="font-semibold">Cambio de plan programado</p>
                      <p className="mt-0.5">
                        Cambiarás a <strong>{subscription.scheduledPlanId}</strong> el{' '}
                        {new Date(subscription.currentPeriodEnd).toLocaleDateString('es-PY')}.
                      </p>
                      <button
                        onClick={handleCancelSchedule}
                        disabled={cancelingSchedule}
                        className="mt-1.5 text-amber-700 underline hover:text-amber-900 disabled:opacity-50"
                      >
                        {cancelingSchedule ? 'Cancelando…' : 'Cancelar cambio programado'}
                      </button>
                    </div>
                  )}

                  {isCompanyAdmin && (
                    <button
                      onClick={() => setPlanModalOpen(true)}
                      className="mt-4 w-full rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 transition-colors"
                    >
                      Cambiar de plan
                    </button>
                  )}
                </div>

                {/* Card usuarios (solo admin) */}
                {isCompanyAdmin && (
                  <div className="rounded-xl bg-white dark:bg-gray-800 p-6 shadow-sm border border-gray-100 dark:border-gray-700 lg:col-span-2 transition-colors">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200">Usuarios de la empresa</h3>
                      <button
                        onClick={() => navigate('/users')}
                        className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                      >
                        Gestionar usuarios
                      </button>
                    </div>

                    {users.length === 0 ? (
                      <p className="text-sm text-gray-400">No hay usuarios cargados</p>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead className="bg-gray-50 text-xs text-gray-500">
                            <tr>
                              <th className="px-3 py-2 text-left">Nombre</th>
                              <th className="px-3 py-2 text-left">Email</th>
                              <th className="px-3 py-2 text-left">Rol</th>
                              <th className="px-3 py-2 text-left">Estado</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-50">
                            {users.slice(0, 10).map((u) => (
                              <tr key={u.id} className="hover:bg-gray-50">
                                <td className="px-3 py-2 font-medium text-gray-800">{u.name}</td>
                                <td className="px-3 py-2 text-gray-500">{u.email}</td>
                                <td className="px-3 py-2">
                                  <span className="rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700">
                                    {u.roles?.[0] ?? 'Sin rol'}
                                  </span>
                                </td>
                                <td className="px-3 py-2">
                                  {u.active ? (
                                    <span className="text-green-600 text-xs font-medium">Activo</span>
                                  ) : (
                                    <span className="text-red-500 text-xs font-medium">Inactivo</span>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* ── Mi Plan y Facturación ── */}
              <div className="rounded-xl bg-white dark:bg-gray-800 p-6 shadow-sm border border-gray-100 dark:border-gray-700 transition-colors">
                <h3 className="text-base font-semibold text-gray-800 dark:text-gray-100 mb-4">Mi Plan y Facturación</h3>

                {/* Info del plan + días restantes */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                  <div className="rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 p-4 text-center">
                    <p className="text-xs text-blue-600 dark:text-blue-400 font-medium uppercase tracking-wide">Plan actual</p>
                    <p className="mt-1 text-lg font-bold text-gray-900 dark:text-gray-100">{planInfo.nombre}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{planInfo.descripcion}</p>
                  </div>
                  <div className="rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-100 dark:border-green-800 p-4 text-center">
                    <p className="text-xs text-green-600 dark:text-green-400 font-medium uppercase tracking-wide">Días restantes</p>
                    <p className="mt-1 text-3xl font-bold text-gray-900 dark:text-gray-100">
                      {subscription?.currentPeriodEnd
                        ? Math.max(0, Math.ceil((new Date(subscription.currentPeriodEnd) - new Date()) / (1000 * 60 * 60 * 24)))
                        : '—'}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                      {subscription?.currentPeriodEnd
                        ? `Vence ${new Date(subscription.currentPeriodEnd).toLocaleDateString('es-PY')}`
                        : 'Sin suscripción activa'}
                    </p>
                  </div>
                  <div className="rounded-lg bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 p-4 text-center">
                    <p className="text-xs text-gray-500 dark:text-gray-400 font-medium uppercase tracking-wide">Estado de la cuenta</p>
                    <p className="mt-1">
                      <span className={`inline-block rounded-full px-3 py-1 text-sm font-bold ${statusInfo.badge}`}>
                        {statusInfo.icon} {statusInfo.label}
                      </span>
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1.5">{statusInfo.hint}</p>
                  </div>
                </div>

                {/* Historial de pagos / recibos */}
                <div>
                  <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-3">Historial de pagos</h4>
                  {payments.length === 0 ? (
                    <p className="text-sm text-gray-400 dark:text-gray-500 italic">No hay pagos registrados aún.</p>
                  ) : (
                    <div className="overflow-x-auto rounded-lg border border-gray-100 dark:border-gray-700">
                      <table className="w-full text-sm">
                        <thead className="bg-gray-50 dark:bg-gray-700/50 text-xs uppercase text-gray-500 dark:text-gray-400">
                          <tr>
                            <th className="px-4 py-2.5 text-left">Fecha</th>
                            <th className="px-4 py-2.5 text-left">Concepto</th>
                            <th className="px-4 py-2.5 text-left">Método</th>
                            <th className="px-4 py-2.5 text-right">Monto</th>
                            <th className="px-4 py-2.5 text-left">Estado</th>
                            <th className="px-4 py-2.5 text-center">Recibo</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                          {payments.map((p) => (
                            <tr key={p.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                              <td className="px-4 py-3 text-gray-600 dark:text-gray-300 whitespace-nowrap">
                                {new Date(p.createdAt).toLocaleDateString('es-PY')}
                              </td>
                              <td className="px-4 py-3 text-gray-800 dark:text-gray-200 font-medium">
                                {p.description || 'Suscripción'}
                              </td>
                              <td className="px-4 py-3 text-gray-500 dark:text-gray-400 text-xs">
                                {p.paymentMethod === 'paypal' ? 'PayPal' : p.paymentMethod === 'adamspay' ? 'AdamsPay' : p.paymentMethod}
                              </td>
                              <td className="px-4 py-3 text-right font-semibold text-gray-900 dark:text-gray-100 tabular-nums">
                                {p.currency === 'PYG'
                                  ? `Gs. ${Number(p.amount).toLocaleString('es-PY')}`
                                  : `USD ${p.amount}`}
                              </td>
                              <td className="px-4 py-3">
                                <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-semibold ${
                                  p.status === 'APPROVED' ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
                                  : p.status === 'PENDING' ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300'
                                  : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'
                                }`}>
                                  {p.status === 'APPROVED' ? 'Aprobado' : p.status === 'PENDING' ? 'Pendiente' : 'Rechazado'}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-center">
                                {p.status === 'APPROVED' && (
                                  <button
                                    onClick={() => window.open(`/checkout?receipt=${p.id}`, '_blank')}
                                    className="text-xs text-primary-600 dark:text-primary-400 hover:underline font-medium"
                                  >
                                    Ver
                                  </button>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>

              {/* ── Explicacion de los campos del tablero ── */}
              <div className="rounded-xl bg-white dark:bg-gray-800 p-6 shadow-sm border border-gray-100 dark:border-gray-700 transition-colors">
                <h3 className="text-base font-semibold text-gray-800 dark:text-gray-100 mb-1">Que significan los campos del tablero de empleados</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                  Entende de donde viene cada dato y cuales son calculados por el sistema de prediccion.
                </p>

                <div className="grid gap-4 lg:grid-cols-2">
                  {FIELD_EXPLANATIONS.map((grupo) => (
                    <div key={grupo.grupo} className={`rounded-lg border p-4 ${grupo.color}`}>
                      <h4 className="text-sm font-semibold text-gray-800 mb-2">{grupo.grupo}</h4>
                      <ul className="space-y-1.5">
                        {grupo.campos.map((campo) => (
                          <li key={campo.nombre} className="text-xs text-gray-700">
                            <span className="font-semibold">{campo.nombre}:</span>{' '}
                            <span className="text-gray-600">{campo.descripcion}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>

                <div className="mt-4 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-xs text-blue-700">
                  <p className="font-semibold">Resumen rapido:</p>
                  <p className="mt-1">
                    La empresa carga los datos de sus empleados (CSV o manual). El unico campo que el sistema
                    calcula automaticamente es el <strong>Riesgo de Desercion</strong> — usando un modelo de Machine Learning
                    entrenado con datos del mercado de software de Paraguay. Todo lo demas son datos de entrada.
                  </p>
                </div>
              </div>
            </>
          )}
        </main>
      </div>

      {/* Modal de cambio de plan */}
      <PlanChangeModal
        open={planModalOpen}
        currentPlanId={subscription?.planId}
        onClose={() => setPlanModalOpen(false)}
        onSuccess={handlePlanChangeSuccess}
      />

      {toast && (
        <Toast
          type={toast.type}
          title={toast.title}
          message={toast.message}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
}
