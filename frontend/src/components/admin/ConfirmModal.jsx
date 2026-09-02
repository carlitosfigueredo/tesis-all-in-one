import { createPortal } from 'react-dom';

/**
 * Modal de confirmación reutilizable para acciones del panel admin.
 *
 * Props:
 *   open: boolean — controla la visibilidad
 *   title: string
 *   message: string (opcional) — descripción principal
 *   children: contenido custom (inputs, etc.) que va debajo del mensaje
 *   confirmLabel: string (default 'Confirmar')
 *   cancelLabel: string (default 'Cancelar')
 *   tone: 'danger' | 'primary' | 'warning' (color del botón confirmar)
 *   loading: boolean — muestra spinner y deshabilita botones
 *   confirmDisabled: boolean — deshabilita el botón confirmar
 *   onConfirm: () => void
 *   onClose: () => void
 */

const TONES = {
  danger:  'bg-red-600 hover:bg-red-700',
  primary: 'bg-blue-600 hover:bg-blue-700',
  warning: 'bg-amber-600 hover:bg-amber-700',
};

export default function ConfirmModal({
  open,
  title,
  message,
  children,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  tone = 'primary',
  loading = false,
  confirmDisabled = false,
  onConfirm,
  onClose,
}) {
  if (!open) return null;

  const confirmColor = TONES[tone] || TONES.primary;

  return createPortal(
    <div className="fixed inset-0 z-[9998] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40"
        onClick={loading ? undefined : onClose}
        aria-hidden="true"
      />

      {/* Card */}
      <div
        className="relative w-full max-w-md rounded-2xl bg-white shadow-2xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-modal-title"
      >
        <div className="p-6">
          <h3 id="confirm-modal-title" className="text-base font-bold text-gray-900">
            {title}
          </h3>
          {message && (
            <p className="mt-2 text-sm text-gray-600 leading-relaxed">{message}</p>
          )}

          {children && <div className="mt-4">{children}</div>}
        </div>

        <div className="flex justify-end gap-2 border-t border-gray-100 px-6 py-4">
          <button
            onClick={onClose}
            disabled={loading}
            className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 transition hover:bg-gray-50 disabled:opacity-50"
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            disabled={loading || confirmDisabled}
            className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-white transition disabled:opacity-50 ${confirmColor}`}
          >
            {loading && (
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
            )}
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
