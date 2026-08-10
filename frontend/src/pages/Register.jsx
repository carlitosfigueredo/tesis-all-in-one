import { useRef, useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import ReCAPTCHA from 'react-google-recaptcha';
import { useAuth } from '../context/AuthContext';
import PasswordInput from '../components/PasswordInput';
import PasswordStrengthIndicator from '../components/PasswordStrengthIndicator';
import AlertMessage from '../components/AlertMessage';
import api from '../services/api';
import { usePasswordPolicy } from '../hooks/usePasswordPolicy';

// Version de los documentos legales — debe coincidir con PrivacyPolicy.jsx y TermsAndConditions.jsx
const PRIVACY_VERSION = '1.0';
const TERMS_VERSION   = '1.0';

const RECAPTCHA_SITE_KEY = import.meta.env.VITE_RECAPTCHA_SITE_KEY;

const PLANS = [
  { id: 'BASICO', name: 'Estandar', price: 'Gs. 999.000/mes' },
  { id: 'PROFESIONAL', name: 'Profesional', price: 'Gs. 1.390.000/mes' },
  { id: 'CORPORATIVO', name: 'Corporativo', price: 'Gs. 2.590.000/mes' },
];

export default function Register() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { setSession } = useAuth();
  const { policy } = usePasswordPolicy();
  const [step, setStep] = useState(1);

  // Leer el plan preseleccionado desde la URL (?plan=PROFESIONAL)
  const VALID_PLANS = ['BASICO', 'PROFESIONAL', 'CORPORATIVO'];
  const planFromUrl = searchParams.get('plan')?.toUpperCase();
  const initialPlan = VALID_PLANS.includes(planFromUrl) ? planFromUrl : 'BASICO';

  const [form, setForm] = useState({
    companyName: '',
    plan: initialPlan,
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [errors, setErrors] = useState([]);
  const [loading, setLoading] = useState(false);
  const recaptchaRef = useRef(null);
  const [captchaToken, setCaptchaToken] = useState(null);

  // Consentimientos — NO preseleccionados (requisito UNIDA punto 35)
  const [acceptedPrivacy, setAcceptedPrivacy] = useState(false);
  const [acceptedTerms, setAcceptedTerms]     = useState(false);

  const handleChange = (e) =>
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));

  const nextStep = () => {
    setErrors([]);
    if (step === 1) {
      if (!form.companyName.trim()) {
        setErrors(['Ingresa el nombre de tu empresa']);
        return;
      }
    }
    setStep((s) => s + 1);
  };

  const prevStep = () => setStep((s) => s - 1);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrors([]);

    if (form.password !== form.confirmPassword) {
      setErrors(['Las contrasenas no coinciden']);
      return;
    }
    if (form.password.length < policy.minLength) {
      setErrors([`La contrasena debe tener al menos ${policy.minLength} caracteres`]);
      return;
    }
    if (!form.name.trim() || !form.email.trim()) {
      setErrors(['Completa todos los campos']);
      return;
    }
    if (RECAPTCHA_SITE_KEY && !captchaToken) {
      setErrors(['Completa la verificacion de reCAPTCHA']);
      return;
    }

    // Validar consentimientos obligatorios (UNIDA punto 35)
    if (!acceptedPrivacy) {
      setErrors(['Tenes que aceptar la Politica de Privacidad para continuar']);
      return;
    }
    if (!acceptedTerms) {
      setErrors(['Tenes que aceptar los Terminos y Condiciones para continuar']);
      return;
    }

    setLoading(true);
    try {
      const { data: res } = await api.post('/auth/register', {
        companyName: form.companyName,
        plan: form.plan,
        name: form.name,
        email: form.email,
        password: form.password,
        confirmPassword: form.confirmPassword,
        recaptchaToken: captchaToken,
        // Consentimientos con version del documento
        consents: {
          privacyPolicy:       { accepted: true, version: PRIVACY_VERSION },
          termsAndConditions:  { accepted: true, version: TERMS_VERSION   },
        },
      });

      // Guardar token y setear usuario en contexto
      const { token, user } = res.data;
      setSession(token, user);

      // Redirigir al checkout pasando el plan seleccionado
      navigate('/checkout', { replace: true, state: { preselectedPlan: form.plan } });
    } catch (err) {
      const msg = err.response?.data?.message ?? 'Error al registrar. Intenta de nuevo';
      const fieldErrors = err.response?.data?.errors?.map((e) => `${e.field}: ${e.message}`) ?? [];
      setErrors(fieldErrors.length > 0 ? fieldErrors : [msg]);
      // Resetear captcha despues de setear errores (para que no cause flash)
      setTimeout(() => {
        recaptchaRef.current?.reset();
        setCaptchaToken(null);
      }, 100);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-primary-900 to-primary-600 px-4 py-8">
      <div className="w-full max-w-lg rounded-2xl bg-white p-8 shadow-2xl">
        {/* Header */}
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-primary-500 text-2xl text-white">
            🚀
          </div>
          <h1 className="text-xl font-bold text-gray-900">Registra tu empresa</h1>
          <p className="mt-1 text-sm text-gray-500">
            Comenza a predecir la rotacion de talento en minutos
          </p>
        </div>

        {/* Indicador de pasos */}
        <div className="mb-6 flex items-center justify-center gap-2">
          {[1, 2, 3].map((s) => (
            <div
              key={s}
              className={`h-2 w-8 rounded-full transition-colors ${
                s <= step ? 'bg-primary-500' : 'bg-gray-200'
              }`}
            />
          ))}
        </div>

        <form onSubmit={handleSubmit}>
          {/* Paso 1: Datos de empresa */}
          {step === 1 && (
            <div className="space-y-4">
              <h2 className="text-sm font-semibold text-gray-700 mb-3">Datos de tu empresa</h2>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Nombre de la empresa</label>
                <input
                  name="companyName"
                  value={form.companyName}
                  onChange={handleChange}
                  className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/30"
                  placeholder="Ej: Mi Empresa S.A."
                  required
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Plan</label>
                <div className="grid gap-2">
                  {PLANS.map((p) => (
                    <label
                      key={p.id}
                      className={`flex cursor-pointer items-center justify-between rounded-lg border px-4 py-3 transition-colors ${
                        form.plan === p.id
                          ? 'border-primary-500 bg-primary-50'
                          : 'border-gray-200 bg-white hover:border-gray-300'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <input
                          type="radio"
                          name="plan"
                          value={p.id}
                          checked={form.plan === p.id}
                          onChange={handleChange}
                          className="text-primary-600 focus:ring-primary-500"
                        />
                        <span className="text-sm font-medium text-gray-900">{p.name}</span>
                      </div>
                      <span className="text-xs text-gray-500">{p.price}</span>
                    </label>
                  ))}
                </div>
              </div>
              <button
                type="button"
                onClick={nextStep}
                className="w-full rounded-lg bg-primary-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-primary-700"
              >
                Siguiente
              </button>
            </div>
          )}

          {/* Paso 2: Datos del admin */}
          {step === 2 && (
            <div className="space-y-4">
              <h2 className="text-sm font-semibold text-gray-700 mb-3">Tu cuenta de administrador</h2>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Nombre completo</label>
                <input
                  name="name"
                  value={form.name}
                  onChange={handleChange}
                  className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/30"
                  placeholder="Ej: Juan Perez"
                  required
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Correo electronico</label>
                <input
                  name="email"
                  type="email"
                  value={form.email}
                  onChange={handleChange}
                  className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/30"
                  placeholder="tu@empresa.com"
                  required
                />
              </div>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={prevStep}
                  className="flex-1 rounded-lg border border-gray-200 px-4 py-2.5 text-sm text-gray-600 hover:bg-gray-50 transition"
                >
                  Atras
                </button>
                <button
                  type="button"
                  onClick={nextStep}
                  className="flex-1 rounded-lg bg-primary-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-primary-700"
                >
                  Siguiente
                </button>
              </div>
            </div>
          )}

          {/* Paso 3: Contrasena */}
          {step === 3 && (
            <div className="space-y-4">
              <h2 className="text-sm font-semibold text-gray-700 mb-3">Crea tu contrasena</h2>
              <PasswordInput
                label="Contrasena"
                name="password"
                value={form.password}
                onChange={handleChange}
                placeholder={`Minimo ${policy.minLength} caracteres`}
                required
              />
              <PasswordStrengthIndicator password={form.password} />
              <PasswordInput
                label="Confirmar contrasena"
                name="confirmPassword"
                value={form.confirmPassword}
                onChange={handleChange}
                placeholder="Repeti tu contrasena"
                required
              />

              {/* Aviso de privacidad + consentimientos — NO preseleccionados (UNIDA punto 35) */}
              <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 text-xs text-gray-600">
                <p className="mb-2 font-medium text-gray-700">Aviso de Privacidad</p>
                <p>
                  Los datos personales que proporcionás serán utilizados para gestionar tu cuenta
                  y brindar los servicios contratados, conforme a la{' '}
                  <strong>Ley N.º 7593/2025</strong> de Protección de Datos Personales de Paraguay.
                  Para más información consultá nuestra{' '}
                  <Link
                    to="/privacy"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary-600 underline hover:text-primary-800"
                  >
                    Política de Privacidad
                  </Link>.
                </p>
              </div>

              {/* Casilla 1: Política de Privacidad — NO preseleccionada */}
              <label className="flex cursor-pointer items-start gap-3">
                <input
                  type="checkbox"
                  checked={acceptedPrivacy}
                  onChange={(e) => setAcceptedPrivacy(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                  // defaultChecked NO se usa — casilla vacía por defecto (UNIDA punto 35)
                />
                <span className="text-xs text-gray-600 leading-relaxed">
                  He leído el Aviso de Privacidad y consiento el tratamiento de mis datos personales
                  para las finalidades descritas en la{' '}
                  <Link
                    to="/privacy"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary-600 underline hover:text-primary-800"
                  >
                    Política de Privacidad
                  </Link>{' '}
                  (versión {PRIVACY_VERSION}).{' '}
                  <span className="font-semibold text-red-500">*</span>
                </span>
              </label>

              {/* Casilla 2: Términos y Condiciones — NO preseleccionada */}
              <label className="flex cursor-pointer items-start gap-3">
                <input
                  type="checkbox"
                  checked={acceptedTerms}
                  onChange={(e) => setAcceptedTerms(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                />
                <span className="text-xs text-gray-600 leading-relaxed">
                  He leído y acepto los{' '}
                  <Link
                    to="/terms"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary-600 underline hover:text-primary-800"
                  >
                    Términos y Condiciones de Uso
                  </Link>{' '}
                  (versión {TERMS_VERSION}).{' '}
                  <span className="font-semibold text-red-500">*</span>
                </span>
              </label>

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

              {errors.length > 0 && (
                <AlertMessage
                  type="error"
                  message={errors.length === 1 ? errors[0] : 'Corrige los siguientes errores:'}
                  messages={errors.length > 1 ? errors : undefined}
                  onClose={() => setErrors([])}
                />
              )}

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={prevStep}
                  className="flex-1 rounded-lg border border-gray-200 px-4 py-2.5 text-sm text-gray-600 hover:bg-gray-50 transition"
                >
                  Atras
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 rounded-lg bg-primary-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-primary-700 disabled:opacity-60"
                >
                  {loading ? 'Registrando...' : 'Crear cuenta'}
                </button>
              </div>
            </div>
          )}
        </form>

        {/* Footer */}
        <div className="mt-6 text-center text-sm text-gray-500">
          Ya tenes cuenta?{' '}
          <Link to="/login" className="text-primary-600 font-medium hover:underline">
            Inicia sesion
          </Link>
        </div>
      </div>
    </div>
  );
}
