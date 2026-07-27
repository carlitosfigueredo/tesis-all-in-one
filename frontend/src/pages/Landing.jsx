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

    <div className="mt-4 flex items-end gap-1">
      <span className={`text-3xl font-extrabold ${plan.highlight ? 'text-white' : 'text-gray-900'}`}>
        {formatGs(plan.priceGs)}
      </span>
      <span className={`mb-1 text-sm ${plan.highlight ? 'text-blue-200' : 'text-gray-400'}`}>
        / mes
      </span>
    </div>

    <p className={`mt-1 text-xs ${plan.highlight ? 'text-blue-100' : 'text-gray-400'}`}>
      Hasta {plan.employeeLimit?.toLocaleString('es-PY')} colaboradores
    </p>

    <ul className="mt-6 space-y-3 flex-1">
      {(plan.features ?? []).map((f) => (
        <li key={f} className="flex items-start gap-2 text-sm">
          <CheckIcon highlight={plan.highlight} />
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
      {plan.cta ?? 'Contratar'}
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
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600">
          <SystemIcon />
        </div>
        <span className="text-base font-bold text-gray-900 leading-tight">
          Sistema BI<span className="hidden sm:inline text-gray-400 font-normal"> · Retención de Talento</span>
        </span>
      </Link>
      <nav className="hidden items-center gap-6 text-sm font-medium text-gray-600 md:flex" aria-label="Navegación principal">
        <a href="#planes" className="hover:text-blue-600 transition-colors">Planes</a>
        <Link to="/terms" className="hover:text-blue-600 transition-colors">Términos</Link>
        <Link to="/legal" className="hover:text-blue-600 transition-colors">Legal</Link>
      </nav>
      <Link to="/login" className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 transition-colors">
        Iniciar sesión
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
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600">
              <SystemIcon />
            </div>
            <span className="font-bold text-gray-900 text-sm">Sistema BI</span>
          </div>
          <p className="text-sm text-gray-500 leading-relaxed">
            Plataforma de inteligencia de negocios para la predicción de fuga de talento,
            desarrollada como trabajo de tesis — Asunción, 2026.
          </p>
        </div>
        <div>
          <h4 className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-400">Producto</h4>
          <ul className="space-y-2 text-sm text-gray-600">
            <li><a href="#planes" className="hover:text-blue-600 transition-colors">Planes y acceso</a></li>
            <li><Link to="/login" className="hover:text-blue-600 transition-colors">Iniciar sesión</Link></li>
          </ul>
        </div>
        <div>
          <h4 className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-400">Legal</h4>
          <ul className="space-y-2 text-sm text-gray-600">
            <li><Link to="/terms" className="hover:text-blue-600 transition-colors">Términos y condiciones</Link></li>
            <li><Link to="/legal" className="hover:text-blue-600 transition-colors">Aviso legal</Link></li>
          </ul>
        </div>
        <div>
          <h4 className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-400">Contacto</h4>
          <ul className="space-y-2 text-sm text-gray-600">
            <li><a href="mailto:soporte@sistemabi.edu.py" className="hover:text-blue-600 transition-colors">soporte@sistemabi.edu.py</a></li>
          </ul>
        </div>
      </div>
      <div className="mt-10 flex flex-col items-center justify-between gap-4 border-t border-gray-100 pt-6 text-xs text-gray-400 sm:flex-row">
        <p>© {new Date().getFullYear()} Sistema BI — Retención de Talento. Trabajo de tesis académica.</p>
        <div className="flex gap-4">
          <Link to="/terms" className="hover:text-gray-600 transition-colors">Términos</Link>
          <Link to="/legal" className="hover:text-gray-600 transition-colors">Legal</Link>
        </div>
      </div>
    </div>
  </footer>
);

// ─── Tabla comparativa ────────────────────────────────────────────────────────

const ComparisonTable = ({ plans }) => {
  const ROWS = [
    { label: 'Precio Mensual',       key: (p) => <span className="font-bold text-blue-600">{formatGs(p.priceGs)}</span> },
    { label: 'Colaboradores',        key: (p) => `Hasta ${p.employeeLimit?.toLocaleString('es-PY') ?? '—'}` },
    { label: 'Frecuencia Predictiva',key: (p) => p.predictionFrequency ?? '—' },
    { label: 'Tipos de Dashboards',  key: (p) => p.dashboardType ?? '—' },
  ];

  return (
    <div className="overflow-x-auto rounded-xl border border-gray-100 shadow-sm">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-gray-900 text-white">
            <th className="px-5 py-4 text-left font-semibold w-48">Característica</th>
            {plans.map((p) => (
              <th key={p.id} className={`px-5 py-4 text-left font-semibold ${p.highlight ? 'text-blue-300' : ''}`}>
                {p.name}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {ROWS.map((row, i) => (
            <tr key={row.label} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
              <td className="px-5 py-3.5 font-medium text-gray-700">{row.label}</td>
              {plans.map((p) => (
                <td key={p.id} className="px-5 py-3.5 text-gray-600">
                  {row.key(p)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

// ─── Página principal ─────────────────────────────────────────────────────────

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
        // Fallback si el backend no está disponible
        setPlans([
          { id: 'ESTANDAR',    name: 'Plan Estándar',    priceGs: 999000,  highlight: false, employeeLimit: 100,  predictionFrequency: 'Mensual',      dashboardType: 'Básico',                  features: ['Hasta 100 colaboradores', 'Dashboard básico', 'Predicción mensual'], cta: 'Contratar' },
          { id: 'PROFESIONAL', name: 'Plan Profesional', priceGs: 1390000, highlight: true,  employeeLimit: 500,  predictionFrequency: 'Semanal',      dashboardType: 'Avanzado',                features: ['Hasta 500 colaboradores', 'Dashboard avanzado', 'Predicción semanal'], cta: 'Contratar' },
          { id: 'CORPORATIVO', name: 'Plan Corporativo', priceGs: 2590000, highlight: false, employeeLimit: 1500, predictionFrequency: 'Bajo demanda', dashboardType: 'Avanzado + Personalizado', features: ['Hasta 1.500 colaboradores', 'Dashboard personalizado', 'Predicción bajo demanda'], cta: 'Consultar' },
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
          <span className="mb-4 inline-block rounded-full bg-blue-50 px-4 py-1.5 text-xs font-semibold text-blue-600 uppercase tracking-wider">
            Inteligencia de Negocios · Machine Learning · RR. HH.
          </span>
          <h1 className="text-4xl font-extrabold tracking-tight text-gray-900 sm:text-5xl lg:text-6xl">
            Predicción de fuga de{' '}
            <span className="text-blue-600">talento</span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-gray-500">
            Sistema de inteligencia de negocios basado en machine learning para predecir y prevenir
            la rotación de personal en empresas de desarrollo de software.
            Decisiones fundamentadas en datos, equipos más estables.
          </p>
          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link to="/login" className="rounded-xl bg-blue-600 px-8 py-3.5 text-base font-semibold text-white shadow-sm hover:bg-blue-700 transition-colors">
              Iniciar sesión
            </Link>
            <a href="#planes" className="rounded-xl border border-gray-200 bg-white px-8 py-3.5 text-base font-semibold text-gray-700 hover:bg-gray-50 transition-colors">
              Ver planes
            </a>
          </div>
        </div>
      </section>

      {/* ── Características ── */}
      <section className="bg-gray-50 py-16">
        <div className="mx-auto max-w-6xl px-6">
          <div className="grid grid-cols-1 gap-8 sm:grid-cols-3">
            {[
              { title: 'Modelo predictivo ML', desc: 'Algoritmo entrenado con el dataset IBM HR Analytics para detectar señales tempranas de riesgo de fuga de empleados.', icon: <svg className="h-7 w-7 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8} aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" /></svg> },
              { title: 'Dashboard analítico', desc: 'Visualización de KPIs de retención, distribución de riesgo y tendencias de satisfacción laboral en tiempo real.', icon: <svg className="h-7 w-7 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8} aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg> },
              { title: 'Acceso seguro', desc: 'Autenticación mediante JWT y control de acceso por roles para proteger la información sensible del equipo.', icon: <svg className="h-7 w-7 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8} aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg> },
            ].map((item) => (
              <div key={item.title} className="rounded-2xl bg-white p-7 shadow-sm border border-gray-100">
                <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50">{item.icon}</div>
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
            <h2 className="text-3xl font-extrabold text-gray-900 sm:text-4xl">Modelo de Suscripciones</h2>
            <p className="mt-3 text-gray-500">Escalable según el tamaño de tu organización.</p>
          </div>

          {loading ? (
            <div className="flex justify-center py-12">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
            </div>
          ) : (
            <>
              {/* Cards */}
              <div className="grid grid-cols-1 gap-8 md:grid-cols-3 mb-12">
                {plans.map((plan) => <PlanCard key={plan.id} plan={plan} />)}
              </div>

              {/* Tabla comparativa estilo tesis */}
              <ComparisonTable plans={plans} />

              {/* Pay per use */}
              {payPerUse && (
                <p className="mt-6 text-center text-sm italic text-gray-500 font-medium">
                  Modelo Pay-per-use: {payPerUse.description}
                </p>
              )}
            </>
          )}

          <p className="mt-6 text-center text-xs text-gray-400">
            Precios en Guaraníes (Gs.). Al contratar aceptás nuestros{' '}
            <Link to="/terms" className="underline hover:text-gray-600">Términos y condiciones</Link>.
          </p>
        </div>
      </section>

      {/* ── CTA final ── */}
      <section className="bg-blue-600 py-16">
        <div className="mx-auto max-w-3xl px-6 text-center">
          <h2 className="text-3xl font-extrabold text-white">¿Listo para reducir la rotación de tu equipo?</h2>
          <p className="mt-4 text-blue-100">Accedé al sistema y comenzá a analizar los datos de tu organización.</p>
          <Link to="/login" className="mt-8 inline-block rounded-xl bg-white px-10 py-3.5 text-base font-semibold text-blue-600 shadow hover:bg-blue-50 transition-colors">
            Iniciar sesión
          </Link>
        </div>
      </section>

      <Footer />
    </div>
  );
}
