import { useState, useEffect } from 'react';
import Sidebar from '../components/layout/Sidebar';
import Navbar  from '../components/layout/Navbar';
import { useAuth } from '../context/AuthContext';
import PasswordInput from '../components/PasswordInput';
import PasswordStrengthIndicator from '../components/PasswordStrengthIndicator';
import Toast from '../components/Toast';
import api from '../services/api';
import { usePasswordPolicy } from '../hooks/usePasswordPolicy';

const ROLE_LABELS = {
  COMPANY_ADMIN: 'Administrador de empresa',
  ANALYST:       'Analista',
  VIEWER:        'Solo lectura',
};

const PLAN_LABELS = {
  BASICO:      'Plan Estándar',
  PROFESIONAL: 'Plan Profesional',
  CORPORATIVO: 'Plan Corporativo',
};

export default function Profile() {
  const { user } = useAuth();
  const { policy } = usePasswordPolicy();

  const [form, setForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [loading, setLoading] = useState(false);
  const [toast, setToast]     = useState(null);

  // ── Consentimientos ─────────────────────────────────────────────────────────
  const [consents, setConsents] = useState([]);
  const [consentsLoading, setConsentsLoading] = useState(true);
  const [revoking, setRevoking] = useState(null);

  useEffect(() => {
    api.get('/consent')
      .then(({ data }) => setConsents(data.data ?? []))
      .catch(() => setConsents([]))
      .finally(() => setConsentsLoading(false));
  }, []);

  const handleRevoke = async (consentType) => {
    if (!window.confirm(
      'Al revocar este consentimiento, tu cuenta puede quedar inhabilitada.\n¿Estas seguro?'
    )) return;
    setRevoking(consentType);
    try {
      await api.post('/consent/revoke', { consentType });
      setToast({ type: 'success', title: 'Revocado', message: `Consentimiento "${consentType}" revocado` });
      // Refrescar
      const { data } = await api.get('/consent');
      setConsents(data.data ?? []);
    } catch (err) {
      setToast({ type: 'error', title: 'Error', message: err.response?.data?.message ?? 'Error al revocar' });
    } finally {
      setRevoking(null);
    }
  };

  const handleChange = (e) =>
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (form.newPassword !== form.confirmPassword) {
      setToast({ type: 'error', title: 'Error', message: 'Las contraseñas nuevas no coinciden' });
      return;
    }
    if (form.newPassword.length < policy.minLength) {
      setToast({ type: 'error', title: 'Error', message: `La nueva contraseña debe tener al menos ${policy.minLength} caracteres` });
      return;
    }

    setLoading(true);
    try {
      await api.post('/auth/change-password', {
        currentPassword: form.currentPassword,
        newPassword:     form.newPassword,
        confirmPassword: form.confirmPassword,
      });
      setToast({ type: 'success', title: 'Listo', message: 'Contraseña cambiada correctamente' });
      setForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err) {
      const data = err.response?.data;
      const msg = data?.errors?.map((e) => e.message ?? e).join('. ') ?? data?.message ?? 'Error al cambiar la contraseña';
      setToast({ type: 'error', title: 'Error', message: msg });
    } finally {
      setLoading(false);
    }
  };

  const userRole = user?.roles?.[0] ?? '';

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-auto bg-gray-50 dark:bg-gray-900 transition-colors">
        <Navbar title="Mi perfil" />
        <main className="flex-1 p-6 max-w-2xl">

          {/* Tarjeta de info */}
          <div className="rounded-xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 shadow-sm p-6 mb-6 transition-colors">
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary-100 dark:bg-primary-900/30 text-2xl font-bold text-primary-600 dark:text-primary-400 flex-shrink-0">
                {user?.name?.charAt(0).toUpperCase()}
              </div>
              <div>
                <p className="text-lg font-bold text-gray-900 dark:text-gray-100">{user?.name}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">{user?.email}</p>
                <div className="mt-1 flex flex-wrap gap-2">
                  <span className="inline-block rounded-full bg-blue-50 dark:bg-blue-900/30 px-2 py-0.5 text-xs font-semibold text-blue-700 dark:text-blue-300">
                    {ROLE_LABELS[userRole] ?? userRole}
                  </span>
                  {user?.companyName && (
                    <span className="inline-block rounded-full bg-gray-100 dark:bg-gray-700 px-2 py-0.5 text-xs text-gray-600 dark:text-gray-300">
                      {user.companyName}
                    </span>
                  )}
                  {user?.companyPlan && (
                    <span className="inline-block rounded-full bg-purple-50 dark:bg-purple-900/30 px-2 py-0.5 text-xs text-purple-700 dark:text-purple-300">
                      {PLAN_LABELS[user.companyPlan] ?? user.companyPlan}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Formulario cambio de contraseña */}
          <div className="rounded-xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 shadow-sm p-6 transition-colors">
            <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-1">Cambiar contraseña</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-5">
              Actualiza tu contraseña periodicamente para mantener tu cuenta segura.
            </p>

            <form onSubmit={handleSubmit} className="space-y-5">
              <PasswordInput
                label="Contraseña actual"
                name="currentPassword"
                value={form.currentPassword}
                onChange={handleChange}
                required
                autoComplete="current-password"
                placeholder="Ingresa tu contraseña actual"
              />

              <div>
                <PasswordInput
                  label="Nueva contraseña"
                  name="newPassword"
                  value={form.newPassword}
                  onChange={handleChange}
                  required
                  autoComplete="new-password"
                  placeholder="Ingresa tu nueva contraseña"
                />
                <PasswordStrengthIndicator password={form.newPassword} />
              </div>

              <div>
                <PasswordInput
                  label="Confirmar nueva contraseña"
                  name="confirmPassword"
                  value={form.confirmPassword}
                  onChange={handleChange}
                  required
                  autoComplete="new-password"
                  placeholder="Repetir nueva contraseña"
                />
                {form.confirmPassword && form.newPassword !== form.confirmPassword && (
                  <p className="mt-1 text-xs text-red-500">Las contraseñas no coinciden</p>
                )}
              </div>

              <button
                type="submit"
                disabled={loading || form.newPassword.length < policy.minLength || form.newPassword !== form.confirmPassword}
                className="rounded-lg bg-primary-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-primary-700 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? 'Guardando...' : 'Cambiar contraseña'}
              </button>
            </form>
          </div>

          {/* ── Sección de consentimientos ─────────────────────────────────────── */}
          <div className="mt-6 rounded-xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 shadow-sm p-6 transition-colors">
            <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-1">Mis consentimientos</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
              Gestioná los consentimientos que otorgaste al registrarte (Ley N.° 7593/2025).
            </p>

            {consentsLoading ? (
              <div className="flex justify-center py-6">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary-500 border-t-transparent" />
              </div>
            ) : consents.length === 0 ? (
              <p className="text-sm text-gray-400 dark:text-gray-500 italic">No se encontraron registros de consentimiento.</p>
            ) : (
              <div className="space-y-3">
                {consents.map((c) => (
                  <div
                    key={c.id}
                    className={`flex items-center justify-between rounded-lg border p-4 ${
                      c.accepted
                        ? 'border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20'
                        : 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/30'
                    }`}
                  >
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                        {c.consentType === 'PRIVACY_POLICY' && 'Política de Privacidad'}
                        {c.consentType === 'TERMS_AND_CONDITIONS' && 'Términos y Condiciones'}
                        {c.consentType === 'DATA_PROCESSING' && 'Procesamiento de datos'}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                        Version {c.documentVersion} ·{' '}
                        {c.accepted
                          ? `Aceptado el ${new Date(c.acceptedAt).toLocaleDateString('es-PY')}`
                          : `Revocado el ${new Date(c.revokedAt).toLocaleDateString('es-PY')}`}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {c.accepted ? (
                        <>
                          <span className="rounded-full bg-green-100 dark:bg-green-800/40 px-2 py-0.5 text-xs font-semibold text-green-700 dark:text-green-300">
                            Activo
                          </span>
                          <button
                            onClick={() => handleRevoke(c.consentType)}
                            disabled={revoking === c.consentType}
                            className="rounded-lg border border-red-200 dark:border-red-800 px-3 py-1.5 text-xs text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition disabled:opacity-50"
                          >
                            {revoking === c.consentType ? 'Revocando...' : 'Revocar'}
                          </button>
                        </>
                      ) : (
                        <span className="rounded-full bg-gray-200 dark:bg-gray-600 px-2 py-0.5 text-xs font-semibold text-gray-600 dark:text-gray-300">
                          Revocado
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            <p className="mt-4 text-xs text-gray-400 dark:text-gray-500 leading-relaxed">
              Tenes derecho a acceder, rectificar, cancelar u oponerte al tratamiento de tus datos (derechos ARCO).
              Si revocás un consentimiento esencial, tu cuenta puede quedar inhabilitada.
            </p>
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
