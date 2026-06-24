import { NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const navItems = [
  { to: '/dashboard', icon: '📊', label: 'Dashboard' },
  { to: '/employees', icon: '👥', label: 'Empleados' },
  { to: '/model',     icon: '🤖', label: 'Modelo ML' },
];

export default function Sidebar() {
  const { user, logout } = useAuth();

  return (
    <aside className="flex h-screen w-64 flex-col bg-primary-900 text-white">
      {/* Logo */}
      <div className="flex items-center gap-3 border-b border-primary-700 px-6 py-5">
        <span className="text-2xl">📈</span>
        <div>
          <p className="text-sm font-bold leading-tight">Sistema BI</p>
          <p className="text-xs text-primary-300">Retención de Talento</p>
        </div>
      </div>

      {/* Navegación */}
      <nav className="flex-1 px-4 py-6">
        <ul className="space-y-1">
          {navItems.map((item) => (
            <li key={item.to}>
              <NavLink
                to={item.to}
                className={({ isActive }) =>
                  `flex items-center gap-3 rounded-lg px-4 py-2.5 text-sm transition ${
                    isActive
                      ? 'bg-primary-600 font-semibold text-white'
                      : 'text-primary-200 hover:bg-primary-800 hover:text-white'
                  }`
                }
              >
                <span>{item.icon}</span>
                {item.label}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      {/* Usuario y logout */}
      <div className="border-t border-primary-700 px-4 py-4">
        <div className="mb-3 px-2">
          <p className="text-sm font-medium">{user?.name}</p>
          <p className="text-xs text-primary-300">{user?.role}</p>
        </div>
        <button
          onClick={logout}
          className="w-full rounded-lg px-4 py-2 text-left text-sm text-primary-300 transition hover:bg-primary-800 hover:text-white"
        >
          🚪 Cerrar sesión
        </button>
      </div>
    </aside>
  );
}
