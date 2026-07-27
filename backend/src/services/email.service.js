// src/services/email.service.js
// Servicio de correo con Nodemailer.
// En desarrollo usa Mailhog (puerto 1025). En produccion usa SMTP real.

const nodemailer = require('nodemailer');
const fs         = require('fs');
const path       = require('path');

// ─── Transporter ─────────────────────────────────────────────────────────────

const transporter = nodemailer.createTransport({
  host:   process.env.SMTP_HOST   || 'mailhog',
  port:   Number(process.env.SMTP_PORT || 1025),
  secure: process.env.SMTP_SECURE === 'true',
  auth: (process.env.SMTP_USER && process.env.SMTP_PASS)
    ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
    : undefined,
});

// Verificar conexion SMTP al arrancar (solo en desarrollo)
if (process.env.NODE_ENV !== 'production') {
  transporter.verify().then(() => {
    console.log('[Email] Conexion SMTP lista');
  }).catch((err) => {
    console.warn('[Email] SMTP no disponible (correos en modo silencioso):', err.message);
  });
}

// ─── Helper: cargar template HTML ────────────────────────────────────────────

const loadTemplate = (name) => {
  const filePath = path.join(__dirname, '..', 'templates', 'email', `${name}.html`);
  try {
    return fs.readFileSync(filePath, 'utf-8');
  } catch {
    console.warn(`[Email] Template "${name}" no encontrado, usando fallback de texto`);
    return null;
  }
};

// ─── Funcion base de envio ────────────────────────────────────────────────────

/**
 * Envia un correo. Nunca lanza excepciones — falla silenciosamente.
 */
const sendEmail = async ({ to, subject, html, text }) => {
  try {
    const info = await transporter.sendMail({
      from:    process.env.SMTP_FROM || '"Sistema BI" <noreply@sistemabi.edu.py>',
      to,
      subject,
      html,
      text,
    });
    console.log(`[Email] Enviado a ${to} | messageId: ${info.messageId}`);
    return { success: true, messageId: info.messageId };
  } catch (err) {
    console.error(`[Email] Error al enviar a ${to}:`, err.message);
    return { success: false, error: err.message };
  }
};

// ─── Emails especificos ───────────────────────────────────────────────────────

/**
 * Correo de reset de contrasena.
 * @param {{ to, name, resetUrl }} params
 */
const sendPasswordResetEmail = async ({ to, name, resetUrl }) => {
  let html = loadTemplate('reset-password');

  if (html) {
    html = html
      .replace(/{{name}}/g,     name)
      .replace(/{{resetUrl}}/g, resetUrl)
      .replace(/{{year}}/g,     new Date().getFullYear());
  } else {
    html = `
      <p>Hola, ${name}.</p>
      <p>Recibimos una solicitud para cambiar la contrasena de tu cuenta.</p>
      <p>El enlace de abajo vence en <strong>5 minutos</strong>.</p>
      <p><a href="${resetUrl}" style="background:#2563eb;color:white;padding:10px 20px;border-radius:8px;text-decoration:none;display:inline-block">
        Cambiar contrasena
      </a></p>
      <p>Si no pediste esto, ignora este correo. Tu contrasena no cambio.</p>
      <hr/><small>Este es un correo automatico. Por favor no respondas a este mensaje.</small>
    `;
  }

  return sendEmail({
    to,
    subject: 'Cambia tu contrasena — el enlace vale 5 minutos',
    html,
    text: `Hola, ${name}.\n\nCopia este enlace en tu navegador para cambiar tu contrasena:\n${resetUrl}\n\nVence en 5 minutos. Si no pediste esto, ignora este correo.\n\nEste es un correo automatico.`,
  });
};

/**
 * Correo de confirmacion de cambio de contrasena.
 * @param {{ to, name, ip, timestamp }} params
 */
const sendPasswordChangedEmail = async ({ to, name, ip, timestamp }) => {
  const fecha = new Date(timestamp).toLocaleString('es-PY', { timeZone: 'America/Asuncion' });

  let html = loadTemplate('password-changed');

  if (html) {
    html = html
      .replace(/{{name}}/g,      name)
      .replace(/{{ip}}/g,        ip || 'desconocida')
      .replace(/{{timestamp}}/g, fecha)
      .replace(/{{year}}/g,      new Date().getFullYear());
  } else {
    html = `
      <p>Hola, ${name}.</p>
      <p>Tu contrasena fue cambiada el <strong>${fecha}</strong> desde la IP <strong>${ip || 'desconocida'}</strong>.</p>
      <p>Si no fuiste vos, cambia tu contrasena de inmediato.</p>
      <hr/><small>Este es un correo automatico. Por favor no respondas a este mensaje.</small>
    `;
  }

  return sendEmail({
    to,
    subject: 'Tu contrasena fue cambiada',
    html,
    text: `Hola, ${name}.\n\nTu contrasena fue cambiada el ${fecha} desde la IP ${ip || 'desconocida'}.\n\nSi no fuiste vos, cambia tu contrasena de inmediato.\n\nEste es un correo automatico.`,
  });
};

/**
 * Correo de cuenta bloqueada por intentos fallidos.
 * @param {{ to, name, lockedUntil }} params
 */
const sendAccountLockedEmail = async ({ to, name, lockedUntil }) => {
  const hora = new Date(lockedUntil).toLocaleTimeString('es-PY', { timeZone: 'America/Asuncion' });

  let html = loadTemplate('account-locked');

  if (html) {
    html = html
      .replace(/{{name}}/g,        name)
      .replace(/{{lockedUntil}}/g, hora)
      .replace(/{{year}}/g,        new Date().getFullYear());
  } else {
    html = `
      <p>Hola, ${name}.</p>
      <p>Tu cuenta fue bloqueada por 30 minutos debido a varios intentos de acceso fallidos.</p>
      <p>Podes intentar de nuevo a partir de las <strong>${hora}</strong>.</p>
      <hr/><small>Este es un correo automatico. Por favor no respondas a este mensaje.</small>
    `;
  }

  return sendEmail({
    to,
    subject: 'Tu cuenta fue bloqueada temporalmente',
    html,
    text: `Hola, ${name}.\n\nTu cuenta fue bloqueada por 30 minutos. Podes intentar de nuevo a partir de las ${hora}.\n\nEste es un correo automatico.`,
  });
};

module.exports = {
  sendEmail,
  sendPasswordResetEmail,
  sendPasswordChangedEmail,
  sendAccountLockedEmail,
};
