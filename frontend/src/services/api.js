import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' },
});

// Interceptor de respuesta: redirige al login correspondiente si el token expira,
// pero NO durante las llamadas /auth/me de restauración de sesión al iniciar.
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const url = error.config?.url ?? '';
    const is401 = error.response?.status === 401;

    // No redirigir automáticamente si es una llamada de restauración de sesión
    const isSessionRestore = url.includes('/auth/me');

    if (is401 && !isSessionRestore) {
      // Decidir a qué login redirigir según qué token existe
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
