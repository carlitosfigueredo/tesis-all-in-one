import { useRef, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import ReCAPTCHA from 'react-google-recaptcha';
import { useAuth } from '../context/AuthContext';
import PasswordInput from '../components/PasswordInput';
import AlertMessage from '../components/AlertMessage';

const RECAPTCHA_SITE_KEY = import.meta.env.VITE_RECAPTCHA_SITE_KEY;

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const recaptchaRef = useRef(null);
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [captchaToken, setCaptchaToken] = useState(null);

  const handleChange = (e) =>
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (RECAPTCHA_SITE_KEY && !captchaToken) {
      setError('Completa la verificacion de reCAPTCHA');
      return;
    }

    setLoading(true);
    try {
      await login(form.email, form.password, captchaToken);
      navigate('/dashboard');
    } catch (err) {
      const msg = err.response?.data?.message ?? 'Credenciales incorrectas. Verifica tu correo y contrasena.';
      setError(msg);
      setTimeout(() => {
        recaptchaRef.current?.reset();
        setCaptchaToken(null);
      }, 100);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen">
      {/* Panel izquierdo — branding */}
      <div className="hidden lg:flex lg:w-1/2 items-center justify-center bg-gradient-to-br from-primary-700 via-primary-600 to-primary-800 p-12">
        <div className="max-w-md text-white">
          <div className="mb-8 flex h-14 w-14 items-center justify-center rounded-xl bg-white/10 backdrop-blur-sm text-2xl">
            📊
          </div>
          <h1 className="text-3xl font-bold leading-tight mb-4">
            Sistema BI de Retencion de Talento
          </h1>
          <p className="text-primary-100 text-base leading-relaxed">
            Predeci la rotacion de personal con inteligencia artificial.
            Toma decisiones basadas en datos para retener a tus mejores colaboradores.
          </p>
          <div className="mt-10 space-y-3">
            <div className="flex items-center gap-3 text-sm text-primary-100">
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-white/10">
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              Prediccion de fuga con Machine Learning
            </div>
            <div className="flex items-center gap-3 text-sm text-primary-100">
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-white/10">
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              Dashboard interactivo con KPIs en tiempo real
            </div>
            <div className="flex items-center gap-3 text-sm text-primary-100">
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-white/10">
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              Multi-empresa con aislamiento de datos
            </div>
          </div>
        </div>
      </div>

      {/* Panel derecho — formulario */}
      <div className="flex w-full lg:w-1/2 items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm">
          {/* Logo mobile */}
          <div className="mb-8 lg:hidden text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-primary-600 text-xl text-white">
              📊
            </div>
          </div>

          <div className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900">Bienvenido</h2>
            <p className="mt-1 text-sm text-gray-500">
              Ingresa a tu cuenta para continuar
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700" htmlFor="email">
                Correo electronico
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                autoComplete="email"
                value={form.email}
                onChange={handleChange}
                className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm transition-colors focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                placeholder="tu@empresa.com"
              />
            </div>

            <PasswordInput
              label="Contrasena"
              id="password"
              name="password"
              required
              autoComplete="current-password"
              value={form.password}
              onChange={handleChange}
              placeholder="Ingresa tu contrasena"
            />

            <div className="flex items-center justify-end">
              <Link
                to="/forgot-password"
                className="text-xs text-primary-600 hover:text-primary-700 font-medium"
              >
                Olvidaste tu contrasena?
              </Link>
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

            {error && (
              <AlertMessage
                type="error"
                message={error}
                onClose={() => setError('')}
              />
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-primary-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-primary-700 hover:shadow-md disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Ingresando...
                </span>
              ) : (
                'Iniciar sesion'
              )}
            </button>
          </form>

          {/* Separador */}
          <div className="my-6 flex items-center gap-3">
            <div className="h-px flex-1 bg-gray-200" />
            <span className="text-xs text-gray-400">o</span>
            <div className="h-px flex-1 bg-gray-200" />
          </div>

          {/* Link a registro */}
          <div className="text-center">
            <p className="text-sm text-gray-500">
              No tenes cuenta?{' '}
              <Link to="/register" className="text-primary-600 font-semibold hover:text-primary-700">
                Registra tu empresa
              </Link>
            </p>
          </div>

          {/* Volver a landing */}
          <div className="mt-8 text-center">
            <Link to="/" className="text-xs text-gray-400 hover:text-gray-500 transition-colors">
              ← Volver al inicio
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
