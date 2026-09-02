import { useEffect, useState, useCallback } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

/**
 * Hook que consulta el estado de la suscripción de la empresa actual.
 * Devuelve días restantes, si está por vencer y si ya venció.
 *
 * No consulta para SUPER_ADMIN (no tiene empresa) ni si no hay usuario.
 *
 * @returns {{
 *   status: object|null,   // { hasSubscription, daysRemaining, isExpired, isExpiringSoon, currentPeriodEnd, ... }
 *   loading: boolean,
 *   refetch: () => void,
 * }}
 */
export default function useSubscriptionStatus() {
  const { user, isSuperAdmin } = useAuth();
  const [status, setStatus]   = useState(null);
  const [loading, setLoading] = useState(false);

  const fetchStatus = useCallback(() => {
    // Sin usuario o SUPER_ADMIN: no aplica
    if (!user || isSuperAdmin || !user.companyId) {
      setStatus(null);
      return;
    }

    setLoading(true);
    api
      .get('/payments/subscription/status')
      .then(({ data }) => setStatus(data.data))
      .catch(() => setStatus(null)) // silencioso: el banner simplemente no aparece
      .finally(() => setLoading(false));
  }, [user, isSuperAdmin]);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  return { status, loading, refetch: fetchStatus };
}
