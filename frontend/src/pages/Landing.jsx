import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const formatGs = (n) =>
  n != null ? `Gs. ${Number(n).toLocaleString('es-PY')}` : 'A consultar';

// ─── Componentes ──────────────────────────────────────────────────────────────

const CheckIcon = ({ highlight }) => (
  <svg
    className={`h-4 w-4 flex-shrink-0 mt-0.5 ${highlight ? 'text-green-300' : 'text-green-500'}`}
    fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} aria-hidden="true"
  >
    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
  </svg>
);

const PlanCard = ({ plan, dark }) => (
  <article
    className={`relative flex flex-col rounded-2xl border p-8 shadow-sm transition-all duration-300 hover:shadow-lg hover:-translate-y-1
      ${plan.highlight
        ? 'border-primary-600 bg-primary-600 text-white'
        : dark
          ? 'border-gray-700 bg-gray-800 text-gray-100'
          : 'border-gray-200 bg-white text-gray-800'
      }`}
  >
    {plan.highlight && (
      <span className="absolute -top-3.5 left-1/2 -translate-x-1/2 rounded-full bg-amber-400 px-4 py-1 text-xs font-bold text-amber-900 shadow">
        MAS POPULAR
      </span>
    )}

    <h3 className={`text-xl font-bold ${plan.highlight ? 'text-white' : dark ? 'text-white' : 'text-gray-900'}`}>
      {plan.name}
    </h3>

    <div className="mt-4 flex items-end gap-1">
      <span className={`text-3xl font-extrabold ${plan.highlight ? 'text-white' : dark ? 'text-white' : 'text-gray-900'}`}>
        {formatGs(plan.priceGs)}
      </span>
      <span className={`mb-1 text-sm ${plan.highlight ? 'text-primary-200' : dark ? 'text-gray-400' : 'text-gray-400'}`}>
        / mes
      </span>
    </div>

    <p className={`mt-1 text-xs ${plan.highlight ? 'text-primary-100' : dark ? 'text-gray-400' : 'text-gray-400'}`}>
      Hasta {plan.employeeLimit?.toLocaleString('es-PY')} colaboradores
    </p>

    <ul className="mt-6 space-y-3 flex-1">
      {(plan.features ?? []).map((f) => (
        <li key={f} className="flex items-start gap-2 text-sm">
          <CheckIcon highlight={plan.highlight} />
          <span className={plan.highlight ? 'text-primary-50' : dark ? 'text-gray-300' : 'text-gray-600'}>{f}</span>
        </li>
      ))}
    </ul>

    <Link
      to="/register"
      className={`mt-8 block rounded-xl py-3 text-center text-sm font-semibold transition-colors
        ${plan.highlight
          ? 'bg-white text-primary-600 hover:bg-primary-50'
          : 'bg-primary-600 text-white hover:bg-primary-700'
        }`}
    >
      {plan.cta ?? 'Comenzar'}
    </Link>
  </article>
);

const ThemeToggle = ({ dark, setDark }) => (
  <button
    onClick={() => setDark(!dark)}
    className={`rounded-lg p-2 transition-colors ${dark ? 'bg-gray-700 text-yellow-400 hover:bg-gray-600' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
    aria-label={dark ? 'Modo claro' : 'Modo oscuro'}
  >
    {dark ? (
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
      </svg>
    ) : (
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
      </svg>
    )}
  </button>
);

// ─── Pagina principal ─────────────────────────────────────────────────────────

export default function Landing() {
  const [plans, setPlans]         = useState([]);
  const [payPerUse, setPayPerUse] = useState(null);
  const [loading, setLoading]     = useState(true);
  const [dark, setDark]           = useState(false);

  useEffect(() => {
    // Detectar preferencia del sistema
    if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
      setDark(true);
    }
  }, []);

  useEffect(() => {
    api.get('/plans')
      .then(({ data }) => {
        setPlans(data.data.plans ?? []);
        setPayPerUse(data.data.payPerUse ?? null);
      })
      .catch(() => {
        setPlans([
          { id: 'ESTANDAR',    name: 'Plan Estandar',    priceGs: 999000,  highlight: false, employeeLimit: 100,  features: ['Hasta 100 colaboradores', 'Prediccion de desercion mensual', 'Dashboard basico de retencion', 'Exportacion CSV', 'Soporte por correo'], cta: 'Comenzar' },
          { id: 'PROFESIONAL', name: 'Plan Profesional', priceGs: 1390000, highlight: true,  employeeLimit: 500,  features: ['Hasta 500 colaboradores', 'Todo lo del Plan Estandar', 'Prediccion semanal', 'Dashboard avanzado con filtros', 'Importacion masiva CSV', 'Soporte prioritario'], cta: 'Comenzar' },
          { id: 'CORPORATIVO', name: 'Plan Corporativo', priceGs: 2590000, highlight: false, employeeLimit: 1500, features: ['Hasta 1.500 colaboradores', 'Todo lo del Plan Profesional', 'Prediccion bajo demanda', 'Dashboard personalizado', 'Integracion con sistemas HRIS', 'Gerente de cuenta dedicado'], cta: 'Consultar' },
        ]);
        setPayPerUse({ priceGs: 200000, collaboratorsBlock: 250, description: 'Gs. 200.000 por cada 250 colaboradores adicionales' });
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className={`min-h-screen transition-colors duration-300 ${dark ? 'bg-gray-900' : 'bg-gray-50'}`}>

      {/* ── Navbar ── */}
      <header className={`sticky top-0 z-50 border-b backdrop-blur-sm transition-colors duration-300 ${dark ? 'border-gray-800 bg-gray-900/90' : 'border-gray-100 bg-white/90'}`}>
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link to="/" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-primary-700 via-primary-600 to-primary-800">
              <svg className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <span className={`text-base font-bold leading-tight ${dark ? 'text-white' : 'text-gray-900'}`}>
              Sistema BI<span className={`hidden sm:inline font-normal ml-1.5 text-xs ${dark ? 'text-gray-400' : 'text-gray-400'}`}>Retencion de Talento</span>
            </span>
          </Link>
          <nav className={`hidden items-center gap-6 text-sm font-medium md:flex ${dark ? 'text-gray-300' : 'text-gray-600'}`}>
            <a href="#features" className={`transition-colors ${dark ? 'hover:text-white' : 'hover:text-primary-600'}`}>Funcionalidades</a>
            <a href="#planes" className={`transition-colors ${dark ? 'hover:text-white' : 'hover:text-primary-600'}`}>Planes</a>
            <Link to="/terms" className={`transition-colors ${dark ? 'hover:text-white' : 'hover:text-primary-600'}`}>Legal</Link>
          </nav>
          <div className="flex items-center gap-3">
            <ThemeToggle dark={dark} setDark={setDark} />
            <Link to="/login" className={`rounded-lg border px-4 py-2 text-sm font-medium transition-colors ${dark ? 'border-gray-700 text-gray-300 hover:bg-gray-800' : 'border-gray-200 text-gray-700 hover:bg-gray-50'}`}>
              Iniciar sesion
            </Link>
          </div>
        </div>
      </header>

      {/* ── Hero (mismo gradiente del login) ── */}
      <section className="relative overflow-hidden bg-gradient-to-br from-primary-700 via-primary-600 to-primary-800">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 left-10 h-72 w-72 rounded-full bg-white blur-[100px]" />
          <div className="absolute bottom-10 right-20 h-64 w-64 rounded-full bg-white blur-[80px]" />
        </div>

        <div className="relative mx-auto max-w-6xl px-6 py-24 lg:py-32">
          <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-2">
            {/* Texto */}
            <div className="text-white">
              <span className="inline-block rounded-full bg-white/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-wider backdrop-blur-sm mb-6">
                Inteligencia de Negocios + Machine Learning
              </span>
              <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl leading-[1.1]">
                Predeci la fuga de talento en tu empresa
              </h1>
              <p className="mt-6 text-lg text-primary-100 leading-relaxed max-w-lg">
                Sistema basado en machine learning para predecir y prevenir la rotacion de personal
                en empresas de desarrollo de software.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link to="/register" className="rounded-xl bg-white px-8 py-3.5 text-base font-semibold text-primary-700 shadow-lg hover:bg-primary-50 transition-all">
                  Registrar mi empresa
                </Link>
                <a href="#planes" className="rounded-xl border border-white/30 px-8 py-3.5 text-base font-semibold text-white hover:bg-white/10 transition-all">
                  Ver planes
                </a>
              </div>
              <p className="mt-4 text-sm text-primary-200">
                Ya tenes cuenta? <Link to="/login" className="font-medium underline hover:text-white">Inicia sesion</Link>
              </p>
            </div>

            {/* Bullets (como el login) */}
            <div className="hidden lg:block">
              <div className="rounded-2xl bg-white/10 backdrop-blur-sm border border-white/10 p-8">
                <div className="space-y-5">
                  {[
                    { title: 'Prediccion con ML', desc: 'Algoritmo entrenado con datos del mercado de software paraguayo' },
                    { title: 'Dashboard interactivo', desc: 'KPIs de retencion, riesgo por area, tendencias de satisfaccion' },
                    { title: 'Multi-empresa seguro', desc: 'Datos aislados por empresa, control de acceso por roles' },
                    { title: '17 variables analizadas', desc: 'Desde salario y seniority hasta encuesta de clima laboral' },
                  ].map((item) => (
                    <div key={item.title} className="flex items-start gap-3">
                      <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-white/10 mt-0.5">
                        <svg className="h-4 w-4 text-green-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-white">{item.title}</p>
                        <p className="text-xs text-primary-200 mt-0.5">{item.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Como funciona ── */}
      <section id="features" className={`py-20 transition-colors duration-300 ${dark ? 'bg-gray-900' : 'bg-gray-50'}`}>
        <div className="mx-auto max-w-6xl px-6">
          <div className="text-center mb-14">
            <h2 className={`text-3xl font-extrabold sm:text-4xl ${dark ? 'text-white' : 'text-gray-900'}`}>Como funciona</h2>
            <p className={`mt-3 max-w-xl mx-auto ${dark ? 'text-gray-400' : 'text-gray-500'}`}>
              Tres pasos simples para predecir la desercion en tu equipo
            </p>
          </div>

          <div className="grid grid-cols-1 gap-8 sm:grid-cols-3">
            {[
              { step: '1', title: 'Carga tus datos', desc: 'Subi un CSV con los datos de tus empleados: rol, seniority, salario, antiguedad. El sistema valida todo automaticamente.', icon: '📤' },
              { step: '2', title: 'El modelo predice', desc: 'El algoritmo de Machine Learning analiza 17 variables y calcula la probabilidad de desercion de cada empleado.', icon: '🤖' },
              { step: '3', title: 'Actua a tiempo', desc: 'Visualiza que empleados tienen mayor riesgo y toma acciones preventivas para retenerlos.', icon: '🎯' },
            ].map((item) => (
              <div key={item.step} className={`rounded-2xl border p-7 transition-all hover:shadow-md ${dark ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-white'}`}>
                <div className="flex items-center gap-3 mb-4">
                  <span className="text-2xl">{item.icon}</span>
                  <span className={`text-xs font-bold uppercase tracking-widest ${dark ? 'text-gray-500' : 'text-gray-400'}`}>Paso {item.step}</span>
                </div>
                <h3 className={`text-base font-semibold mb-2 ${dark ? 'text-white' : 'text-gray-900'}`}>{item.title}</h3>
                <p className={`text-sm leading-relaxed ${dark ? 'text-gray-400' : 'text-gray-500'}`}>{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Caracteristicas ── */}
      <section className={`py-16 transition-colors duration-300 ${dark ? 'bg-gray-800/50' : 'bg-white'}`}>
        <div className="mx-auto max-w-6xl px-6">
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { title: 'Enfocado en Software', desc: 'Variables para equipos de desarrollo: rol, seniority, horas extra, modalidad.', emoji: '💻' },
              { title: 'Contexto Paraguay', desc: 'Salarios en guaranies, realidad del mercado IT local.', emoji: '🇵🇾' },
              { title: 'Datos protegidos', desc: 'Cada empresa tiene datos aislados con acceso por roles.', emoji: '🔒' },
              { title: 'Resultados rapidos', desc: 'Prediccion inmediata al cargar datos. Sin configuracion.', emoji: '⚡' },
            ].map((item) => (
              <div key={item.title} className={`rounded-xl border p-5 transition-colors ${dark ? 'border-gray-700 hover:border-gray-600' : 'border-gray-100 hover:border-primary-200'}`}>
                <span className="text-2xl">{item.emoji}</span>
                <h3 className={`mt-3 text-sm font-bold ${dark ? 'text-white' : 'text-gray-900'}`}>{item.title}</h3>
                <p className={`mt-1.5 text-xs leading-relaxed ${dark ? 'text-gray-400' : 'text-gray-500'}`}>{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Planes ── */}
      <section id="planes" className={`py-20 transition-colors duration-300 ${dark ? 'bg-gray-900' : 'bg-gray-50'}`}>
        <div className="mx-auto max-w-6xl px-6">
          <div className="mb-12 text-center">
            <h2 className={`text-3xl font-extrabold sm:text-4xl ${dark ? 'text-white' : 'text-gray-900'}`}>Planes de suscripcion</h2>
            <p className={`mt-3 ${dark ? 'text-gray-400' : 'text-gray-500'}`}>Escalable segun el tamano de tu organizacion</p>
          </div>

          {loading ? (
            <div className="flex justify-center py-12">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-600 border-t-transparent" />
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 gap-8 md:grid-cols-3 mb-8">
                {plans.map((plan) => <PlanCard key={plan.id} plan={plan} dark={dark} />)}
              </div>

              {payPerUse && (
                <p className={`mt-2 text-center text-sm italic font-medium ${dark ? 'text-gray-500' : 'text-gray-500'}`}>
                  Modelo Pay-per-use: {payPerUse.description}
                </p>
              )}
            </>
          )}

          <p className={`mt-6 text-center text-xs ${dark ? 'text-gray-600' : 'text-gray-400'}`}>
            Precios en Guaranies (Gs.). Al contratar aceptas nuestros{' '}
            <Link to="/terms" className="underline hover:text-primary-600 transition-colors">Terminos y condiciones</Link>.
          </p>
        </div>
      </section>

      {/* ── CTA final (mismo gradiente del hero) ── */}
      <section className="bg-gradient-to-br from-primary-700 via-primary-600 to-primary-800 py-16">
        <div className="mx-auto max-w-3xl px-6 text-center">
          <h2 className="text-3xl font-extrabold text-white">Listo para reducir la rotacion de tu equipo?</h2>
          <p className="mt-4 text-primary-100">Registra tu empresa y comenza a analizar los datos de tu organizacion.</p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link to="/register" className="rounded-xl bg-white px-10 py-3.5 text-base font-semibold text-primary-600 shadow hover:bg-primary-50 transition-colors">
              Registrar empresa
            </Link>
            <Link to="/login" className="rounded-xl border border-white/30 px-8 py-3.5 text-base font-medium text-white hover:bg-white/10 transition-colors">
              Ya tengo cuenta
            </Link>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className={`border-t transition-colors duration-300 ${dark ? 'border-gray-800 bg-gray-900' : 'border-gray-200 bg-white'}`}>
        <div className="mx-auto max-w-6xl px-6 py-12">
          <div className="grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-4">
            <div className="col-span-1 sm:col-span-2 lg:col-span-1">
              <div className="flex items-center gap-2 mb-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-primary-700 via-primary-600 to-primary-800">
                  <svg className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                <span className={`font-bold text-sm ${dark ? 'text-white' : 'text-gray-900'}`}>Sistema BI</span>
              </div>
              <p className={`text-sm leading-relaxed ${dark ? 'text-gray-400' : 'text-gray-500'}`}>
                Plataforma de inteligencia de negocios para la prediccion de fuga de talento.
                Trabajo de tesis — UNIDA, Asuncion 2026.
              </p>
            </div>
            <div>
              <h4 className={`mb-3 text-xs font-semibold uppercase tracking-wider ${dark ? 'text-gray-500' : 'text-gray-400'}`}>Producto</h4>
              <ul className={`space-y-2 text-sm ${dark ? 'text-gray-400' : 'text-gray-600'}`}>
                <li><a href="#planes" className={`transition-colors ${dark ? 'hover:text-white' : 'hover:text-primary-600'}`}>Planes</a></li>
                <li><Link to="/register" className={`transition-colors ${dark ? 'hover:text-white' : 'hover:text-primary-600'}`}>Registrar empresa</Link></li>
                <li><Link to="/login" className={`transition-colors ${dark ? 'hover:text-white' : 'hover:text-primary-600'}`}>Iniciar sesion</Link></li>
              </ul>
            </div>
            <div>
              <h4 className={`mb-3 text-xs font-semibold uppercase tracking-wider ${dark ? 'text-gray-500' : 'text-gray-400'}`}>Legal</h4>
              <ul className={`space-y-2 text-sm ${dark ? 'text-gray-400' : 'text-gray-600'}`}>
                <li><Link to="/terms" className={`transition-colors ${dark ? 'hover:text-white' : 'hover:text-primary-600'}`}>Terminos y condiciones</Link></li>
                <li><Link to="/legal" className={`transition-colors ${dark ? 'hover:text-white' : 'hover:text-primary-600'}`}>Aviso legal</Link></li>
              </ul>
            </div>
            <div>
              <h4 className={`mb-3 text-xs font-semibold uppercase tracking-wider ${dark ? 'text-gray-500' : 'text-gray-400'}`}>Contacto</h4>
              <ul className={`space-y-2 text-sm ${dark ? 'text-gray-400' : 'text-gray-600'}`}>
                <li><a href="mailto:soporte@sistemabi.edu.py" className={`transition-colors ${dark ? 'hover:text-white' : 'hover:text-primary-600'}`}>soporte@sistemabi.edu.py</a></li>
              </ul>
            </div>
          </div>
          <div className={`mt-10 flex flex-col items-center justify-between gap-4 border-t pt-6 text-xs sm:flex-row ${dark ? 'border-gray-800 text-gray-500' : 'border-gray-100 text-gray-400'}`}>
            <p>&copy; {new Date().getFullYear()} Sistema BI — Retencion de Talento. Trabajo de tesis academica.</p>
            <div className="flex gap-4">
              <Link to="/terms" className={`transition-colors ${dark ? 'hover:text-gray-300' : 'hover:text-gray-600'}`}>Terminos</Link>
              <Link to="/legal" className={`transition-colors ${dark ? 'hover:text-gray-300' : 'hover:text-gray-600'}`}>Legal</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
