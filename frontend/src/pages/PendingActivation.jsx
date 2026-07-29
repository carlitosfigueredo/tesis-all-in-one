import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';

export default function PendingActivation() {
  const { user, logout } = useAuth();

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-amber-50 to-orange-50 px-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-lg text-center">
        {/* Icono */}
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-amber-100 text-3xl">
          ⏳
        </div>

        <h1 className="text-xl font-bold text-gray-900 mb-2">Activacion pendiente</h1>

        <p className="text-sm text-gray-600 mb-6">
          Tu empresa <strong>{user?.companyName}</strong> fue registrada correctamente.
          Para acceder a todas las funcionalidades del sistema, necesitas completar el pago de tu plan.
        </p>

        {/* Info de contacto */}
        <div className="rounded-lg bg-amber-50 border border-amber-200 px-4 py-4 mb-6 text-left">
          <h3 className="text-sm font-semibold text-amber-800 mb-2">Como activar tu cuenta</h3>
          <ul className="text-sm text-amber-700 space-y-1.5">
            <li className="flex items-start gap-2">
              <span className="mt-0.5 h-1.5 w-1.5 rounded-full bg-amber-500 flex-shrink-0" />
              Contacta a nuestro equipo para coordinar el pago
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-0.5 h-1.5 w-1.5 rounded-full bg-amber-500 flex-shrink-0" />
              Una vez confirmado, tu cuenta se activara en menos de 24 horas
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-0.5 h-1.5 w-1.5 rounded-full bg-amber-500 flex-shrink-0" />
              Mientras tanto, podes explorar la plataforma en modo limitado
            </li>
          </ul>
        </div>

        {/* Datos del usuario */}
        <div className="rounded-lg bg-gray-50 px-4 py-3 mb-6 text-left text-xs text-gray-500">
          <p><strong>Empresa:</strong> {user?.companyName}</p>
          <p><strong>Admin:</strong> {user?.name} ({user?.email})</p>
          <p><strong>Rol:</strong> Administrador de empresa</p>
        </div>

        {/* Acciones */}
        <div className="space-y-3">
          <Link
            to="/checkout"
            className="block w-full rounded-lg bg-primary-600 px-4 py-2.5 text-sm font-semibold text-white text-center transition hover:bg-primary-700"
          >
            Activar mi plan ahora
          </Link>
          <a
            href="mailto:soporte@sistemabi.edu.py?subject=Activacion de cuenta"
            className="block w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm text-gray-600 text-center hover:bg-gray-50 transition"
          >
            Contactar soporte
          </a>
          <button
            onClick={logout}
            className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm text-gray-600 hover:bg-gray-50 transition"
          >
            Cerrar sesion
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
