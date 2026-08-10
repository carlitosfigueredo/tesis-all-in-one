import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

const STORAGE_KEY = 'cookie-consent-accepted';

/**
 * Banner de consentimiento de cookies.
 * Solo usa cookies técnicas/de sesión, por lo que es un aviso informativo
 * con opción de aceptar (Ley 7593/2025 Paraguay, articulo sobre cookies).
 */
export default function CookieConsent() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Mostrar solo si no se ha aceptado antes
    const accepted = localStorage.getItem(STORAGE_KEY);
    if (!accepted) {
      // Delay para no distraer al cargar
      const timer = setTimeout(() => setVisible(true), 1500);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleAccept = () => {
    localStorage.setItem(STORAGE_KEY, new Date().toISOString());
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="fixed bottom-0 inset-x-0 z-50 p-4 pointer-events-none">
      <div className="pointer-events-auto mx-auto max-w-2xl rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 shadow-lg transition-all animate-[slideUp_0.3s_ease-out]">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
          {/* Icono */}
          <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-blue-50 dark:bg-blue-900/30">
            <svg className="h-5 w-5 text-blue-600 dark:text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>

          {/* Texto */}
          <div className="flex-1 min-w-0">
            <p className="text-sm text-gray-700 dark:text-gray-200">
              Este sitio utiliza <strong>cookies técnicas</strong> necesarias para el funcionamiento del sistema.
              No usamos cookies de rastreo ni publicidad.
            </p>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Mas info en nuestra{' '}
              <Link to="/privacy" className="text-blue-600 dark:text-blue-400 underline hover:text-blue-800">
                Politica de Privacidad
              </Link>
              .
            </p>
          </div>

          {/* Botón */}
          <button
            onClick={handleAccept}
            className="flex-shrink-0 rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-700 transition-colors"
          >
            Aceptar
          </button>
        </div>
      </div>
    </div>
  );
}
