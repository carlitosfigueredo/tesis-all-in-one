import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { useNavigate } from 'react-router-dom';

export default function Navbar({ title }) {
  const { user, logout } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <header className="flex h-16 items-center justify-between border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-6 flex-shrink-0 transition-colors">
      <div className="min-w-0">
        <h1 className="text-base font-semibold text-gray-800 dark:text-gray-100 truncate">{title}</h1>
        {user?.companyName && (
          <p className="text-xs text-gray-400 dark:text-gray-500 truncate">{user.companyName}</p>
        )}
      </div>

      <div className="flex items-center gap-3 flex-shrink-0">
        {/* Toggle dark mode */}
        <button
          onClick={toggleTheme}
          className="rounded-lg p-2 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          aria-label={isDark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
          title={isDark ? 'Modo claro' : 'Modo oscuro'}
        >
          {isDark ? (
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
          ) : (
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
            </svg>
          )}
        </button>

        <div className="hidden sm:flex flex-col items-end text-right">
          <span className="text-sm text-gray-700 dark:text-gray-200 font-medium">{user?.name}</span>
          {user?.companyName && (
            <span className="text-xs text-gray-400 dark:text-gray-500">{user.companyName}</span>
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
          className="rounded-lg border border-gray-200 dark:border-gray-600 px-3 py-1.5 text-sm text-gray-500 dark:text-gray-400 transition hover:border-red-300 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-600 dark:hover:text-red-400"
        >
          Cerrar sesión
        </button>
      </div>
    </header>
  );
}
