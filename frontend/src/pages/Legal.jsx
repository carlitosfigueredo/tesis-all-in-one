import { Link } from 'react-router-dom';

const SystemIcon = () => (
  <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
  </svg>
);

const Section = ({ title, children }) => (
  <section className="mb-10">
    <h2 className="mb-3 text-xl font-bold text-gray-900">{title}</h2>
    <div className="space-y-3 text-sm leading-relaxed text-gray-600">{children}</div>
  </section>
);

export default function Legal() {
  return (
    <div className="min-h-screen bg-gray-50">

      {/* Navbar mínimo */}
      <header className="border-b border-gray-100 bg-white/90 backdrop-blur-sm sticky top-0 z-50">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <Link to="/" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600">
              <SystemIcon />
            </div>
            <span className="text-base font-bold text-gray-900">
              Sistema BI<span className="hidden sm:inline text-gray-400 font-normal"> · Retención de Talento</span>
            </span>
          </Link>
          <Link
            to="/login"
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 transition-colors"
          >
            Iniciar sesión
          </Link>
        </div>
      </header>

      {/* Contenido */}
      <main className="mx-auto max-w-3xl px-6 py-16">

        <div className="mb-12">
          <h1 className="text-4xl font-extrabold text-gray-900">Aviso legal</h1>
          <p className="mt-3 text-sm text-gray-400">Última actualización: julio de 2026</p>
          <p className="mt-4 text-sm text-gray-600">
            El presente aviso regula el acceso y uso del sistema de inteligencia de negocios para
            la predicción de fuga de talento, así como la responsabilidad derivada de la información
            contenida en él.
          </p>
        </div>

        <Section title="1. Titularidad del sistema">
          <p>
            Este sistema fue desarrollado en el marco de la tesis{' '}
            <em>
              "Diseño e implementación de un sistema de inteligencia de negocios basado en machine
              learning para la predicción de la fuga de talento y la optimización de estrategias
              de retención en empresas de desarrollo de software de Asunción, 2026"
            </em>.
          </p>
          <p>
            Los derechos de autor y propiedad intelectual corresponden a sus autores, conforme
            a la legislación paraguaya vigente.
          </p>
          <p>
            Consultas legales:{' '}
            <a href="mailto:soporte@sistemabi.edu.py" className="text-blue-600 underline hover:text-blue-800">
              soporte@sistemabi.edu.py
            </a>.
          </p>
        </Section>

        <Section title="2. Propiedad intelectual">
          <p>
            Todos los contenidos del sistema —incluyendo código fuente, diseño visual, modelos
            de machine learning, textos e iconografía— están protegidos por las leyes de propiedad
            intelectual vigentes en la República del Paraguay.
          </p>
          <p>
            Queda estrictamente prohibida su reproducción total o parcial, distribución,
            comunicación pública o transformación sin autorización expresa y por escrito
            de los titulares.
          </p>
        </Section>

        <Section title="3. Datos personales y privacidad">
          <p>
            El sistema trata los datos personales de los usuarios y de los empleados cargados
            conforme a la{' '}
            <strong>Ley N.º 6534/2020 de Protección de Datos Personales</strong> de la República
            del Paraguay y, en lo aplicable, al Reglamento General de Protección de Datos (RGPD).
          </p>
          <p>
            Los datos son utilizados exclusivamente para la prestación del servicio. No se ceden
            a terceros salvo obligación legal o instrucción expresa del responsable del tratamiento.
          </p>
          <p>
            Los titulares de los datos tienen derecho de acceso, rectificación, cancelación y
            oposición. Para ejercerlos escribí a{' '}
            <a href="mailto:soporte@sistemabi.edu.py" className="text-blue-600 underline hover:text-blue-800">
              soporte@sistemabi.edu.py
            </a>.
          </p>
        </Section>

        <Section title="4. Cookies y tecnologías de sesión">
          <p>
            El sistema puede utilizar cookies técnicas estrictamente necesarias para el
            funcionamiento del servicio, como las de sesión y autenticación. No se utilizan
            cookies de publicidad ni de seguimiento de terceros.
          </p>
          <p>
            Al acceder al sistema aceptás el uso de estas cookies técnicas. Podés configurar
            tu navegador para rechazarlas, aunque esto puede afectar algunas funcionalidades.
          </p>
        </Section>

        <Section title="5. Responsabilidad sobre el contenido">
          <p>
            Los responsables del sistema no asumen responsabilidad por los datos cargados por los
            usuarios, ni por las decisiones organizacionales tomadas a partir de las predicciones
            del modelo de machine learning.
          </p>
          <p>
            Los resultados del modelo son de carácter orientativo y no constituyen dictámenes
            legales, laborales ni de ningún otro tipo. El usuario es el único responsable del uso
            que haga de la información proporcionada por el sistema.
          </p>
        </Section>

        <Section title="6. Contexto académico">
          <p>
            Este sistema fue construido en el contexto de una investigación académica. Los datos
            de entrenamiento del modelo provienen del dataset público{' '}
            <strong>IBM HR Analytics Employee Attrition &amp; Performance</strong>, disponible
            bajo licencia abierta.
          </p>
          <p>
            El sistema no está afiliado, patrocinado ni respaldado por IBM Corporation ni por
            ninguna otra empresa privada.
          </p>
        </Section>

        <Section title="7. Jurisdicción aplicable">
          <p>
            Este aviso legal se rige por la legislación de la República del Paraguay. Cualquier
            controversia relacionada con el acceso o uso del sistema será sometida a la
            jurisdicción de los tribunales competentes de la ciudad de Asunción.
          </p>
        </Section>

        <Section title="8. Modificaciones del aviso">
          <p>
            Este aviso puede modificarse en cualquier momento. Los cambios entrarán en vigencia
            desde su publicación en el sistema. El uso continuado implica la aceptación de
            las modificaciones realizadas.
          </p>
        </Section>

        {/* Navegación entre documentos */}
        <div className="mt-12 rounded-xl border border-gray-100 bg-white p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-sm text-gray-500">¿Buscás otro documento?</p>
          <div className="flex gap-4">
            <Link
              to="/terms"
              className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Términos y condiciones
            </Link>
            <Link
              to="/"
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
            >
              Volver al inicio
            </Link>
          </div>
        </div>

      </main>

      <footer className="border-t border-gray-100 bg-white py-6 text-center text-xs text-gray-400">
        <p>
          © {new Date().getFullYear()} Sistema BI — Retención de Talento. Trabajo de tesis académica.{' '}
          <Link to="/terms" className="underline hover:text-gray-600">Términos y condiciones</Link>
        </p>
      </footer>
    </div>
  );
}
