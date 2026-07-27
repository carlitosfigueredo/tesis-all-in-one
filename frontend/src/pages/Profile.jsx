import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/layout/Sidebar';
import Navbar  from '../components/layout/Navbar';
import { useAuth } from '../context/AuthContext';
import PasswordStrengthIndicator from '../components/PasswordStrengthIndicator';
import api from '../services/api';

const ROLE_LABELS = {
  COMPANY_ADMIN: 'Administrador de empresa',
  ANALYST:       'Analista',
  VIEWER:        'Solo lectura',
};

export default function Profile() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [showPass, setShowPass] = useState(false);
  const [status, setStatus]     = useState('idle'); // idle | loading | success | error
  const [errors, setErrors]     = useState([]);

  const handleChange = (e) =>
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrors([]);

    if (form.newPassword !== form.confirmPassword) {
      setErrors(['Las contraseñas nuevas no coinciden']);
      return;
    }
    if (form.newPassword.length < 8) {
      setErrors(['La nueva contraseña debe tener al menos 8 caracteres']);
      return;
    }

    setStatus('loading');
    try {
      await api.post('/auth/change-password', {
        currentPassword: form.currentPassword,
        newPassword:     form.newPassword,
        confirmPassword: form.confirmPassword,
      });
      setStatus('success');
      setForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err) {
      const data = err.response?.data;
      setErrors(
        data?.errors?.map((e) => e.message ?? e) ??
        [data?.message ?? 'Error al cambiar la contraseña']
      );
      setStatus('error');
    }
  };

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-auto">
        <Navbar title="Mi perfil" />
        <main className="flex-1 p-6 max-w-2xl">

          {/* Tarjeta de info */}
          <div className="rounded-xl bg-white border border-gray-100 shadow-sm p-6 mb-6">
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary-100 text-2xl font-bold text-primary-600 flex-shrink-0">
                {user?.name?.charAt(0).toUpperCase()}
              </div>
              <div>
                <p className="text-lg font-bold text-gray-900">{user?.name}</p>
                <p className="text-sm text-gray-500">{user?.email}</p>
                <span className="mt-1 inline-block rounded-full bg-blue-50 px-2 py-0.5 text-xs font-semibold text-blue-700">
                  {ROLE_LABELS[user?.role] ?? user?.role}
                </span>
                {user?.companyName && (
                  <span className="ml-2 inline-block rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
                    {user.companyName}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Formulario cambio de contraseña */}
          <div className="rounded-xl bg-white border border-gray-100 shadow-sm p-6">
            <h2 className="text-base font-semibold text-gray-900 mb-5">Cambiar contraseña</h2>

            {status === 'success' && (
              <div className="mb-5 rounded-lg bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-700 flex items-center gap-2">
                <svg className="h-4 w-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Contraseña cambiada correctamente.
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Contraseña actual */}
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700" htmlFor="currentPassword">
                  Contraseña actual
                </label>
                <input
                  id="currentPassword"
                  name="currentPassword"
                  type={showPass ? 'text' : 'password'}
                  required
                  autoComplete="current-password"
                  value={form.currentPassword}
                  onChange={handleChange}
                  className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/30"
                />
              </div>

              {/* Nueva contraseña */}
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700" htmlFor="newPassword">
                  Nueva contraseña
                </label>
                <div className="relative">
                  <input
                    id="newPassword"
                    name="newPassword"
                    type={showPass ? 'text' : 'password'}
                    required
                    autoComplete="new-password"
                    value={form.newPassword}
                    onChange={handleChange}
                    className="w-full rounded-lg border border-gray-300 px-4 py-2.5 pr-10 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/30"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    aria-label={showPass ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                  >
                    {showPass
                      ? <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /></svg>
                      : <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                    }
                  </button>
                </div>
                <PasswordStrengthIndicator password={form.newPassword} />
              </div>

              {/* Confirmar */}
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700" htmlFor="confirmPassword">
                  Confirmar nueva contraseña
                </label>
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type={showPass ? 'text' : 'password'}
                  required
                  autoComplete="new-password"
                  value={form.confirmPassword}
                  onChange={handleChange}
                  className={`w-full rounded-lg border px-4 py-2.5 text-sm focus:outline-none focus:ring-2
                    ${form.confirmPassword && form.newPassword !== form.confirmPassword
                      ? 'border-red-300 focus:border-red-400 focus:ring-red-400/20'
                      : 'border-gray-300 focus:border-primary-500 focus:ring-primary-500/30'
                    }`}
                />
                {form.confirmPassword && form.newPassword !== form.confirmPassword && (
                  <p className="mt-1 text-xs text-red-500">Las contraseñas no coinciden</p>
                )}
              </div>

              {/* Errores backend */}
              {status === 'error' && errors.length > 0 && (
                <ul className="rounded-lg bg-red-50 px-4 py-3 space-y-1">
                  {errors.map((e, i) => (
                    <li key={i} className="text-sm text-red-600 flex items-start gap-1.5">
                      <span className="mt-0.5">•</span>{e}
                    </li>
                  ))}
                </ul>
              )}

              <div className="flex gap-3 pt-1">
                <button
                  type="submit"
                  disabled={status === 'loading'}
                  className="rounded-lg bg-primary-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-primary-700 disabled:opacity-60 transition-colors"
                >
                  {status === 'loading' ? 'Guardando...' : 'Cambiar contraseña'}
                </button>
                <button
                  type="button"
                  onClick={() => navigate(-1)}
                  className="rounded-lg border border-gray-200 px-5 py-2.5 text-sm text-gray-600 hover:bg-gray-50 transition-colors"
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>

          {/* Zona peligrosa */}
          <div className="mt-6 rounded-xl border border-red-100 bg-red-50/50 p-5">
            <h3 className="text-sm font-semibold text-red-700 mb-1">Cerrar sesión</h3>
            <p className="text-xs text-red-500 mb-3">Cerrá sesión en todos los dispositivos.</p>
            <button
              onClick={() => { logout(); navigate('/login'); }}
              className="rounded-lg border border-red-200 bg-white px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
            >
              Cerrar sesión
            </button>
          </div>

        </main>
      </div>
    </div>
  );
}
