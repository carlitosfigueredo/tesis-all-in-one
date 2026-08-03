---
inclusion: always
---

# Seguridad — OWASP, contraseñas y autenticación

## Principios generales

Este proyecto aplica las guías OWASP Top 10 y OWASP ASVS (Application Security Verification Standard) como marco de referencia. Cada decisión de seguridad debe poder justificarse con uno de estos estándares para la tesis.

Regla base: **defense in depth**. No confiar en una sola capa. Validar en frontend, backend y BD.

---

## A01 — Control de acceso (Broken Access Control)

- Todo endpoint protegido usa el middleware `authenticate` (verifica JWT) + `requireTenant` (inyecta `tenantId` del token al request).
- Nunca aceptar `tenantId` como parámetro del cliente. Siempre tomarlo del JWT decodificado.
- Verificar que el recurso solicitado pertenece al `tenantId` del usuario antes de retornarlo.
- Los roles del sistema son: `SUPER_ADMIN` (global), `ADMIN` (tenant), `ANALYST` (tenant), `VIEWER` (tenant).
- Usar un guard de roles por endpoint: `requireRole(['ADMIN', 'ANALYST'])`.

```js
// Ejemplo de guard en ruta
router.get('/employees', authenticate, requireRole(['ADMIN', 'ANALYST']), getEmployees);
```

---

## A02 — Fallas criptográficas (Cryptographic Failures)

- Contraseñas hasheadas con **bcrypt**, cost factor mínimo 12 en producción, 10 en desarrollo.
- Tokens JWT firmados con `HS256` usando un secreto de al menos 32 caracteres aleatorios.
- Tokens de reset de contraseña: UUID v4 generado con `crypto.randomUUID()`, nunca predecible.
- No loguear contraseñas, tokens ni datos sensibles en ningún nivel.
- Las variables `JWT_SECRET`, `DATABASE_URL` y `SMTP_*` van exclusivamente en `.env`.

---

## A03 — Inyección (Injection)

- Usar **siempre** Prisma ORM con parámetros tipados. Nunca construir queries con template strings.
- Sanitizar inputs de texto con `validator.js` o `zod` antes de pasarlos a Prisma.
- En el ml-service (Python), usar parámetros nombrados en cualquier query SQL directa.

---

## A05 — Mala configuración de seguridad (Security Misconfiguration)

- `helmet()` activo en Express con configuración estricta de CSP.
- CORS restringido: solo el dominio del frontend definido en `FRONTEND_URL`.
- En producción: `NODE_ENV=production`, desactivar stack traces en respuestas de error.
- Rate limiting activo en endpoints sensibles (login, registro, reset password).

```js
// Rate limit para login: max 5 intentos por IP cada 15 minutos
const loginLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 5 });
```

---

## A07 — Fallas de autenticación (Identification and Authentication Failures)

### Política de contraseñas (NIST SP 800-63B + OWASP)

Las contraseñas deben cumplir los requisitos configurados en BD (`system_configs` clave `password_policy`). Los valores por defecto son:

| Regla | Valor por defecto | Configurable |
|---|---|---|
| Longitud mínima | 8 caracteres | Sí (4–32) |
| Longitud máxima | 128 caracteres | Sí (32–256) |
| Requiere mayúscula | Sí | Sí |
| Requiere minúscula | Sí | Sí |
| Requiere número | Sí | Sí |
| Requiere carácter especial | Sí (`!@#$%^&*`) | Sí |
| No puede contener el email del usuario | Sí | No |
| No puede ser una contraseña común | Sí (lista interna) | No |

El SUPER_ADMIN puede editar la política desde `/admin/settings/password-policy`.

La validación reutilizable `validatePasswordPolicy(password, policy, user)` recibe la política como parámetro (viene de `getPasswordPolicy()` que lee de BD con cache de 1 min). Ver `backend/src/utils/password.utils.js`.

```js
// Ejemplo de uso en el controller
const policy = await getPasswordPolicy();
const result = validatePasswordPolicy(newPassword, policy, req.user);
if (!result.valid) {
  return res.status(400).json({ success: false, errors: result.errors });
}
```

### Bloqueo de cuenta por intentos fallidos

- Registrar cada intento fallido de login en `audit_logs` con IP y user-agent.
- Despues de **5 intentos fallidos** en 15 minutos para el mismo email: bloquear la cuenta por 30 minutos.
- El campo `lockedUntil` en la tabla `users` maneja el bloqueo temporal.
- Notificar al usuario por correo cuando su cuenta sea bloqueada.

### Cambio obligatorio de contrasena (primer login)

- Cuando el admin crea un usuario, se setea `mustChangePassword: true`
- Al loguearse, el frontend detecta `user.mustChangePassword === true`
- PrivateRoute redirige a ForceChangePassword (no puede navegar a otro lado)
- Endpoint `POST /auth/force-change-password` (no requiere pass actual, solo funciona si mustChangePassword=true)
- Al cambiar, se pone `mustChangePassword: false`
- El usuario creado por register (el admin de empresa) NO tiene mustChangePassword (el crea su propia pass)

### Cambio de contrasena voluntario

- Pagina `/profile` con formulario de cambio (requiere pass actual)
- Endpoint `POST /auth/change-password` (requiere estar autenticado + pass actual)
- Usa `validatePasswordPolicy()` para validar la nueva pass
- Envia correo de confirmacion al cambiar

### Expiración de sesion

- JWT con expiración de **8 horas** en uso normal.
- Refresh token opcional con expiración de 7 días, almacenado en `refresh_tokens`.
- Al cerrar sesión, invalidar el refresh token en BD (no se puede invalidar el JWT, usar lista negra si es crítico).

---

## Flujo de restauración de contraseña

Este flujo debe implementarse exactamente así:

```
1. Usuario solicita reset → POST /api/auth/forgot-password { email }
2. Backend: busca usuario por email
   - Si no existe: responder igual que si existiera (no revelar si el email está registrado)
   - Si existe: leer TTL desde BD (getResetTokenConfig().ttlMinutes)
               generar token = crypto.randomUUID(), guardar hash del token en BD con expiresAt = now + ttlMinutes
3. Enviar correo con enlace: https://<frontend>/reset-password?token=<token>
4. Usuario llega al formulario → POST /api/auth/reset-password { token, newPassword, confirmPassword }
5. Backend:
   a. Buscar token en BD (por hash), verificar que no esté expirado y no esté usado
   b. Validar política de contraseña (getPasswordPolicy() + validatePasswordPolicy)
   c. Hashear nueva contraseña con bcrypt
   d. Actualizar contraseña del usuario
   e. Marcar token como usado (usedAt = now)
   f. Registrar en audit_logs: acción PASSWORD_RESET, userId, ip
   g. Enviar correo de confirmación de cambio de contraseña
6. Si el token expiró o ya fue usado: responder 400 con mensaje genérico
```

- El token se guarda como hash SHA-256 en BD, nunca el valor plano.
- TTL configurable desde BD (`reset_token_config.ttlMinutes`, default 5 min). El SUPER_ADMIN puede cambiarlo desde `/admin/settings/reset-token`.
- Un token solo puede usarse una vez (`usedAt` no nulo = inválido).

---

## A09 — Logging y monitoreo insuficiente

Ver `auditoria.md` para el detalle completo. Regla clave: **todo intento de autenticación** (exitoso o fallido) debe quedar en `audit_logs`.

---

## Headers de seguridad HTTP recomendados

Configurar con `helmet()`:

```
Strict-Transport-Security: max-age=31536000; includeSubDomains
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: geolocation=(), microphone=(), camera=()
```

---

## Validación de inputs con Zod

Usar **Zod** como librería de validación de esquemas en el backend. Crear schemas en `src/schemas/` y validar en los controllers antes de cualquier lógica de negocio.

Los mensajes de error de Zod deben estar en español paraguayo, directos y claros:

```js
// src/schemas/auth.schema.js
const { z } = require('zod');

const loginSchema = z.object({
  email: z.string({ required_error: 'El correo es obligatorio' })
    .email('Ingresa un correo valido')
    .max(254, 'El correo es demasiado largo'),
  password: z.string({ required_error: 'La contrasena es obligatoria' })
    .min(1, 'La contrasena no puede estar vacia')
    .max(128, 'La contrasena es demasiado larga'),
});

const forgotPasswordSchema = z.object({
  email: z.string({ required_error: 'El correo es obligatorio' })
    .email('Ingresa un correo valido')
    .max(254),
});

const resetPasswordSchema = z.object({
  token: z.string({ required_error: 'El token es obligatorio' }).min(1),
  newPassword: z.string({ required_error: 'La nueva contrasena es obligatoria' })
    .min(8, 'La contrasena tiene que tener al menos 8 caracteres')
    .max(128),
  confirmPassword: z.string(),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: 'Las contrasenas no coinciden',
  path: ['confirmPassword'],
});

module.exports = { loginSchema, forgotPasswordSchema, resetPasswordSchema };
```

## Mensajes de error estándar de la API

Usar siempre estos mensajes en español paraguayo para mantener consistencia:

```js
// src/constants/messages.js
const MSG = {
  // Auth
  INVALID_CREDENTIALS:    'El correo o la contrasena no son correctos',
  ACCOUNT_LOCKED:         'Tu cuenta fue bloqueada. Intenta de nuevo mas tarde',
  ACCOUNT_INACTIVE:       'Tu cuenta esta desactivada. Contacta al administrador',
  TOKEN_INVALID:          'El enlace no es valido o ya fue usado',
  TOKEN_EXPIRED:          'El enlace vencio. Solicita uno nuevo',
  EMAIL_SENT:             'Si el correo existe, vas a recibir un enlace en breve',
  PASSWORD_CHANGED:       'Tu contrasena fue cambiada correctamente',
  // General
  NOT_FOUND:              'No se encontro lo que buscabas',
  FORBIDDEN:              'No tenes permiso para hacer eso',
  UNAUTHORIZED:           'Tenes que iniciar sesion primero',
  SERVER_ERROR:           'Algo salio mal. Intenta de nuevo',
  VALIDATION_ERROR:       'Revisa los datos ingresados',
  // Recursos
  EMPLOYEE_NOT_FOUND:     'No se encontro el empleado',
  USER_NOT_FOUND:         'No se encontro el usuario',
  TENANT_NOT_FOUND:       'No se encontro la empresa',
};

module.exports = { MSG };
```
