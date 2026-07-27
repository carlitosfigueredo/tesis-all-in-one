// src/schemas/auth.schema.js
// Schemas de validacion con Zod para endpoints de autenticacion

const { z } = require('zod');

const loginSchema = z.object({
  email: z
    .string({ required_error: 'El correo es obligatorio' })
    .email('Ingresa un correo valido')
    .max(254, 'El correo es demasiado largo')
    .toLowerCase(),
  password: z
    .string({ required_error: 'La contrasena es obligatoria' })
    .min(1, 'La contrasena no puede estar vacia')
    .max(128, 'La contrasena es demasiado larga'),
});

const forgotPasswordSchema = z.object({
  email: z
    .string({ required_error: 'El correo es obligatorio' })
    .email('Ingresa un correo valido')
    .max(254, 'El correo es demasiado largo')
    .toLowerCase(),
});

const resetPasswordSchema = z
  .object({
    token: z
      .string({ required_error: 'El token es obligatorio' })
      .min(1, 'El token no puede estar vacio'),
    newPassword: z
      .string({ required_error: 'La nueva contrasena es obligatoria' })
      .min(8, 'La contrasena tiene que tener al menos 8 caracteres')
      .max(128, 'La contrasena no puede tener mas de 128 caracteres'),
    confirmPassword: z
      .string({ required_error: 'Confirma tu contrasena' }),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'Las contrasenas no coinciden',
    path: ['confirmPassword'],
  });

/**
 * Middleware factory de validacion Zod para usar en rutas Express.
 * Uso: router.post('/login', validate(loginSchema), loginController)
 */
const validate = (schema) => (req, res, next) => {
  const result = schema.safeParse(req.body);
  if (!result.success) {
    const errors = result.error.errors.map((e) => ({
      field: e.path.join('.'),
      message: e.message,
    }));
    return res.status(400).json({
      success: false,
      message: 'Revisa los datos ingresados',
      errors,
    });
  }
  // Reemplazar req.body con datos parseados/transformados (ej: email en lowercase)
  req.body = result.data;
  next();
};

module.exports = { loginSchema, forgotPasswordSchema, resetPasswordSchema, validate };
