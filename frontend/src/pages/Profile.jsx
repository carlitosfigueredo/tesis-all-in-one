import { useState } from 'react';
import Sidebar from '../components/layout/Sidebar';
import Navbar  from '../components/layout/Navbar';
import { useAuth } from '../context/AuthContext';
import PasswordInput from '../components/PasswordInput';
import PasswordStrengthIndicator from '../components/PasswordStrengthIndicator';
import Toast from '../components/Toast';
import api from '../services/api';

const ROLE_LABELS = {
  COMPANY_ADMIN: 'Administrador de empresa',
  ANALYST:       'Analista',
  VIEWER:        'Solo lectura',
};

const PLAN_LABELS = {
  BASICO:      'Plan Estandar',
  PROFESIONAL: 'Plan Profesional',
  CORPORATIVO: 'Plan Corporativo',
};

export default function Profile() {
  const { user } = useAuth();

  const [form, setForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [loading, setLoading] = useState(false);
  const [toast, setToast]     = useState(null);

  const handleChange = (e) =>
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (form.newPassword !== form.confirmPassword) {
      setToast({ type: 'error', title: 'Error', message: 'Las contrasenas nuevas no coinciden' });
      return;
    }
    if (form.newPassword.length < 8) {
      setToast({ type: 'error', title: 'Error', message: 'La nueva contrasena debe tener al menos 8 caracteres' });
      return;
    }

    setLoading(true);
    try {
      await api.post('/auth/change-password', {
        currentPassword: form.currentPassword,
        newPassword:     form.newPassword,
        confirmPassword: form.confirmPassword,
      });
      setToast({ type: 'success', title: 'Listo', message: 'Contrasena cambiada correctamente' });
      setForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err) {
      const data = err.response?.data;
      const msg = data?.errors?.map((e) => e.message ?? e).join('. ') ?? data?.message ?? 'Error al cambiar la contrasena';
      setToast({ type: 'error', title: 'Error', message: msg });
    } finally {
      setLoading(false);
    }
  };

  const userRole = user?.roles?.[0] ?? '';

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
                <div className="mt-1 flex flex-wrap gap-2">
                  <span className="inline-block rounded-full bg-blue-50 px-2 py-0.5 text-xs font-semibold text-blue-700">
                    {ROLE_LABELS[userRole] ?? userRole}
                  </span>
                  {user?.companyName && (
                    <span className="inline-block rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
                      {user.companyName}
                    </span>
                  )}
                  {user?.companyPlan && (
                    <span className="inline-block rounded-full bg-purple-50 px-2 py-0.5 text-xs text-purple-700">
                      {PLAN_LABELS[user.companyPlan] ?? user.companyPlan}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Formulario cambio de contrasena */}
          <div className="rounded-xl bg-white border border-gray-100 shadow-sm p-6">
            <h2 className="text-base font-semibold text-gray-900 mb-1">Cambiar contrasena</h2>
            <p className="text-sm text-gray-500 mb-5">
              Actualiza tu contrasena periodicamente para mantener tu cuenta segura.
            </p>

            <form onSubmit={handleSubmit} className="space-y-5">
              <PasswordInput
                label="Contrasena actual"
                name="currentPassword"
                value={form.currentPassword}
                onChange={handleChange}
                required
                autoComplete="current-password"
                placeholder="Ingresa tu contrasena actual"
              />

              <div>
                <PasswordInput
                  label="Nueva contrasena"
                  name="newPassword"
                  value={form.newPassword}
                  onChange={handleChange}
                  required
                  autoComplete="new-password"
                  placeholder="Ingresa tu nueva contrasena"
                />
                <PasswordStrengthIndicator password={form.newPassword} />
              </div>

              <div>
                <PasswordInput
                  label="Confirmar nueva contrasena"
                  name="confirmPassword"
                  value={form.confirmPassword}
                  onChange={handleChange}
                  required
                  autoComplete="new-password"
                  placeholder="Repetir nueva contrasena"
                />
                {form.confirmPassword && form.newPassword !== form.confirmPassword && (
                  <p className="mt-1 text-xs text-red-500">Las contrasenas no coinciden</p>
                )}
              </div>

              <button
                type="submit"
                disabled={loading || form.newPassword.length < 8 || form.newPassword !== form.confirmPassword}
                className="rounded-lg bg-primary-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-primary-700 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? 'Guardando...' : 'Cambiar contrasena'}
              </button>
            </form>
          </div>
        </main>
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
