import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import ReCAPTCHA from 'react-google-recaptcha';
import AlertMessage from '../components/AlertMessage';
import api from '../services/api';

const RECAPTCHA_SITE_KEY = import.meta.env.VITE_RECAPTCHA_SITE_KEY;

export default function ForgotPassword() {
  const [email, setEmail]       = useState('');
  const [status, setStatus]     = useState('idle'); // idle | loading | sent | error
  const [errorMsg, setErrorMsg] = useState('');
  const recaptchaRef = useRef(null);
  const [captchaToken, setCaptchaToken] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (RECAPTCHA_SITE_KEY && !captchaToken) {
      setErrorMsg('Completa la verificacion de reCAPTCHA');
      setStatus('error');
      return;
    }

    setStatus('loading');
    setErrorMsg('');
    try {
      await api.post('/auth/forgot-password', { email, recaptchaToken: captchaToken });
      setStatus('sent');
    } catch (err) {
      const msg = err.response?.data?.message || 'Algo salio mal. Intenta de nuevo.';
      setErrorMsg(msg);
      setStatus('error');
      recaptchaRef.current?.reset();
      setCaptchaToken(null);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-primary-900 to-primary-600 px-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-2xl">

        {/* Header */}
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary-100">
            <svg className="h-7 w-7 text-primary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8} aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Recuperar contrasena</h1>
          <p className="mt-1 text-sm text-gray-500">
            Ingresa tu correo y te enviamos un enlace para cambiarla.
          </p>
        </div>

        {/* Estado: enviado */}
        {status === 'sent' ? (
          <div className="rounded-xl bg-green-50 border border-green-200 p-5 text-center">
            <svg className="mx-auto mb-3 h-10 w-10 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8} aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="font-semibold text-green-800 mb-1">Listo!</p>
            <p className="text-sm text-green-700">
              Si el correo esta registrado, vas a recibir un enlace en breve.
              Revisa tambien la carpeta de spam.
            </p>
            <p className="mt-3 text-xs text-green-600">El enlace vence en 5 minutos.</p>
            <Link
              to="/login"
              className="mt-5 inline-block text-sm font-medium text-primary-600 hover:underline"
            >
              ← Volver al inicio de sesion
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700" htmlFor="forgot-email">
                Correo electronico
              </label>
              <input
                id="forgot-email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm transition-colors focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                placeholder="tu@correo.com"
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
              className="w-full rounded-lg bg-primary-600 px-4 py-2.5 text-sm font-semibold text-white transition-all hover:bg-primary-700 hover:shadow-md disabled:opacity-60"
            >
              {status === 'loading' ? 'Enviando...' : 'Enviar enlace'}
            </button>

            <p className="text-center text-sm text-gray-500">
              <Link to="/login" className="font-medium text-primary-600 hover:underline">
                ← Volver al inicio de sesion
              </Link>
            </p>
          </form>
        )}
      </div>
    </div>
  );
}
