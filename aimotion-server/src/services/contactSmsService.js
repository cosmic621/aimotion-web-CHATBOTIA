import { safeFirstName } from '../security/sanitize.js';
import { normalizePhone } from '../utils/phone.js';

function plain(text) {
  return String(text).normalize('NFD').replace(/[\u0300-\u036f]/g, ''); // sin tildes: GSM-7, menos segmentos
}

/**
 * Enlace de Google Maps a unas coordenadas. SOLO se arma con numeros ya validados y formateados
 * (nunca con texto del usuario), asi no se puede colar otro enlace en un SMS dirigido a un tercero.
 */
export function mapsLink(location) {
  const lat = Number(location?.lat);
  const lng = Number(location?.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) return null;
  return `https://maps.google.com/?q=${lat.toFixed(5)},${lng.toFixed(5)}`;
}

/**
 * Avisa al contacto de emergencia por SMS usando la pasarela propia (celular
 * Android). El mensaje es minimo: NO incluye nada de lo que la persona escribio,
 * ni la categoria de riesgo, y el nombre se sanea (solo letras) para que nadie
 * pueda usar su "nombre" para colar enlaces o texto en un SMS dirigido a un tercero.
 * Unica excepcion: si la persona compartio su ubicacion desde el navegador, se agrega al final un
 * enlace de mapa (armado solo con las coordenadas; la ubicacion no se guarda ni se registra).
 */
export function createContactSmsService({ gateway, fetchImpl = globalThis.fetch, timeoutMs = 10_000 }) {
  const configured = () => Boolean(gateway?.url && gateway?.username && gateway?.password);

  /** location es opcional ({ lat, lng }): si viene, el SMS termina con un enlace al mapa. */
  function buildMessage(user, location) {
    const link = mapsLink(location);
    return plain(
      `AIMotion: ${safeFirstName(user.name)} podria necesitar tu apoyo en este momento. ` +
        `Por favor comunicate con esta persona cuanto antes. ` +
        `Si no logras hablar con ella, llama a la Linea 106 o al 123. ` +
        `No compartimos detalles de su conversacion.` +
        (link ? ` Su ubicacion actual aproximada: ${link}` : '')
    );
  }

  async function send(user, { location } = {}) {
    if (!configured()) return { sent: false, reason: 'Pasarela SMS no configurada' };
    const phone = normalizePhone(user.emergencyContact?.phone);
    if (!phone) return { sent: false, reason: 'Contacto de emergencia sin teléfono válido' };
    if (!/^https?:\/\//i.test(gateway.url)) return { sent: false, reason: 'URL de la pasarela inválida' };
    try {
      const auth = Buffer.from(`${gateway.username}:${gateway.password}`).toString('base64');
      const res = await fetchImpl(gateway.url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Basic ${auth}` },
        body: JSON.stringify({ message: buildMessage(user, location), phoneNumbers: [phone] }),
        signal: AbortSignal.timeout(timeoutMs),
      });
      return res.ok ? { sent: true } : { sent: false, reason: `La pasarela respondió ${res.status}` };
    } catch (err) {
      return { sent: false, reason: err.message };
    }
  }

  return { send, buildMessage, configured };
}
