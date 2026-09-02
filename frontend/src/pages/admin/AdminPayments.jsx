// Panel SUPER_ADMIN — Historial de pagos de todas las empresas
import { useEffect, useState } from 'react';
import AdminSidebar from '../../components/admin/AdminSidebar';
import ConfirmModal from '../../components/admin/ConfirmModal';
import Toast from '../../components/Toast';
import api from '../../services/api';

const STATUS_BADGE = {
  APPROVED: 'bg-green-100 text-green-700',
  PENDING:  'bg-amber-100 text-amber-700',
  REJECTED: 'bg-red-100 text-red-700',
  REFUNDED: 'bg-purple-100 text-purple-700',
};

const STATUS_LABEL = {
  APPROVED: 'Aprobado',
  PENDING:  'Pendiente',
  REJECTED: 'Rechazado',
  REFUNDED: 'Reembolsado',
};

const formatGs = (n) => `Gs. ${Number(n).toLocaleString('es-PY')}`;

export default function AdminPayments() {
  const [payments, setPayments] = useState([]);
  const [total, setTotal]       = useState(0);
  const [page, setPage]         = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading]   = useState(true);
  const [filters, setFilters]   = useState({ status: '', companyId: '' });

  // Refund
  const [refundTarget, setRefundTarget] = useState(null); // payment seleccionado
  const [refundForm, setRefundForm]     = useState({ amountPyg: '', reason: '', suspendCompany: false });
  const [refunding, setRefunding]       = useState(false);
  const [toast, setToast]               = useState(null);

  const openRefund = (payment) => {
    setRefundForm({ amountPyg: '', reason: '', suspendCompany: false });
    setRefundTarget(payment);
  };

  const closeRefund = () => {
    if (refunding) return;
    setRefundTarget(null);
  };

  const submitRefund = async () => {
    if (!refundTarget) return;
    setRefunding(true);
    try {
      const body = {};
      if (refundForm.amountPyg) body.amountPyg = parseInt(refundForm.amountPyg, 10);
      if (refundForm.reason)    body.reason = refundForm.reason;
      if (refundForm.suspendCompany) body.suspendCompany = true;

      await api.post(`/admin/payments/${refundTarget.id}/refund`, body);
      setToast({ type: 'success', title: 'Reembolso procesado', message: 'El pago fue reembolsado correctamente.' });
      setRefundTarget(null);
      fetchPayments(page);
    } catch (err) {
      setToast({
        type: 'error',
        title: 'No se pudo reembolsar',
        message: err.response?.data?.message ?? 'Error al procesar el reembolso.',
      });
    } finally {
      setRefunding(false);
    }
  };

  const fetchPayments = async (pg = 1) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('page', pg);
      params.set('pageSize', '15');
      if (filters.status) params.set('status', filters.status);
      if (filters.companyId) params.set('companyId', filters.companyId);

      const { data } = await api.get(`/admin/payments?${params.toString()}`);
      setPayments(data.data ?? []);
      setTotal(data.total ?? 0);
      setPage(data.page ?? 1);
      setTotalPages(data.total_pages ?? 1);
    } catch {
      setPayments([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchPayments(1); }, [filters]);

  // Totales rápidos
  const totalApproved = payments.filter(p => p.status === 'APPROVED').length;
  const sumApproved = payments
    .filter(p => p.status === 'APPROVED')
    .reduce((acc, p) => acc + (p.amount || 0), 0);

  return (
    <div className="flex h-screen overflow-hidden">
      <AdminSidebar />
      <div className="flex flex-1 flex-col overflow-auto bg-gray-50">
        {/* Header */}
        <header className="flex h-16 items-center justify-between border-b border-gray-200 bg-white px-6 flex-shrink-0">
          <div>
            <h1 className="text-base font-semibold text-gray-800">Pagos</h1>
            <p className="text-xs text-gray-400">{total} pagos registrados en total</p>
          </div>
        </header>

        <main className="flex-1 p-6 space-y-5">

          {/* KPIs rápidos */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="rounded-xl bg-white border border-gray-100 p-4">
              <p className="text-xs text-gray-500 font-medium">Total pagos</p>
              <p className="text-2xl font-bold text-gray-900">{total}</p>
            </div>
            <div className="rounded-xl bg-green-50 border border-green-100 p-4">
              <p className="text-xs text-green-600 font-medium">Aprobados (página)</p>
              <p className="text-2xl font-bold text-green-700">{totalApproved}</p>
            </div>
            <div className="rounded-xl bg-blue-50 border border-blue-100 p-4">
              <p className="text-xs text-blue-600 font-medium">Recaudado (página)</p>
              <p className="text-lg font-bold text-blue-700">{formatGs(sumApproved)}</p>
            </div>
            <div className="rounded-xl bg-gray-50 border border-gray-200 p-4">
              <p className="text-xs text-gray-500 font-medium">Página</p>
              <p className="text-2xl font-bold text-gray-700">{page} / {totalPages}</p>
            </div>
          </div>

          {/* Filtros */}
          <div className="flex flex-wrap gap-3">
            <select
              value={filters.status}
              onChange={(e) => setFilters(f => ({ ...f, status: e.target.value }))}
              className="rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-blue-400 focus:outline-none"
            >
              <option value="">Todos los estados</option>
              <option value="APPROVED">Aprobados</option>
              <option value="PENDING">Pendientes</option>
              <option value="REJECTED">Rechazados</option>
              <option value="REFUNDED">Reembolsados</option>
            </select>
            <input
              type="text"
              placeholder="Filtrar por ID de empresa..."
              value={filters.companyId}
              onChange={(e) => setFilters(f => ({ ...f, companyId: e.target.value }))}
              className="rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-blue-400 focus:outline-none w-64"
            />
          </div>

          {/* Tabla de pagos */}
          <div className="rounded-xl bg-white border border-gray-100 shadow-sm overflow-hidden">
            {loading ? (
              <div className="flex justify-center py-16">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent" />
              </div>
            ) : payments.length === 0 ? (
              <div className="py-16 text-center text-sm text-gray-400">No se encontraron pagos</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-xs uppercase text-gray-500">
                    <tr>
                      <th className="px-4 py-3 text-left">Fecha</th>
                      <th className="px-4 py-3 text-left">Empresa</th>
                      <th className="px-4 py-3 text-left">Concepto</th>
                      <th className="px-4 py-3 text-left">Método</th>
                      <th className="px-4 py-3 text-right">Monto</th>
                      <th className="px-4 py-3 text-left">Estado</th>
                      <th className="px-4 py-3 text-left">ID</th>
                      <th className="px-4 py-3 text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {payments.map((p) => (
                      <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3 text-gray-600 whitespace-nowrap">
                          {new Date(p.createdAt).toLocaleString('es-PY', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </td>
                        <td className="px-4 py-3 font-medium text-gray-900">
                          {p.company?.name ?? '—'}
                        </td>
                        <td className="px-4 py-3 text-gray-600 text-xs max-w-[200px] truncate">
                          {p.description || 'Suscripción'}
                        </td>
                        <td className="px-4 py-3 text-gray-500">
                          {p.paymentMethod === 'paypal' ? 'PayPal'
                            : p.paymentMethod === 'adamspay' ? 'AdamsPay'
                            : p.paymentMethod ?? '—'}
                          {p.cardLast4 && <span className="text-xs text-gray-400 ml-1">··{p.cardLast4}</span>}
                        </td>
                        <td className="px-4 py-3 text-right font-semibold text-gray-900 tabular-nums whitespace-nowrap">
                          {p.currency === 'PYG' ? formatGs(p.amount) : `USD ${p.amount}`}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-semibold ${STATUS_BADGE[p.status] ?? 'bg-gray-100 text-gray-600'}`}>
                            {STATUS_LABEL[p.status] ?? p.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-400 font-mono">
                          {p.id.slice(-8)}
                        </td>
                        <td className="px-4 py-3 text-right">
                          {p.status === 'APPROVED' && p.paypalCaptureId ? (
                            <button
                              onClick={() => openRefund(p)}
                              className="rounded-lg border border-red-200 px-3 py-1 text-xs font-medium text-red-600 transition hover:bg-red-50"
                            >
                              Reembolsar
                            </button>
                          ) : (
                            <span className="text-xs text-gray-300">—</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Paginación */}
            {!loading && totalPages > 1 && (
              <div className="flex items-center justify-between border-t border-gray-100 px-4 py-3 text-sm text-gray-500">
                <span>Página {page} de {totalPages} · {total} resultados</span>
                <div className="flex gap-2">
                  <button
                    onClick={() => fetchPayments(page - 1)}
                    disabled={page <= 1}
                    className="rounded px-3 py-1 hover:bg-gray-100 disabled:opacity-40"
                  >
                    ← Anterior
                  </button>
                  <button
                    onClick={() => fetchPayments(page + 1)}
                    disabled={page >= totalPages}
                    className="rounded px-3 py-1 hover:bg-gray-100 disabled:opacity-40"
                  >
                    Siguiente →
                  </button>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>

      {/* Modal de reembolso */}
      <ConfirmModal
        open={!!refundTarget}
        title="Reembolsar pago"
        message={refundTarget
          ? `Vas a reembolsar el pago de ${refundTarget.company?.name ?? 'la empresa'} por ${formatGs(refundTarget.amount)}. Esta acción devuelve el dinero al comprador vía PayPal y no se puede deshacer.`
          : ''}
        tone="danger"
        confirmLabel="Reembolsar"
        loading={refunding}
        onConfirm={submitRefund}
        onClose={closeRefund}
      >
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Monto parcial (Gs.) — opcional
            </label>
            <input
              type="number"
              min="1"
              max={refundTarget?.amount}
              value={refundForm.amountPyg}
              onChange={(e) => setRefundForm(f => ({ ...f, amountPyg: e.target.value }))}
              placeholder={refundTarget ? `Total: ${refundTarget.amount}` : ''}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-blue-400 focus:outline-none"
            />
            <p className="mt-1 text-xs text-gray-400">Dejá vacío para reembolso total.</p>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Motivo — opcional</label>
            <input
              type="text"
              value={refundForm.reason}
              onChange={(e) => setRefundForm(f => ({ ...f, reason: e.target.value }))}
              placeholder="Ej: solicitud del cliente"
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-blue-400 focus:outline-none"
            />
          </div>

          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={refundForm.suspendCompany}
              onChange={(e) => setRefundForm(f => ({ ...f, suspendCompany: e.target.checked }))}
              className="rounded border-gray-300"
            />
            Suspender la empresa tras el reembolso
          </label>
        </div>
      </ConfirmModal>

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
