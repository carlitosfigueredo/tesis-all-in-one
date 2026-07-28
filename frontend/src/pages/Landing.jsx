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

const PlanCard = ({ plan }) => (
  <article
    className={`relative flex flex-col rounded-2xl border p-8 shadow-sm transition-all hover:shadow-lg hover:-translate-y-1
      ${plan.highlight
        ? 'border-primary-600 bg-primary-600 text-white'
        : 'border-gray-200 bg-white text-gray-800'
      }`}
  >
    {plan.highlight && (
      <span className="absolute -top-3.5 left-1/2 -translate-x-1/2 rounded-full bg-amber-400 px-4 py-1 text-xs font-bold text-amber-900 shadow">
        MAS POPULAR
      </span>
    )}

    <h3 className={`text-xl font-bold ${plan.highlight ? 'text-white' : 'text-gray-900'}`}>
      {plan.name}
    </h3>

    <div className="mt-4 flex items-end gap-1">
      <span className={`text-3xl font-extrabold ${plan.highlight ? 'text-white' : 'text-gray-900'}`}>
        {formatGs(plan.priceGs)}
      </span>
      <span className={`mb-1 text-sm ${plan.highlight ? 'text-primary-200' : 'text-gray-400'}`}>
        / mes
      </span>
    </div>

    <p className={`mt-1 text-xs ${plan.highlight ? 'text-primary-100' : 'text-gray-400'}`}>
      Hasta {plan.employeeLimit?.toLocaleString('es-PY')} colaboradores
    </p>

    <ul className="mt-6 space-y-3 flex-1">
      {(plan.features ?? []).map((f) => (
        <li key={f} className="flex items-start gap-2 text-sm">
          <CheckIcon highlight={plan.highlight} />
          <span className={plan.highlight ? 'text-primary-50' : 'text-gray-600'}>{f}</span>
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

const SystemIcon = ({ className = 'h-5 w-5 text-white' }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
  </svg>
);

const NavBar = () => (
  <header className="sticky top-0 z-50 border-b border-gray-100 bg-white/90 backdrop-blur-sm">
    <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
      <Link to="/" className="flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-600">
          <SystemIcon />
        </div>
        <span className="text-base font-bold text-gray-900 leading-tight">
          Sistema BI<span className="hidden sm:inline text-gray-400 font-normal"> · Retencion de Talento</span>
        </span>
      </Link>
      <nav className="hidden items-center gap-6 text-sm font-medium text-gray-600 md:flex" aria-label="Navegacion principal">
        <a href="#planes" className="hover:text-primary-600 transition-colors">Planes</a>
        <Link to="/terms" className="hover:text-primary-600 transition-colors">Terminos</Link>
        <Link to="/legal" className="hover:text-primary-600 transition-colors">Legal</Link>
      </nav>
      <Link to="/login" className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">
        Iniciar sesion
      </Link>
    </div>
  </header>
);

const Footer = () => (
  <footer className="border-t border-gray-200 bg-white">
    <div className="mx-auto max-w-6xl px-6 py-12">
      <div className="grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-4">
        <div className="col-span-1 sm:col-span-2 lg:col-span-1">
          <div className="flex items-center gap-2 mb-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-600">
              <SystemIcon />
            </div>
            <span className="font-bold text-gray-900 text-sm">Sistema BI</span>
          </div>
          <p className="text-sm text-gray-500 leading-relaxed">
            Plataforma de inteligencia de negocios para la prediccion de fuga de talento,
            desarrollada como trabajo de tesis — Asuncion, 2026.
          </p>
        </div>
        <div>
          <h4 className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-400">Producto</h4>
          <ul className="space-y-2 text-sm text-gray-600">
            <li><a href="#planes" className="hover:text-primary-600 transition-colors">Planes</a></li>
            <li><Link to="/register" className="hover:text-primary-600 transition-colors">Registrar empresa</Link></li>
            <li><Link to="/login" className="hover:text-primary-600 transition-colors">Iniciar sesion</Link></li>
          </ul>
        </div>
        <div>
          <h4 className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-400">Legal</h4>
          <ul className="space-y-2 text-sm text-gray-600">
            <li><Link to="/terms" className="hover:text-primary-600 transition-colors">Terminos y condiciones</Link></li>
            <li><Link to="/legal" className="hover:text-primary-600 transition-colors">Aviso legal</Link></li>
          </ul>
        </div>
        <div>
          <h4 className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-400">Contacto</h4>
          <ul className="space-y-2 text-sm text-gray-600">
            <li><a href="mailto:soporte@sistemabi.edu.py" className="hover:text-primary-600 transition-colors">soporte@sistemabi.edu.py</a></li>
          </ul>
        </div>
      </div>
      <div className="mt-10 flex flex-col items-center justify-between gap-4 border-t border-gray-100 pt-6 text-xs text-gray-400 sm:flex-row">
        <p>&copy; {new Date().getFullYear()} Sistema BI — Retencion de Talento. Trabajo de tesis academica.</p>
        <div className="flex gap-4">
          <Link to="/terms" className="hover:text-gray-600 transition-colors">Terminos</Link>
          <Link to="/legal" className="hover:text-gray-600 transition-colors">Legal</Link>
        </div>
      </div>
    </div>
  </footer>
);

// ─── Pagina principal ─────────────────────────────────────────────────────────

export default function Landing() {
  const [plans, setPlans]         = useState([]);
  const [payPerUse, setPayPerUse] = useState(null);
  const [loading, setLoading]     = useState(true);

  useEffect(() => {
    api.get('/plans')
      .then(({ data }) => {
        setPlans(data.data.plans ?? []);
        setPayPerUse(data.data.payPerUse ?? null);
      })
      .catch(() => {
        setPlans([
          { id: 'ESTANDAR',    name: 'Plan Estandar',    priceGs: 999000,  highlight: false, employeeLimit: 100,  features: ['Hasta 100 colaboradores', 'Dashboard basico', 'Prediccion mensual'], cta: 'Comenzar' },
          { id: 'PROFESIONAL', name: 'Plan Profesional', priceGs: 1390000, highlight: true,  employeeLimit: 500,  features: ['Hasta 500 colaboradores', 'Dashboard avanzado', 'Prediccion semanal'], cta: 'Comenzar' },
          { id: 'CORPORATIVO', name: 'Plan Corporativo', priceGs: 2590000, highlight: false, employeeLimit: 1500, features: ['Hasta 1.500 colaboradores', 'Dashboard personalizado', 'Prediccion bajo demanda'], cta: 'Consultar' },
        ]);
        setPayPerUse({ priceGs: 200000, collaboratorsBlock: 250, description: 'Gs. 200.000 por cada 250 colaboradores adicionales' });
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      <NavBar />

      {/* ── Hero ── */}
      <section className="bg-white">
        <div className="mx-auto max-w-6xl px-6 py-24 text-center">
          <span className="mb-4 inline-block rounded-full bg-primary-50 px-4 py-1.5 text-xs font-semibold text-primary-600 uppercase tracking-wider">
            Inteligencia de Negocios · Machine Learning · RR. HH.
          </span>
          <h1 className="text-4xl font-extrabold tracking-tight text-gray-900 sm:text-5xl lg:text-6xl">
            Predeci la fuga de{' '}
            <span className="text-primary-600">talento</span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-gray-500">
            Sistema de inteligencia de negocios basado en machine learning para predecir y prevenir
            la rotacion de personal. Decisiones fundamentadas en datos, equipos mas estables.
          </p>
          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link to="/register" className="rounded-xl bg-primary-600 px-8 py-3.5 text-base font-semibold text-white shadow-sm hover:bg-primary-700 transition-all hover:shadow-md">
              Registrar mi empresa
            </Link>
            <a href="#planes" className="rounded-xl border border-gray-200 bg-white px-8 py-3.5 text-base font-semibold text-gray-700 hover:bg-gray-50 transition-colors">
              Ver planes
            </a>
          </div>
          <p className="mt-4 text-xs text-gray-400">
            Ya tenes cuenta? <Link to="/login" className="text-primary-600 font-medium hover:underline">Inicia sesion</Link>
          </p>
        </div>
      </section>

      {/* ── Caracteristicas ── */}
      <section className="bg-gray-50 py-16">
        <div className="mx-auto max-w-6xl px-6">
          <div className="grid grid-cols-1 gap-8 sm:grid-cols-3">
            {[
              { title: 'Modelo predictivo ML', desc: 'Algoritmo entrenado con datos reales para detectar senales tempranas de riesgo de fuga de empleados.', icon: <svg className="h-7 w-7 text-primary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" /></svg> },
              { title: 'Dashboard analitico', desc: 'Visualizacion de KPIs de retencion, distribucion de riesgo y tendencias de satisfaccion laboral.', icon: <svg className="h-7 w-7 text-primary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg> },
              { title: 'Multi-empresa seguro', desc: 'Cada empresa tiene sus datos aislados. Control de acceso por roles y auditoria completa de acciones.', icon: <svg className="h-7 w-7 text-primary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg> },
            ].map((item) => (
              <div key={item.title} className="rounded-2xl bg-white p-7 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
                <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-primary-50">{item.icon}</div>
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
            <h2 className="text-3xl font-extrabold text-gray-900 sm:text-4xl">Planes de suscripcion</h2>
            <p className="mt-3 text-gray-500">Escalable segun el tamano de tu organizacion. Elegí tu plan y registra tu empresa.</p>
          </div>

          {loading ? (
            <div className="flex justify-center py-12">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-600 border-t-transparent" />
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 gap-8 md:grid-cols-3 mb-8">
                {plans.map((plan) => <PlanCard key={plan.id} plan={plan} />)}
              </div>

              {payPerUse && (
                <p className="mt-2 text-center text-sm italic text-gray-500 font-medium">
                  Modelo Pay-per-use: {payPerUse.description}
                </p>
              )}
            </>
          )}

          <p className="mt-6 text-center text-xs text-gray-400">
            Precios en Guaranies (Gs.). Al contratar aceptas nuestros{' '}
            <Link to="/terms" className="underline hover:text-gray-600">Terminos y condiciones</Link>.
          </p>
        </div>
      </section>

      {/* ── CTA final ── */}
      <section className="bg-primary-600 py-16">
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

      <Footer />
    </div>
  );
}
