import twilio from 'twilio';
import { config, isSmsConfigured } from '../config.js';

let client = null;

function getClient() {
  if (!isSmsConfigured()) return null;
  if (!client) {
    client = twilio(config.twilio.accountSid, config.twilio.authToken);
  }
  return client;
}

/**
 * Envia un SMS corto de alerta al profesional/red de apoyo configurado.
 * Devuelve { sent: boolean, reason?: string }.
 */
export async function sendAlertSms(alert) {
  const twilioClient = getClient();
  if (!twilioClient) {
    return { sent: false, reason: 'Twilio no configurado (ver .env.example)' };
  }

  const body = `AIMotion ALERTA ${alert.severity.toUpperCase()} (${alert.category}). Sesion ${alert.sessionId}. Revise el panel profesional de inmediato.`;

  try {
    await Promise.all(
      config.twilio.to.map((to) =>
        twilioClient.messages.create({
          from: config.twilio.fromNumber,
          to,
          body,
        })
      )
    );
    return { sent: true };
  } catch (err) {
    return { sent: false, reason: err.message };
  }
}
