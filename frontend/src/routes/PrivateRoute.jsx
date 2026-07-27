import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import PendingActivation from '../pages/PendingActivation';

export default function PrivateRoute() {
  const { user, isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary-500 border-t-transparent" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Si la empresa esta pendiente de pago o suspendida, mostrar pantalla especial
  if (user?.companyStatus === 'PENDING_PAYMENT' || user?.companyStatus === 'SUSPENDED') {
    return <PendingActivation />;
  }

  return <Outlet />;
}
