// Indicador visual de fortaleza de contrasena
// Uso: <PasswordStrengthIndicator password={value} />

const LEVELS = [
  { label: 'Muy débil',  color: 'bg-red-500',    text: 'text-red-600'    },
  { label: 'Débil',      color: 'bg-orange-400',  text: 'text-orange-600' },
  { label: 'Regular',    color: 'bg-yellow-400',  text: 'text-yellow-600' },
  { label: 'Fuerte',     color: 'bg-blue-500',    text: 'text-blue-600'   },
  { label: 'Muy fuerte', color: 'bg-green-500',   text: 'text-green-600'  },
];

const RULES = [
  { label: 'Al menos 8 caracteres',          test: (p) => p.length >= 8 },
  { label: 'Una letra mayúscula',             test: (p) => /[A-Z]/.test(p) },
  { label: 'Una letra minúscula',             test: (p) => /[a-z]/.test(p) },
  { label: 'Un número',                       test: (p) => /[0-9]/.test(p) },
  { label: 'Un carácter especial (!@#$%^&*)', test: (p) => /[!@#$%^&*()\-_=+[\]{}|;:'",.<>?/\\`~]/.test(p) },
];

const getScore = (password) => {
  if (!password || password.length < 1) return -1;
  return RULES.filter((r) => r.test(password)).length - 1; // 0-4
};

export default function PasswordStrengthIndicator({ password }) {
  const score = getScore(password);

  if (score < 0) return null; // no mostrar si el campo esta vacio

  const level = LEVELS[score];

  return (
    <div className="mt-2 space-y-2">
      {/* Barra de progreso */}
      <div className="flex gap-1" role="progressbar" aria-valuenow={score + 1} aria-valuemin={0} aria-valuemax={5} aria-label="Fortaleza de la contraseña">
        {LEVELS.map((l, i) => (
          <div
            key={l.label}
            className={`h-1.5 flex-1 rounded-full transition-colors duration-300 ${
              i <= score ? l.color : 'bg-gray-200'
            }`}
          />
        ))}
      </div>

      {/* Etiqueta de nivel */}
      <p className={`text-xs font-medium ${level.text}`}>
        Contraseña {level.label.toLowerCase()}
      </p>

      {/* Checklist de reglas */}
      <ul className="space-y-1">
        {RULES.map((rule) => {
          const ok = rule.test(password);
          return (
            <li key={rule.label} className={`flex items-center gap-1.5 text-xs ${ok ? 'text-green-600' : 'text-gray-400'}`}>
              {ok ? (
                <svg className="h-3.5 w-3.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                <svg className="h-3.5 w-3.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                  <circle cx="12" cy="12" r="10" />
                </svg>
              )}
              {rule.label}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
