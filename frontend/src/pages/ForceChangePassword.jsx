import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import PasswordInput from '../components/PasswordInput';
import PasswordStrengthIndicator from '../components/PasswordStrengthIndicator';
import Toast from '../components/Toast';
import api from '../services/api';

export default function ForceChangePassword() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({ newPassword: '', confirmPassword: '' });
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);

  const handleChange = (e) =>
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (form.newPassword !== form.confirmPassword) {
      setToast({ type: 'error', title: 'Error', message: 'Las contrasenas no coinciden' });
      return;
    }
    if (form.newPassword.length < 8) {
      setToast({ type: 'error', title: 'Error', message: 'La contrasena debe tener al menos 8 caracteres' });
      return;
    }

    setLoading(true);
    try {
      // El endpoint change-password requiere currentPassword,
      // pero como es primer login usamos la pass temporal que el usuario acaba de usar
      // Alternativa: endpoint especifico para force-change
      await api.post('/auth/force-change-password', {
        newPassword: form.newPassword,
        confirmPassword: form.confirmPassword,
      });
      setToast({ type: 'success', title: 'Contrasena actualizada', message: 'Redirigiendo al dashboard...' });
      setTimeout(() => {
        window.location.reload(); // Recargar para que /auth/me tome mustChangePassword: false
      }, 1500);
    } catch (err) {
      const data = err.response?.data;
      const msg = data?.errors?.map((e) => e.message ?? e).join('. ') ?? data?.message ?? 'Error al cambiar la contrasena';
      setToast({ type: 'error', title: 'Error', message: msg });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen">
      {/* Panel izquierdo — igual al login */}
      <div className="hidden lg:flex lg:w-1/2 items-center justify-center bg-gradient-to-br from-primary-700 via-primary-600 to-primary-800 p-12">
        <div className="max-w-md text-white">
          <div className="mb-8 flex h-14 w-14 items-center justify-center rounded-xl bg-white/10 backdrop-blur-sm text-2xl">
            🔐
          </div>
          <h1 className="text-3xl font-bold leading-tight mb-4">
            Cambio de contrasena obligatorio
          </h1>
          <p className="text-primary-100 text-base leading-relaxed">
            Tu cuenta fue creada con una contrasena temporal. Por seguridad,
            debes establecer una contrasena personal antes de continuar.
          </p>
          <div className="mt-10 space-y-3">
            <div className="flex items-center gap-3 text-sm text-primary-100">
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-white/10">
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              Minimo 8 caracteres
            </div>
            <div className="flex items-center gap-3 text-sm text-primary-100">
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-white/10">
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              Mayusculas, minusculas, numeros y simbolos
            </div>
            <div className="flex items-center gap-3 text-sm text-primary-100">
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-white/10">
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              No compartas tu contrasena con nadie
            </div>
          </div>
        </div>
      </div>

      {/* Panel derecho — formulario */}
      <div className="flex w-full lg:w-1/2 items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm">
          {/* Mobile header */}
          <div className="mb-8 lg:hidden text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-primary-600 text-xl text-white">
              🔐
            </div>
          </div>

          <div className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900">Establece tu contrasena</h2>
            <p className="mt-1 text-sm text-gray-500">
              Hola <strong>{user?.name}</strong>, crea una contrasena personal para tu cuenta.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <PasswordInput
                label="Nueva contrasena"
                name="newPassword"
                value={form.newPassword}
                onChange={handleChange}
                required
                placeholder="Ingresa tu nueva contrasena"
              />
              <PasswordStrengthIndicator password={form.newPassword} />
            </div>

            <div>
              <PasswordInput
                label="Confirmar contrasena"
                name="confirmPassword"
                value={form.confirmPassword}
                onChange={handleChange}
                required
                placeholder="Repetir contrasena"
              />
              {form.confirmPassword && form.newPassword !== form.confirmPassword && (
                <p className="mt-1 text-xs text-red-500">Las contrasenas no coinciden</p>
              )}
            </div>

            <button
              type="submit"
              disabled={loading || form.newPassword.length < 8 || form.newPassword !== form.confirmPassword}
              className="w-full rounded-lg bg-primary-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-primary-700 hover:shadow-md disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Guardando...
                </span>
              ) : (
                'Guardar contrasena y continuar'
              )}
            </button>
          </form>

          <div className="mt-6 text-center">
            <button
              onClick={logout}
              className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
            >
              Cerrar sesion
            </button>
          </div>
        </div>
      </div>

      {/* Toast */}
      {toast && (
        <Toast
          type={toast.type}
          title={toast.title}
          message={toast.message}
          duration={5000}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
}
