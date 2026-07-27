import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

const PLANS = [
  { id: 'BASICO', name: 'Estandar', price: 'Gs. 999.000/mes' },
  { id: 'PROFESIONAL', name: 'Profesional', price: 'Gs. 1.390.000/mes' },
  { id: 'EMPRESARIAL', name: 'Corporativo', price: 'Gs. 2.590.000/mes' },
];

export default function Register() {
  const navigate = useNavigate();
  const { login: authLogin } = useAuth();
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({
    companyName: '',
    plan: 'BASICO',
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [errors, setErrors] = useState([]);
  const [loading, setLoading] = useState(false);

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
    if (form.password.length < 8) {
      setErrors(['La contrasena debe tener al menos 8 caracteres']);
      return;
    }
    if (!form.name.trim() || !form.email.trim()) {
      setErrors(['Completa todos los campos']);
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
      });

      // Guardar token y setear usuario en contexto
      const { token, user } = res.data;
      localStorage.setItem('token', token);
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`;

      // Redirigir al dashboard (el PrivateRoute lo manejara)
      navigate('/dashboard');
      // Forzar recarga del usuario en el contexto
      window.location.reload();
    } catch (err) {
      const msg = err.response?.data?.message ?? 'Error al registrar. Intenta de nuevo';
      const fieldErrors = err.response?.data?.errors?.map((e) => `${e.field}: ${e.message}`) ?? [];
      setErrors(fieldErrors.length > 0 ? fieldErrors : [msg]);
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
                          : 'border-gray-200 hover:border-gray-300'
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
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Contrasena</label>
                <input
                  name="password"
                  type="password"
                  value={form.password}
                  onChange={handleChange}
                  className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/30"
                  placeholder="Minimo 8 caracteres"
                  required
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Confirmar contrasena</label>
                <input
                  name="confirmPassword"
                  type="password"
                  value={form.confirmPassword}
                  onChange={handleChange}
                  className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/30"
                  placeholder="Repeti tu contrasena"
                  required
                />
              </div>

              {errors.length > 0 && (
                <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600 space-y-1">
                  {errors.map((e, i) => (
                    <p key={i}>&#8226; {e}</p>
                  ))}
                </div>
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
