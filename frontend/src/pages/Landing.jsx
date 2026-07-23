import { Link } from 'react-router-dom';

// ─── Datos de planes ──────────────────────────────────────────────────────────

const PLANS = [
  {
    id: 'starter',
    name: 'Starter',
    price: '$0',
    period: '/ mes',
    description: 'Ideal para equipos pequeños que quieren explorar la plataforma.',
    features: [
      'Hasta 50 empleados',
      'Dashboard de retención',
      'Predicción de fuga básica',
      'Exportación CSV',
      'Soporte por email',
    ],
    cta: 'Empezar gratis',
    highlight: false,
  },
  {
    id: 'pro',
    name: 'Pro',
    price: '$49',
    period: '/ mes',
    description: 'Para empresas en crecimiento que necesitan análisis más profundos.',
    features: [
      'Hasta 500 empleados',
      'Todo lo del plan Starter',
      'Modelo ML personalizable',
      'Reportes avanzados',
      'Importación masiva CSV',
      'Soporte prioritario',
    ],
    cta: 'Iniciar prueba gratis',
    highlight: true,
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    price: 'A medida',
    period: '',
    description: 'Solución completa para grandes organizaciones con necesidades específicas.',
    features: [
      'Empleados ilimitados',
      'Todo lo del plan Pro',
      'Integración con HRIS existente',
      'SSO / Active Directory',
      'SLA garantizado 99.9%',
      'Gerente de cuenta dedicado',
    ],
    cta: 'Contactar ventas',
    highlight: false,
  },
];

// ─── Componentes ──────────────────────────────────────────────────────────────

const CheckIcon = () => (
  <svg className="h-4 w-4 flex-shrink-0 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} aria-hidden="true">
    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
  </svg>
);

const PlanCard = ({ plan }) => (
  <article
    className={`relative flex flex-col rounded-2xl border p-8 shadow-sm transition-shadow hover:shadow-md
      ${plan.highlight
        ? 'border-blue-600 bg-blue-600 text-white'
        : 'border-gray-200 bg-white text-gray-800'
      }`}
  >
    {plan.highlight && (
      <span className="absolute -top-3.5 left-1/2 -translate-x-1/2 rounded-full bg-amber-400 px-4 py-1 text-xs font-bold text-amber-900 shadow">
        MÁS POPULAR
      </span>
    )}

    <h3 className={`text-xl font-bold ${plan.highlight ? 'text-white' : 'text-gray-900'}`}>
      {plan.name}
    </h3>
    <p className={`mt-1 text-sm ${plan.highlight ? 'text-blue-100' : 'text-gray-500'}`}>
      {plan.description}
    </p>

    <div className="mt-6 flex items-end gap-1">
      <span className={`text-4xl font-extrabold ${plan.highlight ? 'text-white' : 'text-gray-900'}`}>
        {plan.price}
      </span>
      {plan.period && (
        <span className={`mb-1 text-sm ${plan.highlight ? 'text-blue-200' : 'text-gray-400'}`}>
          {plan.period}
        </span>
      )}
    </div>

    <ul className="mt-6 space-y-3 flex-1">
      {plan.features.map((f) => (
        <li key={f} className="flex items-start gap-2 text-sm">
          {plan.highlight
            ? <svg className="h-4 w-4 flex-shrink-0 text-green-300 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
            : <CheckIcon />
          }
          <span className={plan.highlight ? 'text-blue-50' : 'text-gray-600'}>{f}</span>
        </li>
      ))}
    </ul>

    <Link
      to="/login"
      className={`mt-8 block rounded-xl py-3 text-center text-sm font-semibold transition-colors
        ${plan.highlight
          ? 'bg-white text-blue-600 hover:bg-blue-50'
          : 'bg-blue-600 text-white hover:bg-blue-700'
        }`}
    >
      {plan.cta}
    </Link>
  </article>
);

const NavBar = () => (
  <header className="sticky top-0 z-50 border-b border-gray-100 bg-white/90 backdrop-blur-sm">
    <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
      {/* Logo */}
      <Link to="/" className="flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600">
          <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </div>
        <span className="text-lg font-bold text-gray-900">TalentIQ</span>
      </Link>

      {/* Nav links */}
      <nav className="hidden items-center gap-6 text-sm font-medium text-gray-600 md:flex" aria-label="Navegación principal">
        <a href="#planes" className="hover:text-blue-600 transition-colors">Planes</a>
        <Link to="/terms" className="hover:text-blue-600 transition-colors">Términos</Link>
        <Link to="/legal" className="hover:text-blue-600 transition-colors">Legal</Link>
      </nav>

      {/* CTA */}
      <Link
        to="/login"
        className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 transition-colors"
      >
        Iniciar sesión
      </Link>
    </div>
  </header>
);

const Footer = () => (
  <footer className="border-t border-gray-200 bg-white">
    <div className="mx-auto max-w-6xl px-6 py-12">
      <div className="grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-4">

        {/* Marca */}
        <div className="col-span-1 sm:col-span-2 lg:col-span-1">
          <div className="flex items-center gap-2 mb-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600">
              <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <span className="font-bold text-gray-900">TalentIQ</span>
          </div>
          <p className="text-sm text-gray-500 leading-relaxed">
            Plataforma de retención de talento potenciada por machine learning.
          </p>
        </div>

        {/* Producto */}
        <div>
          <h4 className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-400">Producto</h4>
          <ul className="space-y-2 text-sm text-gray-600">
            <li><a href="#planes" className="hover:text-blue-600 transition-colors">Planes y precios</a></li>
            <li><Link to="/login" className="hover:text-blue-600 transition-colors">Iniciar sesión</Link></li>
          </ul>
        </div>

        {/* Legal */}
        <div>
          <h4 className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-400">Legal</h4>
          <ul className="space-y-2 text-sm text-gray-600">
            <li><Link to="/terms" className="hover:text-blue-600 transition-colors">Términos y condiciones</Link></li>
            <li><Link to="/legal" className="hover:text-blue-600 transition-colors">Aviso legal</Link></li>
          </ul>
        </div>

        {/* Contacto */}
        <div>
          <h4 className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-400">Contacto</h4>
          <ul className="space-y-2 text-sm text-gray-600">
            <li>
              <a href="mailto:soporte@talentiq.com" className="hover:text-blue-600 transition-colors">
                soporte@talentiq.com
              </a>
            </li>
          </ul>
        </div>
      </div>

      <div className="mt-10 flex flex-col items-center justify-between gap-4 border-t border-gray-100 pt-6 text-xs text-gray-400 sm:flex-row">
        <p>© {new Date().getFullYear()} TalentIQ. Todos los derechos reservados.</p>
        <div className="flex gap-4">
          <Link to="/terms" className="hover:text-gray-600 transition-colors">Términos</Link>
          <Link to="/legal" className="hover:text-gray-600 transition-colors">Legal</Link>
        </div>
      </div>
    </div>
  </footer>
);

// ─── Página principal ─────────────────────────────────────────────────────────

export default function Landing() {
  return (
    <div className="min-h-screen bg-gray-50">
      <NavBar />

      {/* ── Hero ── */}
      <section className="bg-white">
        <div className="mx-auto max-w-6xl px-6 py-24 text-center">
          <span className="mb-4 inline-block rounded-full bg-blue-50 px-4 py-1.5 text-xs font-semibold text-blue-600 uppercase tracking-wider">
            Plataforma HR · Machine Learning
          </span>
          <h1 className="text-4xl font-extrabold tracking-tight text-gray-900 sm:text-5xl lg:text-6xl">
            Retén a tu mejor{' '}
            <span className="text-blue-600">talento</span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-gray-500">
            TalentIQ analiza los datos de tu equipo con inteligencia artificial para predecir y prevenir
            la rotación antes de que suceda. Decisiones más inteligentes, equipos más estables.
          </p>
          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link
              to="/login"
              className="rounded-xl bg-blue-600 px-8 py-3.5 text-base font-semibold text-white shadow-sm hover:bg-blue-700 transition-colors"
            >
              Iniciar sesión
            </Link>
            <a
              href="#planes"
              className="rounded-xl border border-gray-200 bg-white px-8 py-3.5 text-base font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Ver planes
            </a>
          </div>
        </div>
      </section>

      {/* ── Características destacadas ── */}
      <section className="bg-gray-50 py-16">
        <div className="mx-auto max-w-6xl px-6">
          <div className="grid grid-cols-1 gap-8 sm:grid-cols-3">
            {[
              {
                icon: (
                  <svg className="h-7 w-7 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8} aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                ),
                title: 'IA predictiva',
                desc: 'Modelo de machine learning entrenado con el dataset IBM HR Analytics para detectar señales de riesgo de fuga.',
              },
              {
                icon: (
                  <svg className="h-7 w-7 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8} aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                ),
                title: 'Dashboard en tiempo real',
                desc: 'Visualizá KPIs de retención, distribución de riesgo y tendencias de satisfacción en un solo lugar.',
              },
              {
                icon: (
                  <svg className="h-7 w-7 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8} aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                ),
                title: 'Seguro y privado',
                desc: 'Autenticación JWT, control de acceso por roles y datos alojados en tu propia infraestructura.',
              },
            ].map((item) => (
              <div key={item.title} className="rounded-2xl bg-white p-7 shadow-sm border border-gray-100">
                <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50">
                  {item.icon}
                </div>
                <h3 className="mb-2 text-base font-semibold text-gray-900">{item.title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Planes ── */}
      <section id="planes" className="bg-white py-20">
        <div className="mx-auto max-w-6xl px-6">
          <div className="mb-12 text-center">
            <h2 className="text-3xl font-extrabold text-gray-900 sm:text-4xl">
              Planes para cada equipo
            </h2>
            <p className="mt-3 text-gray-500">
              Sin contratos largos. Cambiá de plan cuando quieras.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
            {PLANS.map((plan) => (
              <PlanCard key={plan.id} plan={plan} />
            ))}
          </div>

          <p className="mt-8 text-center text-xs text-gray-400">
            Todos los precios en USD. Al contratar aceptás nuestros{' '}
            <Link to="/terms" className="underline hover:text-gray-600">Términos y condiciones</Link>.
          </p>
        </div>
      </section>

      {/* ── CTA final ── */}
      <section className="bg-blue-600 py-16">
        <div className="mx-auto max-w-3xl px-6 text-center">
          <h2 className="text-3xl font-extrabold text-white">
            ¿Listo para reducir la rotación?
          </h2>
          <p className="mt-4 text-blue-100">
            Entrá a tu cuenta y empezá a analizar tu equipo hoy mismo.
          </p>
          <Link
            to="/login"
            className="mt-8 inline-block rounded-xl bg-white px-10 py-3.5 text-base font-semibold text-blue-600 shadow hover:bg-blue-50 transition-colors"
          >
            Iniciar sesión
          </Link>
        </div>
      </section>

      <Footer />
    </div>
  );
}
