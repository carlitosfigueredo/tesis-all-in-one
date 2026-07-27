import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';

export default function Navbar({ title }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <header className="flex h-16 items-center justify-between border-b border-gray-200 bg-white px-6 flex-shrink-0">
      <div className="min-w-0">
        <h1 className="text-base font-semibold text-gray-800 truncate">{title}</h1>
        {/* Nombre de empresa visible en el header — tenant-aware */}
        {user?.companyName && (
          <p className="text-xs text-gray-400 truncate">{user.companyName}</p>
        )}
      </div>

      <div className="flex items-center gap-3 flex-shrink-0">
        <div className="hidden sm:flex flex-col items-end text-right">
          <span className="text-sm text-gray-700 font-medium">{user?.name}</span>
          {user?.companyName && (
            <span className="text-xs text-gray-400">{user.companyName}</span>
          )}
        </div>
        <div
          className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-500 text-xs font-bold text-white flex-shrink-0"
          title={user?.name}
          aria-hidden="true"
        >
          {user?.name?.charAt(0).toUpperCase()}
        </div>
        <button
          onClick={handleLogout}
          className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-gray-500 transition hover:border-red-300 hover:bg-red-50 hover:text-red-600"
        >
          Cerrar sesión
        </button>
      </div>
    </header>
  );
}
