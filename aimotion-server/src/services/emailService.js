import nodemailer from 'nodemailer';
import { sanitizeForLog } from '../security/sanitize.js';

const LABEL = { critico: 'CRITICO', alto: 'ALTO', moderado: 'MODERADO' };

/** Correo de alerta al profesional (SMTP con TLS). Solo texto plano. */
export function createEmailService({ smtp }) {
  const configured = () => Boolean(smtp.host && smtp.user && smtp.pass && smtp.to.length);
  let transporter = null;
  const client = () => {
    if (!configured()) return null;
    transporter ||= nodemailer.createTransport({
      host: smtp.host, port: smtp.port, secure: smtp.secure, requireTLS: !smtp.secure,
      tls: { minVersion: 'TLSv1.2' }, auth: { user: smtp.user, pass: smtp.pass },
    });
    return transporter;
  };

  async function sendAlert(alert) {
    const c = client();
    if (!c) return { sent: false, reason: 'SMTP no configurado' };
    const sev = LABEL[alert.severity] || 'ALTO';
    const text = [
      'Se detecto un factor de riesgo durante una sesion de AIMotion.', '',
      `Severidad: ${sev}`, `Categoria: ${sanitizeForLog(alert.category, 60)}`, `Sesion: ${sanitizeForLog(alert.sessionId, 64)}`,
      `Usuario (si se identifico): ${sanitizeForLog(alert.userName || 'No identificado', 100)}`, `Fecha/hora: ${new Date(alert.timestamp).toISOString()}`, '',
      'Fragmento relevante (contexto, no diagnostico):', `"${sanitizeForLog(alert.excerpt, 500)}"`, '',
      'Mensaje automatico del motor de alertas de AIMotion. El sistema NO diagnostica ni reemplaza el juicio clinico.',
      'Revise el caso en el panel profesional y siga el protocolo de atencion de crisis de su institucion.',
    ].join('\n');
    try {
      await c.sendMail({ from: smtp.from, to: smtp.to.join(','), subject: `[AIMotion] Alerta de riesgo ${sev}`, text });
      return { sent: true };
    } catch (err) {
      return { sent: false, reason: err.message };
    }
  }
  return { sendAlert, configured };
}
