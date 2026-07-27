// src/services/email.service.js
// Servicio de correo con Nodemailer.
// Guard: si nodemailer no esta instalado, todas las funciones
// fallan silenciosamente sin romper el arranque del servidor.

const fs   = require('fs');
const path = require('path');

// ─── Transporter (lazy, con guard) ───────────────────────────────────────────

let transporter = null;

try {
  const nodemailer = require('nodemailer'); // eslint-disable-line
  transporter = nodemailer.createTransport({
    host:   process.env.SMTP_HOST   || 'mailhog',
    port:   Number(process.env.SMTP_PORT || 1025),
    secure: process.env.SMTP_SECURE === 'true',
    auth:   (process.env.SMTP_USER && process.env.SMTP_PASS)
      ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
      : undefined,
  });

  if (process.env.NODE_ENV !== 'production') {
    transporter.verify()
      .then(() => console.log('[Email] Conexion SMTP lista'))
      .catch((err) => console.warn('[Email] SMTP no disponible:', err.message));
  }
} catch {
  console.warn('[Email] nodemailer no instalado — correos desactivados hasta el proximo build');
}

// ─── Helper: cargar template HTML ────────────────────────────────────────────

const loadTemplate = (name) => {
  const filePath = path.join(__dirname, '..', 'templates', 'email', `${name}.html`);
  try {
    return fs.readFileSync(filePath, 'utf-8');
  } catch {
    return null;
  }
};

// ─── Funcion base de envio ────────────────────────────────────────────────────

const sendEmail = async ({ to, subject, html, text }) => {
  if (!transporter) {
    console.warn(`[Email] Sin transporter — correo a ${to} no enviado (subject: ${subject})`);
    return { success: false, error: 'nodemailer no disponible' };
  }
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

const sendPasswordResetEmail = async ({ to, name, resetUrl }) => {
  let html = loadTemplate('reset-password');
  if (html) {
    html = html
      .replace(/{{name}}/g,     name)
      .replace(/{{resetUrl}}/g, resetUrl)
      .replace(/{{year}}/g,     new Date().getFullYear());
  } else {
    html = `<p>Hola, ${name}.</p><p>Cambia tu contrasena: <a href="${resetUrl}">${resetUrl}</a></p><p>Vence en 5 minutos.</p>`;
  }
  return sendEmail({
    to,
    subject: 'Cambia tu contrasena — el enlace vale 5 minutos',
    html,
    text:    `Hola, ${name}.\n\nCambia tu contrasena: ${resetUrl}\n\nVence en 5 minutos.`,
  });
};

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
    html = `<p>Hola, ${name}.</p><p>Tu contrasena fue cambiada el ${fecha} desde ${ip || 'IP desconocida'}.</p>`;
  }
  return sendEmail({
    to,
    subject: 'Tu contrasena fue cambiada',
    html,
    text:    `Hola, ${name}.\n\nTu contrasena fue cambiada el ${fecha} desde ${ip}.`,
  });
};

const sendAccountLockedEmail = async ({ to, name, lockedUntil }) => {
  const hora = new Date(lockedUntil).toLocaleTimeString('es-PY', { timeZone: 'America/Asuncion' });
  let html = loadTemplate('account-locked');
  if (html) {
    html = html
      .replace(/{{name}}/g,        name)
      .replace(/{{lockedUntil}}/g, hora)
      .replace(/{{year}}/g,        new Date().getFullYear());
  } else {
    html = `<p>Hola, ${name}.</p><p>Tu cuenta fue bloqueada. Podes intentar de nuevo a las ${hora}.</p>`;
  }
  return sendEmail({
    to,
    subject: 'Tu cuenta fue bloqueada temporalmente',
    html,
    text:    `Hola, ${name}.\n\nTu cuenta fue bloqueada. Podes intentar de nuevo a las ${hora}.`,
  });
};

module.exports = {
  sendEmail,
  sendPasswordResetEmail,
  sendPasswordChangedEmail,
  sendAccountLockedEmail,
};
