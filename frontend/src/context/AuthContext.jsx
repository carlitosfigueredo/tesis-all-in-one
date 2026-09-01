import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser]     = useState(null);
  const [loading, setLoading] = useState(true);

  // Al montar, restaurar sesión si hay token guardado
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      api
        .get('/auth/me')
        .then(({ data }) => setUser(data.data))
        .catch(() => {
          localStorage.removeItem('token');
          delete api.defaults.headers.common['Authorization'];
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (email, password, recaptchaToken) => {
    const { data } = await api.post('/auth/login', { email, password, recaptchaToken });
    const { token, user: userData } = data.data;
    localStorage.setItem('token', token);
    api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    setUser(userData);
    return userData;
  };

  // Permite setear sesión manualmente (usado por Register)
  const setSession = (token, userData) => {
    localStorage.setItem('token', token);
    api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    setUser(userData);
  };

  const logout = () => {
    localStorage.removeItem('token');
    delete api.defaults.headers.common['Authorization'];
    setUser(null);
  };

  // ─── Helpers de permisos ─────────────────────────────────────────────────────

  const hasPermission = useCallback((permission) => {
    if (!user?.permissions) return false;
    return user.permissions.includes(permission);
  }, [user]);

  const hasAnyPermission = useCallback((...permissions) => {
    if (!user?.permissions) return false;
    return permissions.some((p) => user.permissions.includes(p));
  }, [user]);

  const hasRole = useCallback((roleName) => {
    if (!user?.roles) return false;
    return user.roles.includes(roleName);
  }, [user]);

  return (
    <AuthContext.Provider
      value={{
        user,
        login,
        logout,
        setSession,
        loading,
        isAuthenticated: !!user,
        // Helpers de rol (basados en roles del RBAC)
        isSuperAdmin:    hasRole('SUPER_ADMIN'),
        isCompanyAdmin:  hasRole('COMPANY_ADMIN'),
        isAnalyst:       hasRole('ANALYST'),
        isViewer:        hasRole('VIEWER'),
        // Helpers de permisos
        hasPermission,
        hasAnyPermission,
        hasRole,
        canEdit: hasAnyPermission('employees.write', 'users.write'),
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth debe usarse dentro de AuthProvider');
  return ctx;
};
