import { NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const navItems = [
  { to: '/dashboard', icon: '📊', label: 'Dashboard' },
  { to: '/employees', icon: '👥', label: 'Empleados' },
  { to: '/model',     icon: '🤖', label: 'Modelo ML' },
  { to: '/company',   icon: '🏢', label: 'Mi Empresa', adminOnly: true },
];

const ROLE_LABELS = {
  COMPANY_ADMIN: 'Administrador',
  ANALYST:       'Analista',
  VIEWER:        'Solo lectura',
};

export default function Sidebar() {
  const { user, logout, isCompanyAdmin, isSuperAdmin } = useAuth();

  return (
    <aside className="flex h-screen w-64 flex-col bg-primary-900 text-white flex-shrink-0">
      {/* Logo + nombre de empresa */}
      <div className="flex items-center gap-3 border-b border-primary-700 px-6 py-5">
        <span className="text-2xl" aria-hidden="true">📈</span>
        <div className="min-w-0">
          <p className="text-sm font-bold leading-tight">Sistema BI</p>
          {/* Nombre de empresa del token — tenant-aware */}
          {user?.companyName ? (
            <p className="text-xs text-primary-300 truncate" title={user.companyName}>
              {user.companyName}
            </p>
          ) : (
            <p className="text-xs text-primary-300">Retención de Talento</p>
          )}
        </div>
      </div>

      {/* Navegacion */}
      <nav className="flex-1 px-4 py-6" aria-label="Navegacion principal">
        <ul className="space-y-1">
          {navItems
            .filter((item) => !item.adminOnly || isCompanyAdmin || isSuperAdmin)
            .map((item) => (
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
                <span aria-hidden="true">{item.icon}</span>
                {item.label}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      {/* Usuario + empresa + logout */}
      <div className="border-t border-primary-700 px-4 py-4">
        <div className="mb-3 px-2">
          <p className="text-sm font-medium truncate">{user?.name}</p>
          <p className="text-xs text-primary-300">{ROLE_LABELS[user?.roles?.[0]] ?? user?.roles?.[0] ?? ''}</p>
          {user?.companyName && (
            <p className="text-xs text-primary-400 truncate mt-0.5" title={user.companyName}>
              {user.companyName}
            </p>
          )}
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
