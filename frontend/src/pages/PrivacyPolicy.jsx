import { Link } from 'react-router-dom';

// ─────────────────────────────────────────
// PrivacyPolicy.jsx — Política de Privacidad
// Cumple con Ley N.º 7593/2025 de Proteccion de Datos Personales (Paraguay)
// Basada en Modelo UNIDA — Modelos_Consentimiento_UNIDA.md
// Versión 1.0
// ─────────────────────────────────────────

const SystemIcon = () => (
  <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
  </svg>
);

const Section = ({ title, children }) => (
  <section className="mb-10">
    <h2 className="mb-3 text-xl font-bold text-gray-900 dark:text-gray-100">{title}</h2>
    <div className="space-y-3 text-sm leading-relaxed text-gray-600 dark:text-gray-300">{children}</div>
  </section>
);

const PRIVACY_VERSION = '1.0';
const LAST_UPDATE = 'agosto de 2026';
const CONTACT_EMAIL = 'carlosalberto.figueredoquevedo@gmail.com';

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors">

      {/* Navbar mínimo */}
      <header className="border-b border-gray-100 dark:border-gray-700 bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm sticky top-0 z-50">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <Link to="/" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600">
              <SystemIcon />
            </div>
            <span className="text-base font-bold text-gray-900 dark:text-gray-100">
              Sistema BI<span className="hidden sm:inline text-gray-400 dark:text-gray-500 font-normal"> · Retención de Talento</span>
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
          <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-blue-50 dark:bg-blue-900/30 px-3 py-1 text-xs font-medium text-blue-700 dark:text-blue-300">
            Versión {PRIVACY_VERSION}
          </div>
          <h1 className="text-4xl font-extrabold text-gray-900 dark:text-gray-100">Política de Privacidad</h1>
          <p className="mt-3 text-sm text-gray-400 dark:text-gray-500">Última actualización: {LAST_UPDATE}</p>
          <p className="mt-4 text-sm text-gray-600 dark:text-gray-300">
            Esta política describe cómo tratamos los datos personales en el Sistema BI de Retención de Talento,
            conforme a la <strong>Ley N.º 7593/2025 de Protección de Datos Personales</strong> de la República del Paraguay.
          </p>

          {/* Aviso de privacidad inline (resumen) */}
          <div className="mt-6 rounded-xl border border-blue-100 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20 p-4 text-sm text-blue-800 dark:text-blue-200">
            <strong>Aviso de Privacidad:</strong> Los datos personales que proporcionás en este sistema serán utilizados
            para gestionar tu cuenta y brindar los servicios de análisis de retención de talento contratados.
            El suministro de la información es voluntario. Para conocer el tratamiento completo de tus datos,
            leé esta Política de Privacidad.
          </div>
        </div>

        <Section title="1. Objeto">
          <p>
            La presente Política establece los criterios aplicables al tratamiento de datos personales en el
            Sistema BI de Retención de Talento, desarrollado como Trabajo Final de Grado de la carrera de
            Ingeniería Informática de la Universidad de la Integración de las Américas (UNIDA), Paraguay.
          </p>
          <p>
            En caso de que la solución sea implementada en un entorno real o de producción, la organización
            responsable deberá revisar y adecuar esta Política conforme a la normativa vigente.
          </p>
        </Section>

        <Section title="2. Responsable del tratamiento">
          <p>
            El responsable del tratamiento de los datos personales es el tesista autor del sistema.
            Para consultas sobre protección de datos podés contactarte a:
          </p>
          <p>
            Correo electrónico:{' '}
            <a href={`mailto:${CONTACT_EMAIL}`} className="text-blue-600 underline hover:text-blue-800">
              {CONTACT_EMAIL}
            </a>
          </p>
        </Section>

        <Section title="3. Datos personales recopilados">
          <p>El sistema puede recopilar, según la funcionalidad utilizada, los siguientes datos:</p>
          <div className="mt-3 overflow-hidden rounded-lg border border-gray-200">
            <table className="w-full text-xs">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left font-semibold text-gray-700">Categoría</th>
                  <th className="px-4 py-2 text-left font-semibold text-gray-700">Datos</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                <tr className="bg-white">
                  <td className="px-4 py-2 font-medium text-gray-700">Datos de cuenta</td>
                  <td className="px-4 py-2 text-gray-600">Nombre, correo electrónico, contraseña (almacenada con hash bcrypt)</td>
                </tr>
                <tr className="bg-gray-50">
                  <td className="px-4 py-2 font-medium text-gray-700">Datos de empresa</td>
                  <td className="px-4 py-2 text-gray-600">Nombre de la empresa, plan contratado, estado de suscripción</td>
                </tr>
                <tr className="bg-white">
                  <td className="px-4 py-2 font-medium text-gray-700">Datos de empleados</td>
                  <td className="px-4 py-2 text-gray-600">Datos laborales (edad, rol, antigüedad, salario, evaluaciones) cargados por la empresa para el análisis</td>
                </tr>
                <tr className="bg-gray-50">
                  <td className="px-4 py-2 font-medium text-gray-700">Datos de uso</td>
                  <td className="px-4 py-2 text-gray-600">Registros de auditoría (acción, fecha, dirección IP, user agent)</td>
                </tr>
                <tr className="bg-white">
                  <td className="px-4 py-2 font-medium text-gray-700">Datos de pago</td>
                  <td className="px-4 py-2 text-gray-600">Últimos 4 dígitos de la tarjeta, marca (Visa/Mastercard). No se almacena el número completo</td>
                </tr>
                <tr className="bg-gray-50">
                  <td className="px-4 py-2 font-medium text-gray-700">Consentimientos</td>
                  <td className="px-4 py-2 text-gray-600">Registro de aceptación de esta política, fecha, IP y versión del documento</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className="mt-3">
            El sistema únicamente solicita los datos estrictamente necesarios para cumplir las finalidades previstas.
          </p>
        </Section>

        <Section title="4. Finalidad del tratamiento">
          <p>Los datos personales son tratados exclusivamente para:</p>
          <ul className="list-disc pl-6 space-y-1">
            <li>Gestionar el registro e identificación de usuarios y empresas.</li>
            <li>Permitir el acceso a las funcionalidades del sistema según el rol asignado.</li>
            <li>Ejecutar el análisis predictivo de riesgo de deserción laboral mediante el modelo de machine learning.</li>
            <li>Administrar suscripciones y procesar pagos.</li>
            <li>Mantener registros de auditoría para seguridad y trazabilidad.</li>
            <li>Enviar correos transaccionales (confirmación de cuenta, recuperación de contraseña, notificaciones del sistema).</li>
            <li>Elaborar estadísticas e indicadores agregados del sistema.</li>
            <li>Garantizar la seguridad, integridad y disponibilidad del sistema.</li>
          </ul>
          <p>Los datos no serán utilizados para finalidades incompatibles con las aquí establecidas.</p>
        </Section>

        <Section title="5. Base jurídica del tratamiento">
          <p>
            El tratamiento de los datos personales se realiza conforme a la{' '}
            <strong>Ley N.° 7593/2025 de Protección de Datos Personales</strong> de la República del Paraguay.
          </p>
          <p>
            La base jurídica principal es el <strong>consentimiento del titular</strong>, el cual es obtenido
            de forma libre, previa, específica, informada e inequívoca al momento del registro. El sistema
            registra la evidencia del consentimiento incluyendo usuario, fecha, hora, versión de la política
            aceptada y dirección IP.
          </p>
        </Section>

        <Section title="6. Conservación de los datos">
          <p>
            Los datos personales se conservan durante el tiempo necesario para cumplir las finalidades
            descritas o mientras exista una relación contractual activa. Los registros de auditoría se
            conservan por un mínimo de 90 días.
          </p>
          <p>
            Una vez cumplida la finalidad o vencido el plazo aplicable, los datos serán eliminados,
            anonimizados o bloqueados conforme a la normativa vigente.
          </p>
        </Section>

        <Section title="7. Comunicación de datos a terceros">
          <p>
            Los datos personales no serán comunicados ni transferidos a terceros, salvo:
          </p>
          <ul className="list-disc pl-6 space-y-1">
            <li>Cuando exista una obligación legal que lo requiera.</li>
            <li>Cuando sea estrictamente necesario para la prestación del servicio (por ejemplo, proveedor de SMTP para envío de correos).</li>
            <li>Cuando el titular haya otorgado su consentimiento expreso.</li>
          </ul>
        </Section>

        <Section title="8. Seguridad de la información">
          <p>El sistema implementa las siguientes medidas técnicas para proteger los datos personales:</p>
          <ul className="list-disc pl-6 space-y-1">
            <li>Contraseñas almacenadas con hash bcrypt (factor de costo 12).</li>
            <li>Autenticación mediante tokens JWT con expiración de 8 horas.</li>
            <li>Control de acceso por roles y permisos (RBAC).</li>
            <li>Registro de auditoría de todas las acciones relevantes.</li>
            <li>Bloqueo automático de cuenta tras 5 intentos fallidos de login.</li>
            <li>Rate limiting en endpoints sensibles.</li>
            <li>Validación de entradas en frontend y backend.</li>
            <li>Cabeceras HTTP de seguridad (Helmet, CORS restringido).</li>
            <li>Comunicaciones cifradas mediante HTTPS en producción.</li>
          </ul>
        </Section>

        <Section title="9. Derechos del titular">
          <p>
            De acuerdo con la <strong>Ley N.° 7593/2025</strong>, el titular de los datos tiene derecho a:
          </p>
          <ul className="list-disc pl-6 space-y-1">
            <li><strong>Acceso:</strong> conocer qué datos personales suyos están siendo tratados.</li>
            <li><strong>Rectificación:</strong> solicitar la corrección de datos inexactos o incompletos.</li>
            <li><strong>Supresión:</strong> solicitar la eliminación de sus datos cuando corresponda.</li>
            <li><strong>Oposición:</strong> oponerse al tratamiento en los casos previstos por la ley.</li>
            <li><strong>Revocación del consentimiento:</strong> retirar el consentimiento otorgado, cuando el tratamiento se base en este.</li>
          </ul>
          <p>
            Para ejercer cualquiera de estos derechos, escribí a{' '}
            <a href={`mailto:${CONTACT_EMAIL}`} className="text-blue-600 underline hover:text-blue-800">
              {CONTACT_EMAIL}
            </a>.
          </p>
        </Section>

        <Section title="10. Uso de cookies y tecnologías de sesión">
          <p>
            El sistema utiliza únicamente cookies técnicas estrictamente necesarias para el funcionamiento
            del servicio, como las de sesión y autenticación (JWT almacenado en memoria del navegador).
            No se utilizan cookies de publicidad ni de seguimiento de terceros.
          </p>
        </Section>

        <Section title="11. Consentimiento informado">
          <p>
            Al registrarse en el sistema, el usuario manifiesta de forma expresa haber leído y comprendido
            esta Política de Privacidad y consiente el tratamiento de sus datos para las finalidades aquí
            descritas. La casilla de aceptación no está preseleccionada y el usuario debe marcarla
            voluntariamente.
          </p>
          <p>
            El sistema registra evidencia del consentimiento incluyendo: usuario, fecha y hora de aceptación,
            versión del documento aceptada, dirección IP y finalidad autorizada.
          </p>
        </Section>

        <Section title="12. Actualización de la política">
          <p>
            Esta Política puede actualizarse cuando sea necesario por cambios normativos, funcionales o
            tecnológicos. Los cambios serán publicados dentro del sistema indicando la fecha de última
            actualización y la versión vigente.
          </p>
          <p>
            Si los cambios son sustanciales, los usuarios serán notificados al correo registrado con
            al menos 15 días de anticipación.
          </p>
        </Section>

        <Section title="13. Marco normativo">
          <ul className="list-disc pl-6 space-y-2">
            <li>
              <strong>Ley N.° 7593/2025 de Protección de Datos Personales</strong> — Regula el tratamiento
              automatizado de datos de personas físicas en Paraguay.
            </li>
            <li>
              <strong>Constitución Nacional del Paraguay (1992)</strong> — Artículos 33 y 36, que garantizan
              el derecho a la intimidad y la inviolabilidad de los patrimonios documentales almacenados
              en medios tecnológicos.
            </li>
            <li>
              <strong>Ley N.° 4439/2011 de Delitos Informáticos</strong> — Marco de referencia para la
              seguridad y protección de datos en sistemas informáticos.
            </li>
          </ul>
        </Section>

        <Section title="14. Contacto">
          <p>
            Para cualquier consulta relacionada con el tratamiento de tus datos personales:
          </p>
          <p>
            Responsable: Tesista — Carrera de Ingeniería Informática, UNIDA
            <br />
            Correo electrónico:{' '}
            <a href={`mailto:${CONTACT_EMAIL}`} className="text-blue-600 underline hover:text-blue-800">
              {CONTACT_EMAIL}
            </a>
          </p>
        </Section>

        {/* Navegación entre documentos legales */}
        <div className="mt-12 rounded-xl border border-gray-100 bg-white p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-sm text-gray-500">¿Buscás otro documento?</p>
          <div className="flex flex-wrap gap-3 justify-end">
            <Link
              to="/terms"
              className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Términos y condiciones
            </Link>
            <Link
              to="/legal"
              className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Aviso legal
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

      <footer className="border-t border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800 py-6 text-center text-xs text-gray-400 dark:text-gray-500 transition-colors">
        <p>
          © {new Date().getFullYear()} Sistema BI — Retención de Talento. Trabajo de tesis académica.{' '}
          <Link to="/terms" className="underline hover:text-gray-600">Términos</Link>
          {' · '}
          <Link to="/legal" className="underline hover:text-gray-600">Aviso legal</Link>
        </p>
      </footer>
    </div>
  );
}
