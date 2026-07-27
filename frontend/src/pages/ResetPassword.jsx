import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import api from '../services/api';
import PasswordStrengthIndicator from '../components/PasswordStrengthIndicator';

export default function ResetPassword() {
  const [searchParams]  = useSearchParams();
  const navigate        = useNavigate();
  const token           = searchParams.get('token') || '';

  const [form, setForm]     = useState({ newPassword: '', confirmPassword: '' });
  const [status, setStatus] = useState('idle'); // idle | loading | success | error | invalid
  const [errors, setErrors] = useState([]);
  const [showPass, setShowPass] = useState(false);

  // Si no hay token en la URL, mostrar error inmediatamente
  const hasToken = token.length > 0;

  const handleChange = (e) =>
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrors([]);

    if (form.newPassword !== form.confirmPassword) {
      setErrors(['Las contraseñas no coinciden']);
      return;
    }

    setStatus('loading');
    try {
      await api.post('/auth/reset-password', {
        token,
        newPassword:     form.newPassword,
        confirmPassword: form.confirmPassword,
      });
      setStatus('success');
      setTimeout(() => navigate('/login'), 3000);
    } catch (err) {
      const data = err.response?.data;
      if (data?.errors?.length) {
        setErrors(data.errors.map((e) => e.message ?? e));
      } else {
        setErrors([data?.message || 'Algo salió mal. Intentá de nuevo.']);
      }
      // Token inválido/expirado
      if (err.response?.status === 400 && data?.message?.includes('enlace')) {
        setStatus('invalid');
      } else {
        setStatus('error');
      }
    }
  };

  // ── Token ausente ─────────────────────────────────────────────────────────
  if (!hasToken) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-primary-900 to-primary-600">
        <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-2xl text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-red-100">
            <svg className="h-7 w-7 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Enlace inválido</h2>
          <p className="text-sm text-gray-500 mb-5">
            El enlace que usaste no es válido o ya venció. Solicitá uno nuevo.
          </p>
          <Link
            to="/forgot-password"
            className="inline-block rounded-lg bg-primary-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-primary-700 transition-colors"
          >
            Solicitar nuevo enlace
          </Link>
        </div>
      </div>
    );
  }

  // ── Éxito ─────────────────────────────────────────────────────────────────
  if (status === 'success') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-primary-900 to-primary-600">
        <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-2xl text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-green-100">
            <svg className="h-7 w-7 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">¡Contraseña cambiada!</h2>
          <p className="text-sm text-gray-500 mb-1">Tu contraseña fue actualizada correctamente.</p>
          <p className="text-xs text-gray-400 mb-5">Serás redirigido al inicio de sesión en unos segundos...</p>
          <Link
            to="/login"
            className="inline-block rounded-lg bg-primary-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-primary-700 transition-colors"
          >
            Ir al inicio de sesión
          </Link>
        </div>
      </div>
    );
  }

  // ── Token inválido/expirado después de intentar ───────────────────────────
  if (status === 'invalid') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-primary-900 to-primary-600">
        <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-2xl text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-amber-100">
            <svg className="h-7 w-7 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">El enlace venció</h2>
          <p className="text-sm text-gray-500 mb-5">
            {errors[0] || 'El enlace no es válido o ya fue usado. Solicitá uno nuevo.'}
          </p>
          <Link
            to="/forgot-password"
            className="inline-block rounded-lg bg-primary-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-primary-700 transition-colors"
          >
            Solicitar nuevo enlace
          </Link>
        </div>
      </div>
    );
  }

  // ── Formulario principal ──────────────────────────────────────────────────
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-primary-900 to-primary-600">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-2xl">

        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary-100">
            <svg className="h-7 w-7 text-primary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8} aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Nueva contraseña</h1>
          <p className="mt-1 text-sm text-gray-500">Elegí una contraseña segura para tu cuenta.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">

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
                placeholder="••••••••"
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
            {/* Indicador de fortaleza */}
            <PasswordStrengthIndicator password={form.newPassword} />
          </div>

          {/* Confirmar contraseña */}
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700" htmlFor="confirmPassword">
              Confirmar contraseña
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
              placeholder="••••••••"
            />
            {form.confirmPassword && form.newPassword !== form.confirmPassword && (
              <p className="mt-1 text-xs text-red-500">Las contraseñas no coinciden</p>
            )}
          </div>

          {/* Errores del backend */}
          {status === 'error' && errors.length > 0 && (
            <ul className="rounded-lg bg-red-50 px-4 py-3 space-y-1">
              {errors.map((e, i) => (
                <li key={i} className="text-sm text-red-600 flex items-start gap-1.5">
                  <span className="mt-0.5">•</span> {e}
                </li>
              ))}
            </ul>
          )}

          <button
            type="submit"
            disabled={status === 'loading' || (form.confirmPassword && form.newPassword !== form.confirmPassword)}
            className="w-full rounded-lg bg-primary-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-primary-700 disabled:opacity-60"
          >
            {status === 'loading' ? 'Guardando...' : 'Cambiar contraseña'}
          </button>

          <p className="text-center text-sm text-gray-500">
            <Link to="/login" className="font-medium text-primary-600 hover:underline">
              ← Volver al inicio de sesión
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
