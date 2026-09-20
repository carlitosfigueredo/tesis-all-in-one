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
    html = `<p>Hola, ${name}.</p><p>Cambiá tu contraseña: <a href="${resetUrl}">${resetUrl}</a></p><p>Vence en 5 minutos.</p>`;
  }
  return sendEmail({
    to,
    subject: 'Cambiá tu contraseña — el enlace vale 5 minutos',
    html,
    text:    `Hola, ${name}.\n\nCambiá tu contraseña: ${resetUrl}\n\nVence en 5 minutos.`,
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
    html = `<p>Hola, ${name}.</p><p>Tu contraseña fue cambiada el ${fecha} desde ${ip || 'IP desconocida'}.</p>`;
  }
  return sendEmail({
    to,
    subject: 'Tu contraseña fue cambiada',
    html,
    text:    `Hola, ${name}.\n\nTu contraseña fue cambiada el ${fecha} desde ${ip}.`,
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

// Bienvenida al registrar una empresa (registro publico → COMPANY_ADMIN)
const sendWelcomeEmail = async ({ to, name, companyName, plan }) => {
  const loginUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/login`;
  let html = loadTemplate('welcome');
  if (html) {
    html = html
      .replace(/{{name}}/g,        name)
      .replace(/{{companyName}}/g, companyName)
      .replace(/{{plan}}/g,        plan || 'BASICO')
      .replace(/{{loginUrl}}/g,    loginUrl)
      .replace(/{{year}}/g,        new Date().getFullYear());
  } else {
    html = `<p>Hola, ${name}.</p><p>Tu empresa <strong>${companyName}</strong> fue registrada correctamente con el plan ${plan || 'BASICO'}.</p><p>Ingresá desde <a href="${loginUrl}">${loginUrl}</a>.</p>`;
  }
  return sendEmail({
    to,
    subject: `Bienvenido a Sistema BI, ${name}`,
    html,
    text:    `Hola, ${name}.\n\nTu empresa ${companyName} fue registrada con el plan ${plan || 'BASICO'}.\nIngresá desde ${loginUrl}.`,
  });
};

// Credenciales de acceso al crear un usuario desde el panel (admin crea usuario)
const sendAccountCreatedEmail = async ({ to, name, email, tempPassword, role }) => {
  const loginUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/login`;
  let html = loadTemplate('account-created');
  if (html) {
    html = html
      .replace(/{{name}}/g,         name)
      .replace(/{{email}}/g,        email)
      .replace(/{{tempPassword}}/g, tempPassword)
      .replace(/{{role}}/g,         role || 'VIEWER')
      .replace(/{{loginUrl}}/g,     loginUrl)
      .replace(/{{year}}/g,         new Date().getFullYear());
  } else {
    html = `<p>Hola, ${name}.</p><p>Se creó una cuenta para vos en Sistema BI.</p><p>Usuario: <strong>${email}</strong><br>Contraseña temporal: <strong>${tempPassword}</strong></p><p>Ingresá desde <a href="${loginUrl}">${loginUrl}</a> y cambiá tu contraseña en el primer acceso.</p>`;
  }
  return sendEmail({
    to,
    subject: 'Tu cuenta en Sistema BI fue creada',
    html,
    text:    `Hola, ${name}.\n\nSe creó una cuenta para vos.\nUsuario: ${email}\nContraseña temporal: ${tempPassword}\n\nIngresá desde ${loginUrl} y cambiá tu contraseña en el primer acceso.`,
  });
};

module.exports = {
  sendEmail,
  sendPasswordResetEmail,
  sendPasswordChangedEmail,
  sendAccountLockedEmail,
  sendWelcomeEmail,
  sendAccountCreatedEmail,
};
