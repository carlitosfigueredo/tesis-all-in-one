import { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser]     = useState(null);
  const [loading, setLoading] = useState(true);

  // Al montar, restaurar sesión de empresa si hay token guardado
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

  // Permite setear sesion manualmente (usado por Register)
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

  return (
    <AuthContext.Provider
      value={{
        user,
        login,
        logout,
        setSession,
        loading,
        isAuthenticated: !!user,
        // Helpers de rol para usar en componentes
        isSuperAdmin:    user?.role === 'SUPER_ADMIN',
        isCompanyAdmin:  user?.role === 'COMPANY_ADMIN',
        isAnalyst:       user?.role === 'ANALYST',
        isViewer:        user?.role === 'VIEWER',
        canEdit:         ['COMPANY_ADMIN', 'ANALYST'].includes(user?.role),
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
