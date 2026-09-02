import { useEffect, useState, useCallback } from 'react';
import AdminSidebar from '../../components/admin/AdminSidebar';
import ConfirmModal from '../../components/admin/ConfirmModal';
import Toast from '../../components/Toast';
import api from '../../services/api';

const PLAN_COLORS = {
  BASICO:      'bg-gray-100 text-gray-700',
  PROFESIONAL: 'bg-blue-100 text-blue-700',
  CORPORATIVO: 'bg-purple-100 text-purple-700',
};

const STATUS_META = {
  ACTIVE:          { label: 'Activa',            color: 'text-green-600',  dot: 'bg-green-500' },
  TRIAL:           { label: 'Prueba',            color: 'text-blue-600',   dot: 'bg-blue-500' },
  PENDING_PAYMENT: { label: 'Pago pendiente',    color: 'text-amber-600',  dot: 'bg-amber-500' },
  SUSPENDED:       { label: 'Suspendida',        color: 'text-red-600',    dot: 'bg-red-500' },
};

// plan_config.id que espera el backend para cambiar de plan
const PLAN_OPTIONS = [
  { id: 'ESTANDAR',    label: 'Básico (Estándar)' },
  { id: 'PROFESIONAL', label: 'Profesional' },
  { id: 'CORPORATIVO', label: 'Corporativo' },
];

function StatusBadge({ status }) {
  const meta = STATUS_META[status] ?? { label: status ?? '—', color: 'text-gray-400', dot: 'bg-gray-300' };
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-medium ${meta.color}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${meta.dot} inline-block`} />
      {meta.label}
    </span>
  );
}

function ExpiryLabel({ subscription }) {
  if (!subscription) return <span className="text-xs text-gray-300">Sin suscripción</span>;
  const { daysRemaining, currentPeriodEnd } = subscription;
  const dateStr = new Date(currentPeriodEnd).toLocaleDateString('es-PY');

  if (daysRemaining < 0) {
    return <span className="text-xs font-medium text-red-600">Vencida ({dateStr})</span>;
  }
  if (daysRemaining <= 7) {
    return <span className="text-xs font-medium text-amber-600">Vence en {daysRemaining}d ({dateStr})</span>;
  }
  return <span className="text-xs text-gray-500">{daysRemaining}d ({dateStr})</span>;
}

export default function AdminCompanies() {
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading]     = useState(true);
  const [filterPlan, setFilterPlan]     = useState('');
  const [filterActive, setFilterActive] = useState('');

  // Detalle
  const [detail, setDetail]           = useState(null);   // empresa expandida
  const [detailLoading, setDetailLoading] = useState(false);

  // Acciones / modales
  const [modal, setModal]   = useState(null); // { type, ... }
  const [busy, setBusy]     = useState(false);
  const [toast, setToast]   = useState(null);

  // Form states de las acciones
  const [planChoice, setPlanChoice]   = useState('PROFESIONAL');
  const [extendMonths, setExtendMonths] = useState(1);
  const [statusChoice, setStatusChoice] = useState('ACTIVE');

  const fetchCompanies = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (filterPlan)   params.set('plan', filterPlan);
    if (filterActive) params.set('active', filterActive);

    api.get(`/admin/companies?${params.toString()}`)
      .then(({ data }) => setCompanies(data.data))
      .catch(() => setToast({ type: 'error', title: 'Error', message: 'No se pudieron cargar las empresas.' }))
      .finally(() => setLoading(false));
  }, [filterPlan, filterActive]);

  useEffect(() => { fetchCompanies(); }, [fetchCompanies]);

  const openDetail = async (companyId) => {
    setDetailLoading(true);
    setDetail({ id: companyId }); // placeholder para abrir el panel
    try {
      const { data } = await api.get(`/admin/companies/${companyId}`);
      setDetail(data.data);
      setStatusChoice(data.data.status ?? 'ACTIVE');
    } catch {
      setToast({ type: 'error', title: 'Error', message: 'No se pudo cargar el detalle de la empresa.' });
      setDetail(null);
    } finally {
      setDetailLoading(false);
    }
  };

  const closeDetail = () => setDetail(null);

  const refreshDetail = async () => {
    if (!detail?.id) return;
    const { data } = await api.get(`/admin/companies/${detail.id}`);
    setDetail(data.data);
  };

  // ── Acciones ────────────────────────────────────────────────────────────────

  const runAction = async (fn, successMsg) => {
    setBusy(true);
    try {
      await fn();
      setToast({ type: 'success', title: 'Listo', message: successMsg });
      setModal(null);
      await refreshDetail();
      fetchCompanies();
    } catch (err) {
      setToast({ type: 'error', title: 'Error', message: err.response?.data?.message ?? 'No se pudo completar la acción.' });
    } finally {
      setBusy(false);
    }
  };

  const doChangePlan = () =>
    runAction(
      () => api.patch(`/admin/companies/${detail.id}/plan`, { plan: planChoice }),
      'Plan actualizado correctamente.'
    );

  const doExtend = () =>
    runAction(
      () => api.post(`/admin/companies/${detail.id}/subscription/extend`, { months: Number(extendMonths) }),
      `Suscripción extendida ${extendMonths} mes(es).`
    );

  const doChangeStatus = () =>
    runAction(
      () => api.patch(`/admin/companies/${detail.id}/status`, { status: statusChoice }),
      'Estado de la empresa actualizado.'
    );

  const doUnlock = (userId) =>
    runAction(
      () => api.post(`/admin/users/${userId}/unlock`),
      'Cuenta desbloqueada.'
    );

  return (
    <div className="flex h-screen overflow-hidden">
      <AdminSidebar />

      <div className="flex flex-1 flex-col overflow-auto bg-gray-50">
        <header className="bg-white border-b border-gray-100 px-8 py-4 flex items-center justify-between">
          <h1 className="text-lg font-bold text-gray-900">Empresas cliente</h1>
          <span className="text-sm text-gray-400">{companies.length} empresa(s)</span>
        </header>

        <main className="flex-1 p-8">
          {/* Filtros */}
          <div className="mb-5 flex flex-wrap gap-3">
            <select
              value={filterPlan}
              onChange={(e) => setFilterPlan(e.target.value)}
              className="rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:border-gray-400"
            >
              <option value="">Todos los planes</option>
              <option value="BASICO">Básico</option>
              <option value="PROFESIONAL">Profesional</option>
              <option value="CORPORATIVO">Corporativo</option>
            </select>
            <select
              value={filterActive}
              onChange={(e) => setFilterActive(e.target.value)}
              className="rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:border-gray-400"
            >
              <option value="">Todos los estados</option>
              <option value="true">Activas</option>
              <option value="false">Inactivas</option>
            </select>
          </div>

          {/* Tabla */}
          <div className="rounded-xl bg-white border border-gray-100 shadow-sm overflow-hidden">
            {loading ? (
              <div className="flex justify-center py-20">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-900 border-t-transparent" />
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-xs uppercase text-gray-500">
                  <tr>
                    <th className="px-5 py-3 text-left">Empresa</th>
                    <th className="px-5 py-3 text-left">Plan</th>
                    <th className="px-5 py-3 text-left">Empleados</th>
                    <th className="px-5 py-3 text-left">Estado</th>
                    <th className="px-5 py-3 text-left">Vencimiento</th>
                    <th className="px-5 py-3 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {companies.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-5 py-10 text-center text-sm text-gray-400">
                        No se encontraron empresas con los filtros aplicados.
                      </td>
                    </tr>
                  ) : companies.map((c) => (
                    <tr key={c.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-5 py-3 font-medium text-gray-900">{c.name}</td>
                      <td className="px-5 py-3">
                        <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${PLAN_COLORS[c.plan]}`}>
                          {c.plan}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-gray-600 tabular-nums">{c.employeeCount}</td>
                      <td className="px-5 py-3"><StatusBadge status={c.status} /></td>
                      <td className="px-5 py-3"><ExpiryLabel subscription={c.subscription} /></td>
                      <td className="px-5 py-3 text-right">
                        <button
                          onClick={() => openDetail(c.id)}
                          className="rounded-lg border border-gray-200 px-3 py-1 text-xs font-medium text-gray-600 transition hover:bg-gray-100"
                        >
                          Gestionar
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </main>
      </div>

      {/* Panel de detalle (drawer) */}
      {detail && (
        <div className="fixed inset-0 z-[9997] flex justify-end">
          <div className="absolute inset-0 bg-black/30" onClick={closeDetail} aria-hidden="true" />
          <div className="relative h-full w-full max-w-md overflow-y-auto bg-white shadow-2xl">
            <div className="sticky top-0 flex items-center justify-between border-b border-gray-100 bg-white px-6 py-4">
              <h2 className="text-base font-bold text-gray-900">Gestión de empresa</h2>
              <button
                onClick={closeDetail}
                className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                aria-label="Cerrar"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {detailLoading || !detail.name ? (
              <div className="flex justify-center py-20">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-900 border-t-transparent" />
              </div>
            ) : (
              <div className="space-y-6 p-6">
                {/* Resumen */}
                <div>
                  <h3 className="text-lg font-bold text-gray-900">{detail.name}</h3>
                  <div className="mt-2 flex flex-wrap items-center gap-3">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${PLAN_COLORS[detail.plan]}`}>
                      {detail.plan}
                    </span>
                    <StatusBadge status={detail.status} />
                  </div>
                  {detail.subscriptionStatus && (
                    <div className="mt-3 rounded-lg bg-gray-50 p-3 text-sm">
                      <ExpiryLabel subscription={detail.subscriptionStatus} />
                    </div>
                  )}
                </div>

                {/* Cambiar plan */}
                <section className="space-y-2">
                  <h4 className="text-xs font-semibold uppercase text-gray-500">Cambiar plan</h4>
                  <div className="flex gap-2">
                    <select
                      value={planChoice}
                      onChange={(e) => setPlanChoice(e.target.value)}
                      className="flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-blue-400 focus:outline-none"
                    >
                      {PLAN_OPTIONS.map((p) => (
                        <option key={p.id} value={p.id}>{p.label}</option>
                      ))}
                    </select>
                    <button
                      onClick={() => setModal({ type: 'plan' })}
                      className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700"
                    >
                      Aplicar
                    </button>
                  </div>
                </section>

                {/* Extender suscripción */}
                <section className="space-y-2">
                  <h4 className="text-xs font-semibold uppercase text-gray-500">Extender suscripción</h4>
                  <div className="flex gap-2">
                    <select
                      value={extendMonths}
                      onChange={(e) => setExtendMonths(e.target.value)}
                      className="flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-blue-400 focus:outline-none"
                    >
                      {[1, 2, 3, 6, 12].map((m) => (
                        <option key={m} value={m}>{m} mes{m > 1 ? 'es' : ''}</option>
                      ))}
                    </select>
                    <button
                      onClick={() => setModal({ type: 'extend' })}
                      className="rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-green-700"
                    >
                      Renovar
                    </button>
                  </div>
                </section>

                {/* Cambiar estado */}
                <section className="space-y-2">
                  <h4 className="text-xs font-semibold uppercase text-gray-500">Estado de la cuenta</h4>
                  <div className="flex gap-2">
                    <select
                      value={statusChoice}
                      onChange={(e) => setStatusChoice(e.target.value)}
                      className="flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-blue-400 focus:outline-none"
                    >
                      <option value="ACTIVE">Activa</option>
                      <option value="SUSPENDED">Suspendida</option>
                      <option value="TRIAL">Prueba</option>
                      <option value="PENDING_PAYMENT">Pago pendiente</option>
                    </select>
                    <button
                      onClick={() => setModal({ type: 'status' })}
                      className="rounded-lg bg-gray-800 px-4 py-2 text-sm font-semibold text-white transition hover:bg-gray-900"
                    >
                      Guardar
                    </button>
                  </div>
                </section>

                {/* Usuarios */}
                <section className="space-y-2">
                  <h4 className="text-xs font-semibold uppercase text-gray-500">
                    Usuarios ({detail.users?.length ?? 0})
                  </h4>
                  <div className="divide-y divide-gray-100 rounded-lg border border-gray-100">
                    {(detail.users ?? []).map((u) => (
                      <div key={u.id} className="flex items-center justify-between px-3 py-2.5">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-gray-800">{u.name}</p>
                          <p className="truncate text-xs text-gray-400">{u.email}</p>
                        </div>
                        {u.isLocked ? (
                          <button
                            onClick={() => setModal({ type: 'unlock', userId: u.id, userName: u.name })}
                            className="flex-shrink-0 rounded-lg border border-amber-200 px-3 py-1 text-xs font-medium text-amber-700 transition hover:bg-amber-50"
                          >
                            Bloqueada · Desbloquear
                          </button>
                        ) : (
                          <span className="flex-shrink-0 text-xs text-green-600">Activa</span>
                        )}
                      </div>
                    ))}
                  </div>
                </section>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modales de confirmación por acción */}
      <ConfirmModal
        open={modal?.type === 'plan'}
        title="Cambiar plan"
        message={`¿Cambiar el plan de ${detail?.name} a ${PLAN_OPTIONS.find(p => p.id === planChoice)?.label}? El cambio es inmediato y no genera un cobro.`}
        tone="primary"
        confirmLabel="Cambiar plan"
        loading={busy}
        onConfirm={doChangePlan}
        onClose={() => !busy && setModal(null)}
      />

      <ConfirmModal
        open={modal?.type === 'extend'}
        title="Extender suscripción"
        message={`¿Extender la suscripción de ${detail?.name} por ${extendMonths} mes(es)? Esto reactiva la empresa si estaba suspendida.`}
        tone="primary"
        confirmLabel="Renovar"
        loading={busy}
        onConfirm={doExtend}
        onClose={() => !busy && setModal(null)}
      />

      <ConfirmModal
        open={modal?.type === 'status'}
        title="Cambiar estado"
        message={`¿Cambiar el estado de ${detail?.name} a "${STATUS_META[statusChoice]?.label ?? statusChoice}"?`}
        tone={statusChoice === 'SUSPENDED' ? 'danger' : 'primary'}
        confirmLabel="Guardar"
        loading={busy}
        onConfirm={doChangeStatus}
        onClose={() => !busy && setModal(null)}
      />

      <ConfirmModal
        open={modal?.type === 'unlock'}
        title="Desbloquear cuenta"
        message={`¿Desbloquear la cuenta de ${modal?.userName}? Se reiniciarán los intentos fallidos.`}
        tone="warning"
        confirmLabel="Desbloquear"
        loading={busy}
        onConfirm={() => doUnlock(modal.userId)}
        onClose={() => !busy && setModal(null)}
      />

      {toast && (
        <Toast
          type={toast.type}
          title={toast.title}
          message={toast.message}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
}
