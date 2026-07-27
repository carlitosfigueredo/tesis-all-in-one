// src/schemas/auth.schema.js
// Schemas de validacion con Zod para endpoints de autenticacion.
// Zod se instala con npm install dentro del contenedor Docker.
// Si no esta disponible (dev local sin npm install), el middleware
// hace pass-through y la validacion basica queda en el controller.

let z;
try {
  // zod v3: el export default es el objeto z
  const zod = require('zod');
  z = zod.z ?? zod;
} catch {
  z = null;
  console.warn('[Auth Schema] Zod no disponible — validacion de schemas desactivada');
}

// ─── Middleware factory ───────────────────────────────────────────────────────

/**
 * Valida req.body contra un schema Zod.
 * Si Zod no esta instalado, hace pass-through (no bloquea la ruta).
 * Uso: router.post('/login', validate(loginSchema), loginController)
 */
const validate = (schema) => (req, res, next) => {
  // Si Zod no esta disponible, saltar validacion
  if (!schema || !z) return next();

  const result = schema.safeParse(req.body);
  if (!result.success) {
    const errors = result.error.errors.map((e) => ({
      field:   e.path.join('.'),
      message: e.message,
    }));
    return res.status(400).json({
      success: false,
      message: 'Revisa los datos ingresados',
      errors,
    });
  }
  // Reemplazar req.body con datos parseados/transformados (lowercase, trim, etc.)
  req.body = result.data;
  next();
};

// ─── Schemas ─────────────────────────────────────────────────────────────────
// Se definen solo si Zod esta disponible, de lo contrario son null.

const loginSchema = z
  ? z.object({
      email: z
        .string({ required_error: 'El correo es obligatorio' })
        .email('Ingresa un correo valido')
        .max(254, 'El correo es demasiado largo')
        .transform((v) => v.toLowerCase().trim()),
      password: z
        .string({ required_error: 'La contrasena es obligatoria' })
        .min(1, 'La contrasena no puede estar vacia')
        .max(128, 'La contrasena es demasiado larga'),
    })
  : null;

const forgotPasswordSchema = z
  ? z.object({
      email: z
        .string({ required_error: 'El correo es obligatorio' })
        .email('Ingresa un correo valido')
        .max(254, 'El correo es demasiado largo')
        .transform((v) => v.toLowerCase().trim()),
    })
  : null;

const resetPasswordSchema = z
  ? z
      .object({
        token: z
          .string({ required_error: 'El token es obligatorio' })
          .min(1, 'El token no puede estar vacio'),
        newPassword: z
          .string({ required_error: 'La nueva contrasena es obligatoria' })
          .min(8, 'La contrasena tiene que tener al menos 8 caracteres')
          .max(128, 'La contrasena no puede tener mas de 128 caracteres'),
        confirmPassword: z.string({ required_error: 'Confirma tu contrasena' }),
      })
      .refine((data) => data.newPassword === data.confirmPassword, {
        message: 'Las contrasenas no coinciden',
        path: ['confirmPassword'],
      })
  : null;

module.exports = { loginSchema, forgotPasswordSchema, resetPasswordSchema, validate };
