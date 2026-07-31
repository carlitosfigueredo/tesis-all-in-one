import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

/**
 * Toast notification component - estilo sweet alert pero nativo con Tailwind.
 * Se renderiza como portal en el body para estar siempre encima de todo.
 *
 * Props:
 *   type: 'error' | 'success' | 'warning' | 'info'
 *   title: string (titulo principal)
 *   message: string (descripcion)
 *   duration: number (ms, default 5000, 0 = no auto-cerrar)
 *   onClose: () => void
 *   position: 'top' | 'bottom' (default 'top')
 */

const VARIANTS = {
  error: {
    gradient: 'from-red-500 to-rose-600',
    bg: 'bg-white',
    ring: 'ring-red-100',
    iconBg: 'bg-red-100',
    iconColor: 'text-red-600',
    titleColor: 'text-red-900',
    msgColor: 'text-red-700',
    progressBar: 'bg-red-400',
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
      </svg>
    ),
  },
  success: {
    gradient: 'from-green-500 to-emerald-600',
    bg: 'bg-white',
    ring: 'ring-green-100',
    iconBg: 'bg-green-100',
    iconColor: 'text-green-600',
    titleColor: 'text-green-900',
    msgColor: 'text-green-700',
    progressBar: 'bg-green-400',
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  warning: {
    gradient: 'from-amber-500 to-orange-500',
    bg: 'bg-white',
    ring: 'ring-amber-100',
    iconBg: 'bg-amber-100',
    iconColor: 'text-amber-600',
    titleColor: 'text-amber-900',
    msgColor: 'text-amber-700',
    progressBar: 'bg-amber-400',
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  info: {
    gradient: 'from-blue-500 to-indigo-600',
    bg: 'bg-white',
    ring: 'ring-blue-100',
    iconBg: 'bg-blue-100',
    iconColor: 'text-blue-600',
    titleColor: 'text-blue-900',
    msgColor: 'text-blue-700',
    progressBar: 'bg-blue-400',
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
};

export default function Toast({ type = 'error', title, message, duration = 5000, onClose, position = 'top' }) {
  const [visible, setVisible] = useState(false);
  const [exiting, setExiting] = useState(false);
  const [progress, setProgress] = useState(100);
  const v = VARIANTS[type] || VARIANTS.error;

  // Entrada animada
  useEffect(() => {
    const timer = setTimeout(() => setVisible(true), 50);
    return () => clearTimeout(timer);
  }, []);

  // Progress bar + auto-cerrar
  useEffect(() => {
    if (!duration || duration <= 0) return;

    const interval = 50; // actualizar cada 50ms
    const decrement = (interval / duration) * 100;
    const timer = setInterval(() => {
      setProgress((prev) => {
        const next = prev - decrement;
        if (next <= 0) {
          clearInterval(timer);
          handleClose();
          return 0;
        }
        return next;
      });
    }, interval);

    return () => clearInterval(timer);
  }, [duration]);

  const handleClose = () => {
    setExiting(true);
    setTimeout(() => onClose?.(), 300);
  };

  const positionClasses = position === 'top'
    ? 'top-6 left-1/2 -translate-x-1/2'
    : 'bottom-6 left-1/2 -translate-x-1/2';

  const animationClasses = visible && !exiting
    ? 'opacity-100 scale-100 translate-y-0'
    : position === 'top'
    ? 'opacity-0 scale-95 -translate-y-4'
    : 'opacity-0 scale-95 translate-y-4';

  return createPortal(
    <div
      className={`fixed ${positionClasses} z-[9999] w-full max-w-md px-4 transition-all duration-300 ease-out ${animationClasses}`}
      role="alert"
      aria-live="assertive"
    >
      <div className={`${v.bg} rounded-2xl shadow-2xl ring-1 ${v.ring} overflow-hidden`}>
        {/* Barra de color superior */}
        <div className={`h-1.5 bg-gradient-to-r ${v.gradient}`} />

        <div className="p-4">
          <div className="flex items-start gap-3">
            {/* Icono */}
            <div className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl ${v.iconBg} ${v.iconColor}`}>
              {v.icon}
            </div>

            {/* Contenido */}
            <div className="flex-1 min-w-0 pt-0.5">
              {title && (
                <p className={`text-sm font-bold ${v.titleColor}`}>{title}</p>
              )}
              {message && (
                <p className={`mt-0.5 text-sm ${v.msgColor} leading-relaxed`}>{message}</p>
              )}
            </div>

            {/* Boton cerrar */}
            <button
              onClick={handleClose}
              className="flex-shrink-0 rounded-lg p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
              aria-label="Cerrar"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Barra de progreso */}
        {duration > 0 && (
          <div className="h-1 bg-gray-100">
            <div
              className={`h-full ${v.progressBar} transition-all duration-100 ease-linear rounded-full`}
              style={{ width: `${progress}%` }}
            />
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}
