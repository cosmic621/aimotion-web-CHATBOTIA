import { config, isContactSmsConfigured } from '../config.js';

function plain(text) {
  // Sin tildes ni enie: el SMS cabe en menos segmentos (GSM-7).
  return String(text).normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

/**
 * Avisa al contacto de emergencia de la persona usuaria por SMS, usando la
 * pasarela propia (celular Android). El mensaje es deliberadamente minimo:
 * NO incluye nada de lo que la persona escribio ni su categoria de riesgo.
 * @returns {Promise<{sent: boolean, reason?: string}>}
 */
export async function sendContactSms(user) {
  if (!isContactSmsConfigured()) {
    return { sent: false, reason: 'Pasarela SMS no configurada (ver .env.example)' };
  }
  const contact = user.emergencyContact;
  if (!contact?.phone) return { sent: false, reason: 'Sin contacto de emergencia registrado' };

  const firstName = (user.name || 'Una persona cercana').split(' ')[0];
  const message = plain(
    `AIMotion: ${firstName} podria necesitar tu apoyo en este momento. ` +
      `Por favor comunicate con esta persona cuanto antes. ` +
      `Si no logras hablar con ella, llama a la Linea 106 o al 123. ` +
      `No compartimos detalles de su conversacion.`
  );

  try {
    const auth = Buffer.from(`${config.smsGateway.username}:${config.smsGateway.password}`).toString('base64');
    const res = await fetch(config.smsGateway.url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Basic ${auth}` },
      body: JSON.stringify({ message, phoneNumbers: [contact.phone] }),
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) return { sent: false, reason: `La pasarela respondió ${res.status}` };
    return { sent: true };
  } catch (err) {
    return { sent: false, reason: err.message };
  }
}
