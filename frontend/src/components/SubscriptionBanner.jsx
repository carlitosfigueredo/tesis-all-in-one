import { Link } from 'react-router-dom';
import useSubscriptionStatus from '../hooks/useSubscriptionStatus';

/**
 * Banner global de estado de suscripción.
 * Se muestra únicamente cuando:
 *   - la suscripción venció, o
 *   - está por vencer (dentro del umbral definido por el backend).
 * En cualquier otro caso no renderiza nada.
 */
export default function SubscriptionBanner() {
  const { status } = useSubscriptionStatus();

  // Sin datos, sin suscripción, o todo en orden → no mostrar nada
  if (!status || !status.hasSubscription) return null;
  if (!status.isExpired && !status.isExpiringSoon) return null;

  const { isExpired, daysRemaining } = status;

  // Vencida (roja) vs por vencer (ámbar)
  const styles = isExpired
    ? 'bg-red-50 dark:bg-red-900/30 border-red-200 dark:border-red-800 text-red-800 dark:text-red-200'
    : 'bg-amber-50 dark:bg-amber-900/30 border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-200';

  const message = isExpired
    ? 'Tu suscripción venció. Renová tu plan para seguir usando todas las funcionalidades.'
    : daysRemaining <= 1
      ? `Tu plan vence ${daysRemaining === 1 ? 'mañana' : 'hoy'}. Renová para evitar interrupciones.`
      : `Tu plan vence en ${daysRemaining} días. Renová para evitar interrupciones.`;

  return (
    <div
      role="alert"
      className={`flex flex-wrap items-center justify-between gap-3 border-b px-6 py-2.5 text-sm transition-colors ${styles}`}
    >
      <div className="flex items-center gap-2 min-w-0">
        <svg className="h-4 w-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
        </svg>
        <span className="font-medium truncate">{message}</span>
      </div>

      <Link
        to="/checkout"
        className={`flex-shrink-0 rounded-lg px-3 py-1.5 text-xs font-semibold text-white transition ${
          isExpired ? 'bg-red-600 hover:bg-red-700' : 'bg-amber-600 hover:bg-amber-700'
        }`}
      >
        Renovar plan
      </Link>
    </div>
  );
}
