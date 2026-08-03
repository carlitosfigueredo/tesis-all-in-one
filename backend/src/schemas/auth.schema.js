// src/schemas/auth.schema.js
// Schemas Zod para endpoints de autenticacion.
// La validacion real de politica de contrasenas se hace en el controller
// via validatePasswordPolicy() + getPasswordPolicy() (lee de BD).
// Aqui solo validamos tipos, formato y longitud maxima tecnica.

let z;
try {
  const zod = require('zod');
  z = zod.z ?? zod;
} catch {
  z = null;
  console.warn('[Auth Schema] Zod no disponible — validacion de schemas desactivada');
}

// ─── Middleware factory ───────────────────────────────────────────────────────

const validate = (schema) => (req, res, next) => {
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
  req.body = result.data;
  next();
};

// ─── Schemas ─────────────────────────────────────────────────────────────────

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
        .max(256, 'La contrasena es demasiado larga'),
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
          .min(1, 'La contrasena no puede estar vacia')
          .max(256, 'La contrasena es demasiado larga'),
        confirmPassword: z.string({ required_error: 'Confirma tu contrasena' }),
      })
      .refine((data) => data.newPassword === data.confirmPassword, {
        message: 'Las contrasenas no coinciden',
        path: ['confirmPassword'],
      })
  : null;

const registerSchema = z
  ? z.object({
      companyName: z
        .string({ required_error: 'El nombre de la empresa es obligatorio' })
        .min(2, 'El nombre debe tener al menos 2 caracteres')
        .max(200, 'El nombre es demasiado largo')
        .transform((v) => v.trim()),
      plan: z
        .enum(['BASICO', 'PROFESIONAL', 'CORPORATIVO'], {
          errorMap: () => ({ message: 'Plan invalido' }),
        })
        .default('BASICO'),
      name: z
        .string({ required_error: 'Tu nombre es obligatorio' })
        .min(2, 'El nombre debe tener al menos 2 caracteres')
        .max(200, 'El nombre es demasiado largo')
        .transform((v) => v.trim()),
      email: z
        .string({ required_error: 'El correo es obligatorio' })
        .email('Ingresa un correo valido')
        .max(254, 'El correo es demasiado largo')
        .transform((v) => v.toLowerCase().trim()),
      password: z
        .string({ required_error: 'La contrasena es obligatoria' })
        .min(1, 'La contrasena no puede estar vacia')
        .max(256, 'La contrasena es demasiado larga'),
      confirmPassword: z.string({ required_error: 'Confirma tu contrasena' }),
    })
    .refine((data) => data.password === data.confirmPassword, {
      message: 'Las contrasenas no coinciden',
      path: ['confirmPassword'],
    })
  : null;

module.exports = { loginSchema, forgotPasswordSchema, resetPasswordSchema, registerSchema, validate };
