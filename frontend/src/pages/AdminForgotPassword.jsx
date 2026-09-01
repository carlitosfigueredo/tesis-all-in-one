import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import ReCAPTCHA from 'react-google-recaptcha';
import AlertMessage from '../components/AlertMessage';
import api from '../services/api';

const RECAPTCHA_SITE_KEY = import.meta.env.VITE_RECAPTCHA_SITE_KEY;

export default function AdminForgotPassword() {
  const [email, setEmail]       = useState('');
  const [status, setStatus]     = useState('idle'); // idle | loading | sent | error
  const [errorMsg, setErrorMsg] = useState('');
  const recaptchaRef = useRef(null);
  const [captchaToken, setCaptchaToken] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (RECAPTCHA_SITE_KEY && !captchaToken) {
      setErrorMsg('Completá la verificación de reCAPTCHA');
      setStatus('error');
      return;
    }

    setStatus('loading');
    setErrorMsg('');
    try {
      await api.post('/admin/auth/forgot-password', { email, recaptchaToken: captchaToken });
      setStatus('sent');
    } catch (err) {
      const msg = err.response?.data?.message || 'Algo salió mal. Intentá de nuevo.';
      setErrorMsg(msg);
      setStatus('error');
      recaptchaRef.current?.reset();
      setCaptchaToken(null);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-900 via-gray-900 to-slate-800 px-4">
      <div className="w-full max-w-sm">
        <div className="rounded-2xl bg-white/[0.97] p-8 shadow-2xl shadow-black/20 backdrop-blur-sm">

          {/* Header */}
          <div className="mb-7 text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-slate-900 shadow-lg">
              <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            <h1 className="text-xl font-bold text-gray-900">Recuperar contraseña</h1>
            <p className="mt-1 text-xs text-gray-400">Panel de administración — Sistema BI</p>
          </div>

          {/* Estado: enviado */}
          {status === 'sent' ? (
            <div className="rounded-xl bg-green-50 border border-green-200 p-5 text-center">
              <svg className="mx-auto mb-3 h-10 w-10 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="font-semibold text-green-800 mb-1">Enlace enviado</p>
              <p className="text-sm text-green-700">
                Si el correo está registrado como administrador, vas a recibir un enlace para cambiar tu contraseña.
              </p>
              <p className="mt-3 text-xs text-green-600">El enlace vence en 5 minutos.</p>
              <Link
                to="/admin/login"
                className="mt-5 inline-block text-sm font-medium text-slate-700 hover:underline"
              >
                ← Volver al login
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700" htmlFor="admin-forgot-email">
                  Correo electrónico
                </label>
                <input
                  id="admin-forgot-email"
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm transition-colors focus:border-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-700/20"
                  placeholder="admin@sistema.com"
                />
              </div>

              {/* reCAPTCHA */}
              {RECAPTCHA_SITE_KEY && (
                <div className="flex justify-center">
                  <ReCAPTCHA
                    ref={recaptchaRef}
                    sitekey={RECAPTCHA_SITE_KEY}
                    onChange={(token) => setCaptchaToken(token)}
                    onExpired={() => setCaptchaToken(null)}
                  />
                </div>
              )}

              {status === 'error' && (
                <AlertMessage
                  type="error"
                  message={errorMsg}
                  onClose={() => setStatus('idle')}
                />
              )}

              <button
                type="submit"
                disabled={status === 'loading'}
                className="w-full rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition-all hover:bg-slate-800 hover:shadow-md disabled:opacity-60"
              >
                {status === 'loading' ? 'Enviando...' : 'Enviar enlace'}
              </button>

              <p className="text-center text-sm text-gray-500">
                <Link to="/admin/login" className="font-medium text-slate-700 hover:underline">
                  ← Volver al login
                </Link>
              </p>
            </form>
          )}
        </div>

        <div className="mt-6 text-center">
          <Link to="/" className="text-xs text-gray-500 hover:text-gray-300 transition-colors">
            ← Volver al inicio
          </Link>
        </div>
      </div>
    </div>
  );
}
