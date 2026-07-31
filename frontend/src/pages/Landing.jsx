import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const formatGs = (n) =>
  n != null ? `Gs. ${Number(n).toLocaleString('es-PY')}` : 'A consultar';

// ─── Componentes ──────────────────────────────────────────────────────────────

const CheckIcon = ({ highlight }) => (
  <svg
    className={`h-4 w-4 flex-shrink-0 mt-0.5 ${highlight ? 'text-green-300' : 'text-primary-500'}`}
    fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} aria-hidden="true"
  >
    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
  </svg>
);

const PlanCard = ({ plan }) => (
  <article
    className={`relative flex flex-col rounded-2xl border p-8 transition-all duration-300 hover:shadow-xl hover:-translate-y-2
      ${plan.highlight
        ? 'border-primary-500 bg-gradient-to-br from-primary-600 to-indigo-700 text-white shadow-lg shadow-primary-500/20'
        : 'border-gray-200 bg-white text-gray-800 shadow-sm hover:border-primary-200'
      }`}
  >
    {plan.highlight && (
      <span className="absolute -top-3.5 left-1/2 -translate-x-1/2 rounded-full bg-gradient-to-r from-amber-400 to-orange-400 px-4 py-1 text-xs font-bold text-amber-900 shadow-md">
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
      className={`mt-8 block rounded-xl py-3 text-center text-sm font-semibold transition-all duration-200
        ${plan.highlight
          ? 'bg-white text-primary-600 hover:bg-primary-50 shadow-md'
          : 'bg-primary-600 text-white hover:bg-primary-700 hover:shadow-md'
        }`}
    >
      {plan.cta ?? 'Comenzar'}
    </Link>
  </article>
);

const NavBar = () => (
  <header className="sticky top-0 z-50 border-b border-white/10 bg-gray-900/95 backdrop-blur-md">
    <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
      <Link to="/" className="flex items-center gap-2.5">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-primary-500 to-indigo-600 shadow-lg shadow-primary-500/30">
          <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
        </div>
        <span className="text-base font-bold text-white leading-tight">
          RetainIQ<span className="hidden sm:inline text-gray-400 font-normal ml-1.5 text-xs">Prediccion de Talento</span>
        </span>
      </Link>
      <nav className="hidden items-center gap-6 text-sm font-medium text-gray-300 md:flex" aria-label="Navegacion principal">
        <a href="#features" className="hover:text-white transition-colors">Funcionalidades</a>
        <a href="#planes" className="hover:text-white transition-colors">Planes</a>
        <Link to="/terms" className="hover:text-white transition-colors">Legal</Link>
      </nav>
      <div className="flex items-center gap-3">
        <Link to="/login" className="text-sm font-medium text-gray-300 hover:text-white transition-colors">
          Iniciar sesion
        </Link>
        <Link to="/register" className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-500 transition-colors shadow-sm shadow-primary-600/30">
          Registrar empresa
        </Link>
      </div>
    </div>
  </header>
);

const Footer = () => (
  <footer className="border-t border-gray-800 bg-gray-900">
    <div className="mx-auto max-w-6xl px-6 py-12">
      <div className="grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-4">
        <div className="col-span-1 sm:col-span-2 lg:col-span-1">
          <div className="flex items-center gap-2 mb-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-primary-500 to-indigo-600">
              <svg className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <span className="font-bold text-white text-sm">RetainIQ</span>
          </div>
          <p className="text-sm text-gray-400 leading-relaxed">
            Plataforma de inteligencia de negocios para la prediccion de desercion laboral
            en empresas de desarrollo de software.
          </p>
          <p className="mt-3 text-xs text-gray-500">
            Trabajo de tesis — Universidad UNIDA, Asuncion 2026.
          </p>
        </div>
        <div>
          <h4 className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-500">Producto</h4>
          <ul className="space-y-2 text-sm text-gray-400">
            <li><a href="#planes" className="hover:text-white transition-colors">Planes</a></li>
            <li><Link to="/register" className="hover:text-white transition-colors">Registrar empresa</Link></li>
            <li><Link to="/login" className="hover:text-white transition-colors">Iniciar sesion</Link></li>
          </ul>
        </div>
        <div>
          <h4 className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-500">Legal</h4>
          <ul className="space-y-2 text-sm text-gray-400">
            <li><Link to="/terms" className="hover:text-white transition-colors">Terminos y condiciones</Link></li>
            <li><Link to="/legal" className="hover:text-white transition-colors">Aviso legal</Link></li>
          </ul>
        </div>
        <div>
          <h4 className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-500">Contacto</h4>
          <ul className="space-y-2 text-sm text-gray-400">
            <li><a href="mailto:soporte@sistemabi.edu.py" className="hover:text-white transition-colors">soporte@sistemabi.edu.py</a></li>
          </ul>
        </div>
      </div>
      <div className="mt-10 flex flex-col items-center justify-between gap-4 border-t border-gray-800 pt-6 text-xs text-gray-500 sm:flex-row">
        <p>&copy; {new Date().getFullYear()} RetainIQ — Prediccion de Desercion Laboral. Trabajo de tesis academica.</p>
        <div className="flex gap-4">
          <Link to="/terms" className="hover:text-gray-300 transition-colors">Terminos</Link>
          <Link to="/legal" className="hover:text-gray-300 transition-colors">Legal</Link>
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
          { id: 'ESTANDAR',    name: 'Plan Estandar',    priceGs: 999000,  highlight: false, employeeLimit: 100,  features: ['Hasta 100 colaboradores', 'Dashboard basico', 'Prediccion mensual', 'Exportacion CSV', 'Soporte por correo'], cta: 'Comenzar' },
          { id: 'PROFESIONAL', name: 'Plan Profesional', priceGs: 1390000, highlight: true,  employeeLimit: 500,  features: ['Hasta 500 colaboradores', 'Dashboard avanzado', 'Prediccion semanal', 'Importacion masiva CSV', 'Soporte prioritario'], cta: 'Comenzar' },
          { id: 'CORPORATIVO', name: 'Plan Corporativo', priceGs: 2590000, highlight: false, employeeLimit: 1500, features: ['Hasta 1.500 colaboradores', 'Dashboard personalizado', 'Prediccion bajo demanda', 'Integracion HRIS', 'Gerente de cuenta'], cta: 'Consultar' },
        ]);
        setPayPerUse({ priceGs: 200000, collaboratorsBlock: 250, description: 'Gs. 200.000 por cada 250 colaboradores adicionales' });
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen bg-gray-900">
      <NavBar />

      {/* ── Hero ── */}
      <section className="relative overflow-hidden">
        {/* Fondo con gradiente y formas */}
        <div className="absolute inset-0 bg-gradient-to-br from-gray-900 via-primary-950 to-indigo-950" />
        <div className="absolute inset-0 opacity-30">
          <div className="absolute top-20 left-10 h-72 w-72 rounded-full bg-primary-600 blur-[128px]" />
          <div className="absolute bottom-10 right-20 h-96 w-96 rounded-full bg-indigo-600 blur-[128px]" />
          <div className="absolute top-40 right-1/3 h-48 w-48 rounded-full bg-violet-500 blur-[100px]" />
        </div>
        {/* Grid pattern sutil */}
        <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' viewBox=\'0 0 60 60\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'none\' fill-rule=\'evenodd\'%3E%3Cg fill=\'%23ffffff\' fill-opacity=\'1\'%3E%3Cpath d=\'M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z\'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")' }} />

        <div className="relative mx-auto max-w-6xl px-6 py-28 lg:py-36 text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary-500/30 bg-primary-500/10 px-4 py-1.5 text-xs font-semibold text-primary-300 backdrop-blur-sm mb-6">
            <span className="h-1.5 w-1.5 rounded-full bg-primary-400 animate-pulse" />
            Machine Learning aplicado a Recursos Humanos
          </div>

          <h1 className="text-4xl font-extrabold tracking-tight text-white sm:text-5xl lg:text-6xl leading-[1.1]">
            Predeci quien se va
            <br />
            <span className="bg-gradient-to-r from-primary-400 via-violet-400 to-indigo-400 bg-clip-text text-transparent">
              antes de que pase
            </span>
          </h1>

          <p className="mx-auto mt-6 max-w-2xl text-lg text-gray-400 leading-relaxed">
            Sistema de inteligencia de negocios que analiza datos de tu equipo de desarrollo
            y predice el riesgo de desercion de cada empleado. Datos reales, decisiones inteligentes.
          </p>

          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link to="/register" className="group rounded-xl bg-gradient-to-r from-primary-600 to-indigo-600 px-8 py-4 text-base font-semibold text-white shadow-lg shadow-primary-600/25 hover:shadow-xl hover:shadow-primary-500/30 transition-all duration-300 hover:-translate-y-0.5">
              Comenzar gratis
              <span className="ml-2 inline-block transition-transform group-hover:translate-x-1">&rarr;</span>
            </Link>
            <a href="#features" className="rounded-xl border border-gray-700 bg-gray-800/50 backdrop-blur-sm px-8 py-4 text-base font-semibold text-gray-300 hover:bg-gray-800 hover:text-white hover:border-gray-600 transition-all duration-200">
              Como funciona
            </a>
          </div>

          {/* Stats rapidas */}
          <div className="mt-16 grid grid-cols-3 gap-6 max-w-lg mx-auto">
            {[
              { value: '17', label: 'Variables analizadas' },
              { value: '93%', label: 'Precision en deteccion' },
              { value: '<2s', label: 'Tiempo de prediccion' },
            ].map((stat) => (
              <div key={stat.label} className="text-center">
                <p className="text-2xl font-bold text-white">{stat.value}</p>
                <p className="text-xs text-gray-500 mt-0.5">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Como funciona ── */}
      <section id="features" className="relative bg-gray-900 py-24">
        <div className="mx-auto max-w-6xl px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-extrabold text-white sm:text-4xl">Como funciona</h2>
            <p className="mt-3 text-gray-400 max-w-xl mx-auto">
              Tres pasos simples para empezar a predecir la desercion en tu equipo
            </p>
          </div>

          <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
            {[
              {
                step: '01',
                title: 'Carga tus datos',
                desc: 'Subi un CSV con los datos de tus empleados: rol, seniority, salario, antiguedad. El sistema valida y procesa todo automaticamente.',
                color: 'from-blue-500 to-cyan-500',
                icon: (
                  <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                  </svg>
                ),
              },
              {
                step: '02',
                title: 'El modelo predice',
                desc: 'Nuestro algoritmo de Machine Learning analiza 17 variables y calcula la probabilidad de desercion de cada empleado en segundos.',
                color: 'from-primary-500 to-violet-500',
                icon: (
                  <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                ),
              },
              {
                step: '03',
                title: 'Actua a tiempo',
                desc: 'Visualiza que empleados tienen mayor riesgo de irse y toma acciones preventivas: ajustes salariales, capacitacion, feedback.',
                color: 'from-green-500 to-emerald-500',
                icon: (
                  <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                ),
              },
            ].map((item) => (
              <div key={item.step} className="group relative rounded-2xl border border-gray-800 bg-gray-800/50 p-8 backdrop-blur-sm hover:border-gray-700 hover:bg-gray-800/80 transition-all duration-300">
                {/* Step number */}
                <span className="text-xs font-bold text-gray-600 uppercase tracking-widest">{item.step}</span>

                {/* Icon */}
                <div className={`mt-4 mb-5 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br ${item.color} text-white shadow-lg`}>
                  {item.icon}
                </div>

                <h3 className="text-lg font-bold text-white mb-2">{item.title}</h3>
                <p className="text-sm text-gray-400 leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Caracteristicas clave ── */}
      <section className="bg-gradient-to-b from-gray-900 to-gray-950 py-20">
        <div className="mx-auto max-w-6xl px-6">
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { title: 'Enfocado en Software', desc: 'Variables especificas para equipos de desarrollo: rol, seniority, horas extra, legacy code.', emoji: '💻' },
              { title: 'Contexto Paraguay', desc: 'Salarios en guaranies, realidad laboral local, contratos eventuales, mercado IT.', emoji: '🇵🇾' },
              { title: 'Multi-empresa', desc: 'Cada empresa tiene sus datos aislados con control de acceso por roles.', emoji: '🏢' },
              { title: 'Prediccion en segundos', desc: 'Resultados inmediatos al cargar datos. Sin esperas, sin configuracion compleja.', emoji: '⚡' },
            ].map((item) => (
              <div key={item.title} className="rounded-xl border border-gray-800 bg-gray-900/50 p-6 hover:border-gray-700 transition-colors">
                <span className="text-2xl">{item.emoji}</span>
                <h3 className="mt-3 text-sm font-bold text-white">{item.title}</h3>
                <p className="mt-1.5 text-xs text-gray-500 leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Planes ── */}
      <section id="planes" className="bg-gray-950 py-24">
        <div className="mx-auto max-w-6xl px-6">
          <div className="mb-14 text-center">
            <h2 className="text-3xl font-extrabold text-white sm:text-4xl">Planes de suscripcion</h2>
            <p className="mt-3 text-gray-400">Escalable segun el tamano de tu organizacion</p>
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
                <p className="mt-4 text-center text-sm italic text-gray-500 font-medium">
                  Modelo Pay-per-use: {payPerUse.description}
                </p>
              )}
            </>
          )}

          <p className="mt-6 text-center text-xs text-gray-600">
            Precios en Guaranies (Gs.). Al contratar aceptas nuestros{' '}
            <Link to="/terms" className="underline hover:text-gray-400 transition-colors">Terminos y condiciones</Link>.
          </p>
        </div>
      </section>

      {/* ── CTA final ── */}
      <section className="relative overflow-hidden py-24">
        <div className="absolute inset-0 bg-gradient-to-r from-primary-600 via-violet-600 to-indigo-600" />
        <div className="absolute inset-0 opacity-20">
          <div className="absolute top-0 left-1/4 h-64 w-64 rounded-full bg-white blur-[100px]" />
          <div className="absolute bottom-0 right-1/4 h-48 w-48 rounded-full bg-white blur-[80px]" />
        </div>
        <div className="relative mx-auto max-w-3xl px-6 text-center">
          <h2 className="text-3xl font-extrabold text-white sm:text-4xl">Listo para predecir la desercion en tu equipo?</h2>
          <p className="mt-4 text-lg text-white/80">
            Registra tu empresa y comenza a tomar decisiones basadas en datos.
          </p>
          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link to="/register" className="rounded-xl bg-white px-10 py-4 text-base font-bold text-primary-600 shadow-xl hover:bg-gray-50 transition-all duration-200 hover:-translate-y-0.5">
              Registrar empresa
            </Link>
            <Link to="/login" className="rounded-xl border-2 border-white/30 px-8 py-4 text-base font-semibold text-white hover:bg-white/10 hover:border-white/50 transition-all duration-200">
              Ya tengo cuenta
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
