import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 5173,
    // Hosts permitidos para el dev server. Vite bloquea Hosts desconocidos
    // por seguridad; agregamos el dominio publico (configurable por env).
    allowedHosts: [
      'localhost',
      'retenciontalento.online',
      '.retenciontalento.online', // subdominios (www, etc.)
      ...(process.env.VITE_ALLOWED_HOSTS
        ? process.env.VITE_ALLOWED_HOSTS.split(',').map((h) => h.trim()).filter(Boolean)
        : []),
    ],
    proxy: {
      // Proxy para evitar CORS en desarrollo
      '/api': {
        target: 'http://backend:4000',
        changeOrigin: true,
      },
    },
  },
});
