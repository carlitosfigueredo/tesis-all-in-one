---
inclusion: always
---

# Correos — Nodemailer y flujos de email

## Configuración

El servicio de correo usa **Nodemailer** con transporte SMTP configurable via variables de entorno. En desarrollo se puede usar Mailtrap o Mailhog (Docker) para no enviar correos reales.

### Variables de entorno requeridas

```env
SMTP_HOST=smtp.mailtrap.io
SMTP_PORT=587
SMTP_SECURE=false          # true para puerto 465
SMTP_USER=usuario_smtp
SMTP_PASS=password_smtp
SMTP_FROM="Sistema BI <noreply@tesis.com>"
FRONTEND_URL=http://localhost:5173
```

### Inicialización del transporter

Ubicar en `backend/src/services/email.service.js`:

```js
const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT),
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

// Verificar conexión al iniciar (solo en desarrollo)
if (process.env.NODE_ENV !== 'production') {
  transporter.verify().catch((err) => console.error('[Email] Error de conexion SMTP:', err.message));
}
```

---

## Estructura de los emails

Todos los correos deben:
- Estar escritos en **español paraguayo**: tuteo, tono directo y cercano, sin formalidades innecesarias.
- Tener asunto claro y sin signos de exclamación exagerados.
- Incluir el nombre del usuario en el saludo: `Hola, [Nombre].` (no "Estimado usuario").
- Incluir el nombre de la empresa (tenant) cuando sea relevante.
- Incluir un footer simple: `Este es un correo automatico. Por favor no respondas a este mensaje.`
- Tener versión texto plano como fallback (`text:`) además del HTML.

Crear templates en `backend/src/templates/email/`:
- `welcome.html`
- `reset-password.html`
- `password-changed.html`
- `account-locked.html`

### Tono de ejemplo por tipo de correo

| Correo | Asunto | Tono del cuerpo |
|---|---|---|
| Bienvenida | `Tu cuenta en [Sistema] esta lista` | Amigable, breve, con el enlace al login |
| Reset password | `Cambia tu contrasena — vale 5 minutos` | Directo, con alerta de expiración clara |
| Contrasena cambiada | `Tu contrasena fue cambiada` | Informativo, con alerta si no fue el usuario |
| Cuenta bloqueada | `Tu cuenta fue bloqueada temporalmente` | Claro, sin alarmar, con hora de desbloqueo |

---

## Flujos de email implementados

### 1. Bienvenida al registrarse

**Trigger:** Creación exitosa de un nuevo usuario (o nuevo tenant).  
**Asunto:** `Tu cuenta en [Nombre Sistema] esta lista`

Contenido en español paraguayo:
```
Hola, [Nombre].

Tu cuenta en [Nombre Sistema] fue creada correctamente.
Empresa: [Nombre del Tenant]

Podes ingresar desde aca:
[Boton: Ir al sistema] → enlace al login

Si no pediste esta cuenta, ignorá este correo.

---
Este es un correo automatico. Por favor no respondas a este mensaje.
```

```js
await sendWelcomeEmail({ to: user.email, name: user.name, tenantName: tenant.name });
```

---

### 2. Solicitud de reset de contraseña

**Trigger:** POST `/api/auth/forgot-password` con email válido y existente.  
**Asunto:** `Cambia tu contrasena — el enlace vale 5 minutos`

Contenido en español paraguayo:
```
Hola, [Nombre].

Recibimos una solicitud para cambiar la contrasena de tu cuenta.
El enlace de abajo vence en 5 minutos.

[Boton: Cambiar contrasena] → enlace con token

Si no pediste esto, ignorá este correo. Tu contrasena no cambio.

---
Este es un correo automatico. Por favor no respondas a este mensaje.
```

```js
await sendPasswordResetEmail({
  to: user.email,
  name: user.name,
  resetUrl: `${process.env.FRONTEND_URL}/reset-password?token=${token}`,
});
```

**Importante:** Si el email no existe en el sistema, NO enviar correo pero responder con el mismo mensaje genérico de éxito — no revelar si el email está registrado.

---

### 3. Confirmación de cambio de contraseña

**Trigger:** Reset de contraseña completado exitosamente.  
**Asunto:** `Tu contrasena fue cambiada`

Contenido en español paraguayo:
```
Hola, [Nombre].

Tu contrasena fue cambiada el [fecha] desde [IP].

Si no fuiste vos, cambia tu contrasena de inmediato o contacta al soporte.

[Boton: Cambiar contrasena ahora] → forgot-password

---
Este es un correo automatico. Por favor no respondas a este mensaje.
```

```js
await sendPasswordChangedEmail({
  to: user.email,
  name: user.name,
  ip: req.ip,
  timestamp: new Date().toISOString(),
});
```

---

### 4. Cuenta bloqueada por intentos fallidos

**Trigger:** El usuario supera el límite de intentos fallidos de login.  
**Asunto:** `Tu cuenta fue bloqueada temporalmente`

Contenido en español paraguayo:
```
Hola, [Nombre].

Tu cuenta fue bloqueada por 30 minutos debido a varios intentos de acceso fallidos.
Podes intentar de nuevo a partir de las [hora de desbloqueo].

Si no fuiste vos, te recomendamos cambiar tu contrasena:
[Boton: Cambiar contrasena] → forgot-password

---
Este es un correo automatico. Por favor no respondas a este mensaje.
```

```js
await sendAccountLockedEmail({
  to: user.email,
  name: user.name,
  lockedUntil: user.lockedUntil,
});
```

---

## Función genérica de envío

```js
// backend/src/services/email.service.js

const sendEmail = async ({ to, subject, html, text }) => {
  try {
    const info = await transporter.sendMail({
      from: process.env.SMTP_FROM,
      to,
      subject,
      html,
      text,
    });
    console.log(`[Email] Enviado a ${to}: ${info.messageId}`);
    return { success: true, messageId: info.messageId };
  } catch (err) {
    console.error(`[Email] Error al enviar a ${to}:`, err.message);
    // No propagar el error: el fallo de email no debe romper el flujo principal
    return { success: false, error: err.message };
  }
};
```

**Regla crítica:** El envío de correo nunca debe bloquear ni fallar el flujo principal de negocio. Usar `await` pero capturar el error y continuar. Loguear el fallo en `audit_logs` con status `WARNING`.

---

## Mailhog en desarrollo (Docker)

**IMPORTANTE:** En desarrollo, los correos NO llegan a Gmail ni a ningun correo real. Todos quedan capturados en Mailhog.

Para ver los correos enviados por el sistema, abrir **http://localhost:8025** en el browser. Ahi esta la bandeja de entrada con todos los emails (reset password, account locked, password changed, etc.)

El servicio Mailhog ya esta configurado en `docker-compose.yml`:

```yaml
mailhog:
  image: mailhog/mailhog:latest
  container_name: tesis_mailhog
  ports:
    - "1025:1025"   # SMTP
    - "8025:8025"   # Web UI
  networks:
    - tesis_network
```

Variables en `.env` para desarrollo (ya configuradas):
```env
SMTP_HOST=mailhog
SMTP_PORT=1025
SMTP_SECURE=false
SMTP_USER=
SMTP_PASS=
```

---

## Para enviar correos reales (Gmail SMTP)

Si se necesita que los correos lleguen a casillas reales (demo, produccion), configurar Gmail SMTP:

1. En la cuenta Google: Seguridad → Verificacion en 2 pasos → Contrasenas de aplicaciones
2. Generar una contrasena de app para "Correo"
3. Actualizar `.env`:

```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=tu_correo@gmail.com
SMTP_PASS=la_app_password_generada
SMTP_FROM="Sistema BI <tu_correo@gmail.com>"
```

4. Reiniciar el backend (`docker compose restart backend`)

**Nota:** Para la tesis, Mailhog en localhost:8025 es suficiente para demostrar que los correos funcionan correctamente. No es necesario configurar Gmail SMTP.
