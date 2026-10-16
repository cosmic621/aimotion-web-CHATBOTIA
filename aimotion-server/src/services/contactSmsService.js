import { safeFirstName } from '../security/sanitize.js';
import { normalizePhone } from '../utils/phone.js';

function plain(text) {
  return String(text).normalize('NFD').replace(/[\u0300-\u036f]/g, ''); // sin tildes: GSM-7, menos segmentos
}

/**
 * Avisa al contacto de emergencia por SMS usando la pasarela propia (celular
 * Android). El mensaje es minimo: NO incluye nada de lo que la persona escribio,
 * ni la categoria de riesgo, y el nombre se sanea (solo letras) para que nadie
 * pueda usar su "nombre" para colar enlaces o texto en un SMS dirigido a un tercero.
 */
export function createContactSmsService({ gateway, fetchImpl = globalThis.fetch, timeoutMs = 10_000 }) {
  const configured = () => Boolean(gateway?.url && gateway?.username && gateway?.password);

  function buildMessage(user) {
    return plain(
      `AIMotion: ${safeFirstName(user.name)} podria necesitar tu apoyo en este momento. ` +
        `Por favor comunicate con esta persona cuanto antes. ` +
        `Si no logras hablar con ella, llama a la Linea 106 o al 123. ` +
        `No compartimos detalles de su conversacion.`
    );
  }

  async function send(user) {
    if (!configured()) return { sent: false, reason: 'Pasarela SMS no configurada' };
    const phone = normalizePhone(user.emergencyContact?.phone);
    if (!phone) return { sent: false, reason: 'Contacto de emergencia sin teléfono válido' };
    if (!/^https?:\/\//i.test(gateway.url)) return { sent: false, reason: 'URL de la pasarela inválida' };
    try {
      const auth = Buffer.from(`${gateway.username}:${gateway.password}`).toString('base64');
      const res = await fetchImpl(gateway.url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Basic ${auth}` },
        body: JSON.stringify({ message: buildMessage(user), phoneNumbers: [phone] }),
        signal: AbortSignal.timeout(timeoutMs),
      });
      return res.ok ? { sent: true } : { sent: false, reason: `La pasarela respondió ${res.status}` };
    } catch (err) {
      return { sent: false, reason: err.message };
    }
  }

  return { send, buildMessage, configured };
}
