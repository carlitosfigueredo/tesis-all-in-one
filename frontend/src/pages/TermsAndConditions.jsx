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

export default function TermsAndConditions() {
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
          <h1 className="text-4xl font-extrabold text-gray-900">Términos y condiciones</h1>
          <p className="mt-3 text-sm text-gray-400">Última actualización: julio de 2026</p>
          <p className="mt-4 text-sm text-gray-600">
            Al acceder o utilizar este sistema aceptás los presentes términos en su totalidad.
            Si no estás de acuerdo con alguna parte, no debés utilizar el servicio.
          </p>
        </div>

        <Section title="1. Descripción del sistema">
          <p>
            Este sistema es una plataforma de inteligencia de negocios basada en machine learning,
            orientada a la predicción de la fuga de talento y la optimización de estrategias de
            retención en empresas de desarrollo de software.
          </p>
          <p>
            El sistema fue desarrollado como trabajo de tesis académica en la República del Paraguay
            y se ofrece bajo los planes de acceso descritos en la página principal:
            <strong> Básico</strong>, <strong>Profesional</strong> y <strong>Empresarial</strong>.
          </p>
        </Section>

        <Section title="2. Registro y cuenta">
          <p>
            Para acceder a las funcionalidades protegidas del sistema es necesario contar con
            credenciales válidas. El usuario es responsable de mantener la confidencialidad de su
            contraseña y de todas las actividades realizadas desde su cuenta.
          </p>
          <p>
            Los responsables del sistema se reservan el derecho de suspender o eliminar cuentas que
            incumplan estos términos, sin previo aviso.
          </p>
        </Section>

        <Section title="3. Uso aceptable">
          <p>Al utilizar este sistema te comprometés a no:</p>
          <ul className="list-disc pl-6 space-y-1">
            <li>Cargar datos falsos, maliciosos o que violen derechos de terceros.</li>
            <li>Intentar acceder sin autorización a otras cuentas o al sistema subyacente.</li>
            <li>Utilizar la plataforma con fines ilegales o contrarios a la legislación vigente.</li>
            <li>Realizar ingeniería inversa, descompilar o desensamblar el software.</li>
            <li>Ceder o sublicenciar el acceso a terceros sin autorización expresa.</li>
          </ul>
        </Section>

        <Section title="4. Datos y privacidad">
          <p>
            Los datos de empleados que cargues en el sistema son de tu exclusiva responsabilidad.
            El sistema los procesa únicamente para brindar las funcionalidades contratadas y no los
            comparte con terceros sin tu consentimiento explícito, salvo obligación legal.
          </p>
          <p>
            Te comprometés a haber obtenido las autorizaciones necesarias de tus empleados antes
            de cargar sus datos personales, en cumplimiento de las leyes de protección de datos
            aplicables en tu jurisdicción.
          </p>
        </Section>

        <Section title="5. Propiedad intelectual">
          <p>
            El código fuente, diseño, modelos de machine learning y documentación del sistema
            son propiedad de sus autores y están protegidos por las leyes de propiedad
            intelectual vigentes en la República del Paraguay.
          </p>
          <p>
            El uso del sistema no otorga al usuario ningún derecho de propiedad sobre la
            plataforma ni sus componentes.
          </p>
        </Section>

        <Section title="6. Planes y facturación">
          <p>
            El plan <strong>Básico</strong> es gratuito y puede estar sujeto a limitaciones funcionales.
            Los planes <strong>Profesional</strong> y <strong>Empresarial</strong> son de pago y se
            facturan mensualmente según el precio vigente al momento de la contratación.
          </p>
          <p>
            Los responsables del sistema se reservan el derecho de modificar los precios con un
            preaviso de 30 días. No se realizan reembolsos por períodos ya facturados, salvo
            disposición legal en contrario.
          </p>
        </Section>

        <Section title="7. Disponibilidad del sistema">
          <p>
            Se procurará mantener la disponibilidad del sistema en la mayor medida posible, sin
            garantizar un funcionamiento ininterrumpido. Pueden existir interrupciones por
            mantenimiento programado, fuerza mayor o causas ajenas al control de los responsables.
          </p>
          <p>
            El plan Empresarial incluye un acuerdo de nivel de servicio (SLA) del 99,9 % según
            las condiciones específicas pactadas.
          </p>
        </Section>

        <Section title="8. Limitación de responsabilidad">
          <p>
            En la máxima medida permitida por la ley, los responsables del sistema no serán
            responsables por daños indirectos, incidentales, especiales o consecuentes derivados
            del uso o la imposibilidad de uso del servicio.
          </p>
          <p>
            La responsabilidad total, en cualquier caso, estará limitada al importe abonado por
            el usuario durante los tres meses previos al evento que originó el reclamo.
          </p>
        </Section>

        <Section title="9. Modificaciones">
          <p>
            Estos términos pueden modificarse en cualquier momento. Los cambios sustanciales serán
            comunicados con al menos 15 días de anticipación al correo registrado en la cuenta.
            El uso continuado del sistema tras la entrada en vigencia de los cambios implica su aceptación.
          </p>
        </Section>

        <Section title="10. Marco normativo">
          <p>
            El presente sistema opera en estricto cumplimiento del marco juridico vigente en la
            Republica del Paraguay. Las siguientes normativas rigen el tratamiento de datos,
            la seguridad informatica y la propiedad intelectual del software:
          </p>
          <ul className="list-disc pl-6 space-y-2">
            <li>
              <strong>Constitucion Nacional del Paraguay (1992)</strong> — Articulos 33 y 36,
              que garantizan el derecho a la intimidad y la inviolabilidad de los patrimonios
              documentales almacenados en medios tecnologicos.
            </li>
            <li>
              <strong>Ley N.° 7593/2025 de Proteccion de Datos Personales</strong> — Regula el
              tratamiento automatizado de datos de personas fisicas, exigiendo licitud en el
              procesamiento (Art. 5), medidas tecnicas de seguridad (Art. 12) y el ejercicio
              de los derechos ARCO por parte de los titulares (Art. 15).
            </li>
            <li>
              <strong>Ley N.° 4439/2011 de Delitos Informaticos</strong> — Tipifica las
              conductas de acceso indebido a datos (Art. 174 bis), intercepcion de datos
              (Art. 174 ter) y alteracion de datos (Art. 175), frente a las cuales el sistema
              implementa mecanismos de autenticacion y proteccion.
            </li>
            <li>
              <strong>Ley N.° 1328/1998 de Derechos de Autor y Derechos Conexos</strong> —
              Protege el codigo fuente del sistema como obra literaria (Arts. 2 y 7) y establece
              los derechos morales y patrimoniales del autor sobre el software (Art. 67).
            </li>
          </ul>
        </Section>

        <Section title="11. Ley aplicable y jurisdiccion">
          <p>
            Estos terminos se rigen por las leyes de la Republica del Paraguay. Cualquier disputa
            sera sometida a la jurisdiccion de los tribunales competentes de Asuncion, Paraguay.
          </p>
        </Section>

        <Section title="12. Contacto">
          <p>
            Para consultas sobre estos términos escribí a{' '}
            <a href="mailto:soporte@sistemabi.edu.py" className="text-blue-600 underline hover:text-blue-800">
              soporte@sistemabi.edu.py
            </a>.
          </p>
        </Section>

      </main>

      <footer className="border-t border-gray-100 bg-white py-6 text-center text-xs text-gray-400">
        <p>
          © {new Date().getFullYear()} Sistema BI — Retención de Talento. Trabajo de tesis académica.{' '}
          <Link to="/legal" className="underline hover:text-gray-600">Aviso legal</Link>
        </p>
      </footer>
    </div>
  );
}
