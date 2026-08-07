import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' },
});

// Interceptor de respuesta: redirige al login si el token expira,
// pero NO durante las llamadas de autenticacion (login, register, etc.)
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const url = error.config?.url ?? '';
    const is401 = error.response?.status === 401;

    // No redirigir en rutas de autenticacion ni restauracion de sesion
    const isAuthRoute = url.includes('/auth/login')
      || url.includes('/auth/register')
      || url.includes('/auth/me')
      || url.includes('/auth/forgot')
      || url.includes('/auth/reset')
      || url.includes('/admin/auth');

    if (is401 && !isAuthRoute) {
      // Token expirado en una ruta protegida: limpiar y redirigir
      if (localStorage.getItem('admin_token')) {
        localStorage.removeItem('admin_token');
        window.location.href = '/admin/login';
      } else {
        localStorage.removeItem('token');
        window.location.href = '/login';
      }
    }

    return Promise.reject(error);
  }
);

export default api;
