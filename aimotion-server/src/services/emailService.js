import nodemailer from 'nodemailer';
import { config, isEmailConfigured } from '../config.js';

let transporter = null;

function getTransporter() {
  if (!isEmailConfigured()) return null;
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: config.smtp.host,
      port: config.smtp.port,
      secure: config.smtp.secure,
      auth: { user: config.smtp.user, pass: config.smtp.pass },
    });
  }
  return transporter;
}

function severityLabel(severity) {
  return { critico: 'CRITICO', alto: 'ALTO', moderado: 'MODERADO' }[severity] || severity.toUpperCase();
}

/**
 * Envia una notificacion de alerta clinica al profesional/red de apoyo
 * configurado. Devuelve { sent: boolean, reason?: string }.
 */
export async function sendAlertEmail(alert) {
  const client = getTransporter();
  if (!client) {
    return { sent: false, reason: 'SMTP no configurado (ver .env.example)' };
  }

  const subject = `[AIMotion] Alerta de riesgo ${severityLabel(alert.severity)} - ${alert.category}`;
  const text = [
    `Se detecto un factor de riesgo durante una sesion de AIMotion.`,
    ``,
    `Severidad: ${severityLabel(alert.severity)}`,
    `Categoria: ${alert.category}`,
    `Sesion: ${alert.sessionId}`,
    `Usuario (si se identifico): ${alert.userName || 'No identificado'}`,
    `Fecha/hora: ${alert.timestamp}`,
    ``,
    `Fragmento relevante (contexto, no diagnostico):`,
    `"${alert.excerpt}"`,
    ``,
    `Este mensaje fue generado automaticamente por el motor de alertas de AIMotion.`,
    `Recuerde: el sistema NO diagnostica ni reemplaza el juicio clinico.`,
    `Por favor revise el caso en el panel profesional y contacte a la persona `,
    `siguiendo el protocolo de atencion de crisis de su institucion.`,
  ].join('\n');

  try {
    await client.sendMail({
      from: config.smtp.from,
      to: config.smtp.to.join(','),
      subject,
      text,
    });
    return { sent: true };
  } catch (err) {
    return { sent: false, reason: err.message };
  }
}
