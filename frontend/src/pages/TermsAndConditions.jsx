import { Link } from 'react-router-dom';

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
              <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <span className="text-lg font-bold text-gray-900">TalentIQ</span>
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

        {/* Encabezado */}
        <div className="mb-12">
          <h1 className="text-4xl font-extrabold text-gray-900">Términos y condiciones</h1>
          <p className="mt-3 text-sm text-gray-400">Última actualización: julio de 2026</p>
          <p className="mt-4 text-sm text-gray-600">
            Al acceder o utilizar la plataforma <strong>TalentIQ</strong> aceptás los presentes
            términos en su totalidad. Si no estás de acuerdo con alguna parte, no debés utilizar el servicio.
          </p>
        </div>

        <Section title="1. Descripción del servicio">
          <p>
            TalentIQ es una plataforma de análisis de recursos humanos que utiliza modelos de machine
            learning para predecir y gestionar la retención de talento dentro de las organizaciones.
          </p>
          <p>
            El servicio se ofrece en modalidad SaaS (Software as a Service) bajo los planes descritos
            en la página principal: <strong>Starter</strong>, <strong>Pro</strong> y <strong>Enterprise</strong>.
          </p>
        </Section>

        <Section title="2. Registro y cuenta">
          <p>
            Para acceder a las funcionalidades protegidas de la plataforma es necesario crear una cuenta
            con credenciales válidas. Sos responsable de mantener la confidencialidad de tu contraseña
            y de todas las actividades que ocurran bajo tu cuenta.
          </p>
          <p>
            TalentIQ se reserva el derecho de suspender o eliminar cuentas que incumplan estos términos,
            sin previo aviso y sin responsabilidad hacia el usuario.
          </p>
        </Section>

        <Section title="3. Uso aceptable">
          <p>Al utilizar TalentIQ te comprometés a no:</p>
          <ul className="list-disc pl-6 space-y-1">
            <li>Cargar datos falsos, maliciosos o que violen derechos de terceros.</li>
            <li>Intentar acceder sin autorización a otras cuentas o sistemas.</li>
            <li>Usar la plataforma con fines ilegales o en contra de la legislación vigente.</li>
            <li>Realizar ingeniería inversa, descompilar o desensamblar el software.</li>
            <li>Revender o sublicenciar el acceso a terceros sin autorización expresa.</li>
          </ul>
        </Section>

        <Section title="4. Datos y privacidad">
          <p>
            Los datos de empleados que cargues en la plataforma son de tu exclusiva responsabilidad.
            TalentIQ procesa dichos datos únicamente para brindar el servicio contratado y no los
            comparte con terceros sin tu consentimiento explícito, salvo obligación legal.
          </p>
          <p>
            Te comprometés a haber obtenido las autorizaciones necesarias de tus empleados antes de
            cargar sus datos personales, en cumplimiento de las leyes de protección de datos aplicables
            en tu jurisdicción.
          </p>
        </Section>

        <Section title="5. Propiedad intelectual">
          <p>
            Todo el software, diseño, logotipos, modelos de machine learning y documentación de
            TalentIQ son propiedad exclusiva de sus autores y están protegidos por las leyes de
            propiedad intelectual vigentes.
          </p>
          <p>
            El uso del servicio no te otorga ningún derecho de propiedad sobre la plataforma ni
            sus componentes.
          </p>
        </Section>

        <Section title="6. Planes y pagos">
          <p>
            El plan <strong>Starter</strong> es gratuito y puede estar sujeto a limitaciones funcionales.
            Los planes <strong>Pro</strong> y <strong>Enterprise</strong> son de pago y se facturan
            mensualmente según el precio vigente al momento de la contratación.
          </p>
          <p>
            TalentIQ se reserva el derecho de modificar los precios con un preaviso de 30 días.
            No se realizan reembolsos por períodos ya facturados, salvo disposición legal en contrario.
          </p>
        </Section>

        <Section title="7. Disponibilidad del servicio">
          <p>
            TalentIQ se compromete a mantener la disponibilidad del servicio en la medida de lo posible,
            pero no garantiza un funcionamiento ininterrumpido. Podrán existir interrupciones por
            mantenimiento programado, fuerza mayor o causas ajenas a nuestro control.
          </p>
          <p>
            El plan Enterprise incluye un SLA de disponibilidad del 99,9% según las condiciones
            específicas acordadas en el contrato.
          </p>
        </Section>

        <Section title="8. Limitación de responsabilidad">
          <p>
            En la máxima medida permitida por la ley, TalentIQ no será responsable por daños
            indirectos, incidentales, especiales o consecuentes derivados del uso o la imposibilidad
            de uso del servicio.
          </p>
          <p>
            La responsabilidad total de TalentIQ, en cualquier caso, estará limitada al importe
            abonado por el usuario durante los tres meses previos al evento que originó el reclamo.
          </p>
        </Section>

        <Section title="9. Modificaciones">
          <p>
            TalentIQ puede modificar estos términos en cualquier momento. Las modificaciones
            sustanciales serán comunicadas con al menos 15 días de anticipación mediante el
            correo electrónico registrado en tu cuenta.
          </p>
          <p>
            El uso continuado del servicio tras la entrada en vigencia de los cambios implica
            la aceptación de los nuevos términos.
          </p>
        </Section>

        <Section title="10. Ley aplicable y jurisdicción">
          <p>
            Estos términos se rigen por las leyes de la República del Paraguay. Cualquier
            disputa que surja en relación con estos términos será sometida a la jurisdicción
            de los tribunales competentes de Asunción, Paraguay.
          </p>
        </Section>

        <Section title="11. Contacto">
          <p>
            Para consultas relacionadas con estos términos podés escribirnos a{' '}
            <a href="mailto:legal@talentiq.com" className="text-blue-600 underline hover:text-blue-800">
              legal@talentiq.com
            </a>.
          </p>
        </Section>

      </main>

      {/* Footer mínimo */}
      <footer className="border-t border-gray-100 bg-white py-6 text-center text-xs text-gray-400">
        <p>© {new Date().getFullYear()} TalentIQ · <Link to="/legal" className="underline hover:text-gray-600">Aviso legal</Link></p>
      </footer>
    </div>
  );
}
