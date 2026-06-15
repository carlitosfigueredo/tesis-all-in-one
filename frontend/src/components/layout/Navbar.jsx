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
    <header className="flex h-16 items-center justify-between border-b border-gray-200 bg-white px-6">
      <h1 className="text-xl font-semibold text-gray-800">{title}</h1>
      <div className="flex items-center gap-3">
        <span className="text-sm text-gray-500">Bienvenido, {user?.name}</span>
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-500 text-xs font-bold text-white">
          {user?.name?.charAt(0)}
        </div>
        <button
          onClick={handleLogout}
          className="ml-2 rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-gray-500 transition hover:border-red-300 hover:bg-red-50 hover:text-red-600"
        >
          Cerrar sesión
        </button>
      </div>
    </header>
  );
}
