import { useEffect, useState } from 'react';

/**
 * Componente de alerta con animacion de entrada, icono y boton de cerrar.
 *
 * Props:
 *   type: 'error' | 'success' | 'warning' | 'info'
 *   message: string (mensaje principal)
 *   messages: string[] (lista de mensajes, alternativa a message)
 *   onClose: () => void (callback al cerrar)
 *   autoClose: number | false (ms para cerrar automáticamente, default false)
 */

const VARIANTS = {
  error: {
    bg: 'bg-red-50',
    border: 'border-red-200',
    text: 'text-red-800',
    subtext: 'text-red-600',
    iconBg: 'bg-red-100',
    iconColor: 'text-red-500',
    closeHover: 'hover:bg-red-100',
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
      </svg>
    ),
  },
  success: {
    bg: 'bg-green-50',
    border: 'border-green-200',
    text: 'text-green-800',
    subtext: 'text-green-600',
    iconBg: 'bg-green-100',
    iconColor: 'text-green-500',
    closeHover: 'hover:bg-green-100',
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  warning: {
    bg: 'bg-amber-50',
    border: 'border-amber-200',
    text: 'text-amber-800',
    subtext: 'text-amber-600',
    iconBg: 'bg-amber-100',
    iconColor: 'text-amber-500',
    closeHover: 'hover:bg-amber-100',
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  info: {
    bg: 'bg-blue-50',
    border: 'border-blue-200',
    text: 'text-blue-800',
    subtext: 'text-blue-600',
    iconBg: 'bg-blue-100',
    iconColor: 'text-blue-500',
    closeHover: 'hover:bg-blue-100',
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
};

export default function AlertMessage({ type = 'error', message, messages, onClose, autoClose = false }) {
  const [visible, setVisible] = useState(false);
  const [exiting, setExiting] = useState(false);
  const v = VARIANTS[type] || VARIANTS.error;

  // Animar entrada
  useEffect(() => {
    const timer = setTimeout(() => setVisible(true), 10);
    return () => clearTimeout(timer);
  }, []);

  // Auto-cerrar
  useEffect(() => {
    if (autoClose && autoClose > 0) {
      const timer = setTimeout(() => handleClose(), autoClose);
      return () => clearTimeout(timer);
    }
  }, [autoClose]);

  const handleClose = () => {
    setExiting(true);
    setTimeout(() => {
      onClose?.();
    }, 200);
  };

  // Si no hay mensaje, no renderizar
  if (!message && (!messages || messages.length === 0)) return null;

  return (
    <div
      className={`rounded-xl border ${v.bg} ${v.border} p-4 transition-all duration-200 ease-out
        ${visible && !exiting ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2'}
      `}
      role="alert"
    >
      <div className="flex items-start gap-3">
        {/* Icono */}
        <div className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg ${v.iconBg} ${v.iconColor}`}>
          {v.icon}
        </div>

        {/* Contenido */}
        <div className="flex-1 min-w-0">
          {message && (
            <p className={`text-sm font-medium ${v.text}`}>{message}</p>
          )}
          {messages && messages.length > 0 && (
            <ul className={`mt-1 space-y-0.5 text-sm ${v.subtext}`}>
              {messages.map((msg, i) => (
                <li key={i} className="flex items-start gap-1.5">
                  <span className="mt-1.5 h-1 w-1 rounded-full bg-current flex-shrink-0" />
                  {msg}
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Boton cerrar */}
        {onClose && (
          <button
            onClick={handleClose}
            className={`flex-shrink-0 rounded-lg p-1 ${v.subtext} ${v.closeHover} transition-colors`}
            aria-label="Cerrar"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
}
