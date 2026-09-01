// src/schemas/auth.schema.js
// Schemas Zod para endpoints de autenticacion.
// La validacion real de politica de contrasenas se hace en el controller
// via validatePasswordPolicy() + getPasswordPolicy() (lee de BD).
// Aqui solo validamos tipos, formato y longitud maxima tecnica.

const { isKnownInvalidDomain } = require('../utils/emailDomain.utils');

let z;
try {
  const zod = require('zod');
  z = zod.z ?? zod;
} catch {
  z = null;
  console.warn('[Auth Schema] Zod no disponible — validacion de schemas desactivada');
}

// Mensaje único para dominios de correo inexistentes / mal escritos.
const INVALID_DOMAIN_MSG = 'El dominio del correo no existe o está mal escrito. Revisá que sea correcto (ej. gmail.com)';

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
      message: 'Revisá los datos ingresados',
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
        .email('Ingresá un correo válido')
        .max(254, 'El correo es demasiado largo')
        .transform((v) => v.toLowerCase().trim()),
      password: z
        .string({ required_error: 'La contraseña es obligatoria' })
        .min(1, 'La contraseña no puede estar vacía')
        .max(256, 'La contraseña es demasiado larga'),
    })
  : null;

const forgotPasswordSchema = z
  ? z.object({
      email: z
        .string({ required_error: 'El correo es obligatorio' })
        .email('Ingresá un correo válido')
        .max(254, 'El correo es demasiado largo')
        .transform((v) => v.toLowerCase().trim()),
    })
  : null;

const resetPasswordSchema = z
  ? z
      .object({
        token: z
          .string({ required_error: 'El token es obligatorio' })
          .min(1, 'El token no puede estar vacío'),
        newPassword: z
          .string({ required_error: 'La nueva contraseña es obligatoria' })
          .min(1, 'La contraseña no puede estar vacía')
          .max(256, 'La contraseña es demasiado larga'),
        confirmPassword: z.string({ required_error: 'Confirmá tu contraseña' }),
      })
      .refine((data) => data.newPassword === data.confirmPassword, {
        message: 'Las contraseñas no coinciden',
        path: ['confirmPassword'],
      })
  : null;

// Schema de consentimiento individual
const consentItemSchema = z
  ? z.object({
      accepted: z.boolean(),
      version:  z.string().default('1.0'),
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
          errorMap: () => ({ message: 'Plan inválido' }),
        })
        .default('BASICO'),
      name: z
        .string({ required_error: 'Tu nombre es obligatorio' })
        .min(2, 'El nombre debe tener al menos 2 caracteres')
        .max(200, 'El nombre es demasiado largo')
        .transform((v) => v.trim()),
      email: z
        .string({ required_error: 'El correo es obligatorio' })
        .email('Ingresá un correo válido')
        .max(254, 'El correo es demasiado largo')
        .transform((v) => v.toLowerCase().trim())
        // Capa 1: rechaza dominios inexistentes / typos conocidos (síncrono).
        .refine((email) => !isKnownInvalidDomain(email), {
          message: INVALID_DOMAIN_MSG,
        }),
      password: z
        .string({ required_error: 'La contraseña es obligatoria' })
        .min(1, 'La contraseña no puede estar vacía')
        .max(256, 'La contraseña es demasiado larga'),
      confirmPassword: z.string({ required_error: 'Confirmá tu contraseña' }),
      // Consentimientos — pasados por el frontend, validados en el controller
      consents: z
        .object({
          privacyPolicy:      consentItemSchema,
          termsAndConditions: consentItemSchema,
        })
        .optional(),
      // reCAPTCHA token — opcional en schema (el middleware de recaptcha lo valida aparte)
      recaptchaToken: z.string().optional(),
    })
    .refine((data) => data.password === data.confirmPassword, {
      message: 'Las contraseñas no coinciden',
      path: ['confirmPassword'],
    })
  : null;

module.exports = { loginSchema, forgotPasswordSchema, resetPasswordSchema, registerSchema, validate };
