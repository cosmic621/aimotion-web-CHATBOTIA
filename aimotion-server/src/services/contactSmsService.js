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

// Errores de Twilio frecuentes, en palabras simples. Nunca se copia el texto que devuelve Twilio porque
// puede incluir el numero del contacto (dato personal) y esta razon se guarda y se muestra a profesionales.
const TWILIO_ERRORS = {
  20003: 'credenciales de Twilio incorrectas',
  21211: 'numero del contacto no valido',
  21408: 'pais del contacto no habilitado en Twilio (Geo permissions)',
  21606: 'el numero remitente no puede enviar SMS',
  21608: 'cuenta de prueba: el numero del contacto no esta verificado',
  21610: 'el contacto bloqueo los mensajes',
  21614: 'el numero del contacto no puede recibir SMS',
};

/** Precision del GPS en metros (numero entero) o null si no viene o no es valida. */
export function accuracyMeters(location) {
  const a = Number(location?.accuracy);
  return Number.isFinite(a) && a >= 0 ? Math.round(a) : null;
}

/**
 * Imagen de mapa (OpenStreetMap, servicio comunitario gratuito) centrada en las coordenadas, con un marcador.
 * Igual que mapsLink: solo se arma con numeros ya validados. El zoom se aleja cuando la precision es baja.
 */
export function staticMapUrl(location) {
  const lat = Number(location?.lat);
  const lng = Number(location?.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) return null;
  const acc = accuracyMeters(location);
  const zoom = acc === null || acc <= 300 ? 16 : acc <= 1000 ? 15 : acc <= 3000 ? 13 : 12;
  const c = `${lat.toFixed(5)},${lng.toFixed(5)}`;
  return `https://staticmap.openstreetmap.de/staticmap.php?center=${c}&zoom=${zoom}&size=560x280&maptype=mapnik&markers=${c},red-pushpin`;
}

/**
 * Avisa al contacto de emergencia por SMS. Dos formas de envio (se usa la primera que este configurada):
 *   1) pasarela propia (celular Android con "SMS Gateway for Android"): SMS_GATEWAY_URL/USER/PASS
 *   2) Twilio (nube, sirve con cualquier celular): TWILIO_ACCOUNT_SID / TWILIO_AUTH_TOKEN / TWILIO_FROM_NUMBER
 * El mensaje es minimo: NO incluye nada de lo que la persona escribio, ni la categoria de riesgo, y el
 * nombre se sanea (solo letras) para que nadie pueda usar su "nombre" para colar enlaces o texto en un
 * SMS dirigido a un tercero. Unica excepcion: si la persona compartio su ubicacion desde el navegador,
 * se agrega al final un enlace de mapa (armado solo con las coordenadas; la ubicacion no se guarda).
 */
export function createContactSmsService({ gateway, twilio, fetchImpl = globalThis.fetch, timeoutMs = 10_000 }) {
  const gatewayConfigured = () => Boolean(gateway?.url && gateway?.username && gateway?.password);
  const twilioConfigured = () => Boolean(twilio?.accountSid && twilio?.authToken && twilio?.fromNumber);
  const configured = () => gatewayConfigured() || twilioConfigured();

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

  async function sendViaGateway(phone, message) {
    if (!/^https?:\/\//i.test(gateway.url)) return { sent: false, reason: 'URL de la pasarela inválida' };
    const auth = Buffer.from(`${gateway.username}:${gateway.password}`).toString('base64');
    const res = await fetchImpl(gateway.url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Basic ${auth}` },
      body: JSON.stringify({ message, phoneNumbers: [phone] }),
      signal: AbortSignal.timeout(timeoutMs),
    });
    return res.ok ? { sent: true } : { sent: false, reason: `La pasarela respondió ${res.status}` };
  }

  async function sendViaTwilio(phone, message) {
    const auth = Buffer.from(`${twilio.accountSid}:${twilio.authToken}`).toString('base64');
    // Un "Messaging Service" (empieza por MG) se usa como MessagingServiceSid; un numero, como From.
    const sender = /^MG[0-9a-f]{32}$/i.test(twilio.fromNumber) ? { MessagingServiceSid: twilio.fromNumber } : { From: twilio.fromNumber };
    const res = await fetchImpl(`https://api.twilio.com/2010-04-01/Accounts/${encodeURIComponent(twilio.accountSid)}/Messages.json`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', Authorization: `Basic ${auth}` },
      body: new URLSearchParams({ To: phone, Body: message, ...sender }).toString(),
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (res.ok) return { sent: true };
    const info = await res.json().catch(() => ({}));
    const code = Number(info?.code);
    const meaning = TWILIO_ERRORS[code];
    return { sent: false, reason: `Twilio respondió ${res.status}${Number.isFinite(code) ? ` (código ${code}${meaning ? `: ${meaning}` : ''})` : ''}` };
  }

  async function send(user, { location } = {}) {
    if (!configured()) return { sent: false, reason: 'Pasarela SMS no configurada' };
    const phone = normalizePhone(user.emergencyContact?.phone);
    if (!phone) return { sent: false, reason: 'Contacto de emergencia sin teléfono válido' };
    const message = buildMessage(user, location);
    try {
      return gatewayConfigured() ? await sendViaGateway(phone, message) : await sendViaTwilio(phone, message);
    } catch (err) {
      return { sent: false, reason: err.message };
    }
  }

  return { send, buildMessage, configured };
}
