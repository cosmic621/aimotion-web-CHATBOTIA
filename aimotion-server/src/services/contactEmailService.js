import { safeFirstName } from '../security/sanitize.js';
import { mapsLink } from './contactSmsService.js';

const EMAIL_RE = /^[^\s@<>,;]+@[^\s@<>,;]+\.[^\s@<>,;]+$/;

/**
 * Avisa al contacto de emergencia por CORREO usando la API HTTPS de Brevo (plan gratuito: 300 al dia).
 * No usa SMTP porque el plan gratuito de Render bloquea los puertos SMTP.
 * Igual que el SMS: el mensaje es minimo, NO incluye nada de lo que la persona escribio ni la categoria
 * de riesgo, el nombre se sanea (solo letras) y, si la persona compartio su ubicacion desde el navegador,
 * se agrega un enlace de mapa armado solo con coordenadas numericas validadas.
 */
export function createContactEmailService({ brevo, fetchImpl = globalThis.fetch, timeoutMs = 10_000 }) {
  const configured = () => Boolean(brevo?.apiKey && brevo?.senderEmail);

  function buildMessage(user, location) {
    const name = safeFirstName(user.name);
    const link = mapsLink(location);
    const text = [
      'Hola,',
      '',
      `AIMotion detectó que ${name} podría necesitar tu apoyo en este momento. Tu correo quedó registrado como contacto de emergencia de esta persona.`,
      '',
      'Por favor comunícate con ella cuanto antes. Si no logras hablar con ella, llama a la Línea 106 (orientación en salud mental, 24/7) o al 123 (emergencias).',
      ...(link ? ['', `Su ubicación actual aproximada: ${link}`] : []),
      '',
      'Por su privacidad, no compartimos detalles de su conversación. Este mensaje es automático; por favor no respondas a este correo.',
    ].join('\n');
    return { subject: `AIMotion: ${name} podría necesitar tu apoyo ahora`, text };
  }

  async function send(user, { location } = {}) {
    if (!configured()) return { sent: false, reason: 'Correo al contacto no configurado' };
    const to = String(user.emergencyContact?.email || '').trim();
    if (!to) return { sent: false, reason: 'El contacto no tiene correo registrado' };
    if (!EMAIL_RE.test(to)) return { sent: false, reason: 'El correo del contacto no es válido' };
    const { subject, text } = buildMessage(user, location);
    try {
      const res = await fetchImpl('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', accept: 'application/json', 'api-key': brevo.apiKey },
        body: JSON.stringify({ sender: { name: brevo.senderName || 'AIMotion', email: brevo.senderEmail }, to: [{ email: to }], subject, textContent: text }),
        signal: AbortSignal.timeout(timeoutMs),
      });
      if (res.ok) return { sent: true };
      // Solo se usa el "code" de Brevo (p. ej. unauthorized); su "message" puede traer el correo del contacto.
      const info = await res.json().catch(() => ({}));
      const code = typeof info?.code === 'string' && /^[a-z_]{3,40}$/.test(info.code) ? info.code : null;
      return { sent: false, reason: `Brevo respondió ${res.status}${code ? ` (${code})` : ''}` };
    } catch (err) {
      return { sent: false, reason: err.message };
    }
  }

  return { send, buildMessage, configured };
}
