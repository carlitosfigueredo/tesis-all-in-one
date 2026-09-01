import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';

// Configuración por estado de cuenta. Distingue "recién registrado sin pagar"
// (PENDING_PAYMENT) de "suspendido" (SUSPENDED), que antes se mostraban igual.
const STATE_CONFIG = {
  PENDING_PAYMENT: {
    icon: '⏳',
    accent: 'from-amber-50 to-orange-50',
    iconBg: 'bg-amber-100',
    boxBorder: 'border-amber-200',
    boxBg: 'bg-amber-50',
    boxTitle: 'text-amber-800',
    boxText: 'text-amber-700',
    dot: 'bg-amber-500',
    title: 'Activación pendiente',
    intro: (companyName) => (
      <>
        Tu empresa <strong>{companyName}</strong> fue registrada correctamente.
        Para acceder a todas las funcionalidades del sistema, necesitás completar el pago de tu plan.
      </>
    ),
    boxHeading: 'Cómo activar tu cuenta',
    bullets: [
      'Elegí tu plan y completá el pago en línea',
      'Una vez confirmado, tu cuenta se activa al instante',
      'Mientras tanto, podés explorar la plataforma en modo limitado',
    ],
    cta: 'Activar mi plan ahora',
  },
  SUSPENDED: {
    icon: '⛔',
    accent: 'from-red-50 to-rose-50',
    iconBg: 'bg-red-100',
    boxBorder: 'border-red-200',
    boxBg: 'bg-red-50',
    boxTitle: 'text-red-800',
    boxText: 'text-red-700',
    dot: 'bg-red-500',
    title: 'Cuenta suspendida',
    intro: (companyName) => (
      <>
        El acceso de <strong>{companyName}</strong> está suspendido. Esto suele ocurrir
        por falta de pago o porque tu suscripción venció.
      </>
    ),
    boxHeading: 'Cómo reactivar tu cuenta',
    bullets: [
      'Renová tu plan completando el pago en línea',
      'El acceso se restablece apenas se confirma el pago',
      'Si creés que es un error, contactá a soporte',
    ],
    cta: 'Reactivar mi cuenta',
  },
};

export default function PendingActivation() {
  const { user, logout } = useAuth();

  const status = user?.companyStatus === 'SUSPENDED' ? 'SUSPENDED' : 'PENDING_PAYMENT';
  const cfg = STATE_CONFIG[status];

  return (
    <div className={`flex min-h-screen items-center justify-center bg-gradient-to-br ${cfg.accent} px-4`}>
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-lg text-center">
        {/* Icono */}
        <div className={`mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full ${cfg.iconBg} text-3xl`}>
          {cfg.icon}
        </div>

        <h1 className="text-xl font-bold text-gray-900 mb-2">{cfg.title}</h1>

        <p className="text-sm text-gray-600 mb-6">
          {cfg.intro(user?.companyName)}
        </p>

        {/* Info de contacto */}
        <div className={`rounded-lg ${cfg.boxBg} border ${cfg.boxBorder} px-4 py-4 mb-6 text-left`}>
          <h3 className={`text-sm font-semibold ${cfg.boxTitle} mb-2`}>{cfg.boxHeading}</h3>
          <ul className={`text-sm ${cfg.boxText} space-y-1.5`}>
            {cfg.bullets.map((b, i) => (
              <li key={i} className="flex items-start gap-2">
                <span className={`mt-0.5 h-1.5 w-1.5 rounded-full ${cfg.dot} flex-shrink-0`} />
                {b}
              </li>
            ))}
          </ul>
        </div>

        {/* Datos del usuario */}
        <div className="rounded-lg bg-gray-50 px-4 py-3 mb-6 text-left text-xs text-gray-500">
          <p><strong>Empresa:</strong> {user?.companyName}</p>
          <p><strong>Admin:</strong> {user?.name} ({user?.email})</p>
          <p><strong>Estado:</strong> {status === 'SUSPENDED' ? 'Suspendida' : 'Pendiente de activación'}</p>
        </div>

        {/* Acciones */}
        <div className="space-y-3">
          <Link
            to="/checkout"
            className="block w-full rounded-lg bg-primary-600 px-4 py-2.5 text-sm font-semibold text-white text-center transition hover:bg-primary-700"
          >
            {cfg.cta}
          </Link>
          <a
            href="mailto:carlosalberto.figueredoquevedo@gmail.com?subject=Estado de mi cuenta"
            className="block w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm text-gray-600 text-center hover:bg-gray-50 transition"
          >
            Contactar soporte
          </a>
          <button
            onClick={logout}
            className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm text-gray-600 hover:bg-gray-50 transition"
          >
            Cerrar sesión
          </button>
        </div>

        {/* Volver a la landing */}
        <div className="mt-4">
          <Link to="/" className="text-xs text-gray-400 hover:text-gray-600">
            Volver al inicio
          </Link>
        </div>
      </div>
    </div>
  );
}
