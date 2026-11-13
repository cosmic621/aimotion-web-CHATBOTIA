import { safeFirstName } from '../security/sanitize.js';
import { mapsLink, staticMapUrl, accuracyMeters } from './contactSmsService.js';

const EMAIL_RE = /^[^\s@<>,;]+@[^\s@<>,;]+\.[^\s@<>,;]+$/;
const LOW_ACCURACY_M = 500;

const esc = (t) => String(t).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

/**
 * Avisa al contacto de emergencia por CORREO usando la API HTTPS de Brevo (plan gratuito: 300 al dia).
 * No usa SMTP porque el plan gratuito de Render bloquea los puertos SMTP.
 *
 * El correo (HTML + version de texto) es minimo en contenido: NO incluye nada de lo que la persona escribio
 * ni la categoria de riesgo; el nombre se sanea (solo letras). Si la persona compartio su ubicacion desde el
 * navegador, lleva un mapa y un boton a Google Maps, armados SOLO con coordenadas numericas validadas, y se
 * avisa cuando la precision es baja. Nada del contenido del usuario llega al HTML sin escapar.
 */
export function createContactEmailService({ brevo, fetchImpl = globalThis.fetch, timeoutMs = 10_000 }) {
  const configured = () => Boolean(brevo?.apiKey && brevo?.senderEmail);

  function describeLocation(location) {
    const link = mapsLink(location);
    if (!link) return null;
    const accuracy = accuracyMeters(location);
    return { link, map: staticMapUrl(location), accuracy, low: accuracy !== null && accuracy > LOW_ACCURACY_M };
  }

  function buildText(name, loc) {
    return [
      'Hola,',
      '',
      `AIMotion detectó que ${name} podría necesitar tu apoyo en este momento. Tu correo quedó registrado como contacto de emergencia de esta persona.`,
      '',
      'Por favor comunícate con ella cuanto antes. Si no logras hablar con ella, llama a la Línea 106 (orientación en salud mental, 24/7) o al 123 (emergencias).',
      ...(loc
        ? [
            '',
            `Su ubicación actual aproximada: ${loc.link}`,
            ...(loc.accuracy !== null ? [`Precisión aproximada: ${loc.accuracy} m.${loc.low ? ' La precisión es baja: puede no ser exacta, confírmala llamando a la persona.' : ''}`] : []),
          ]
        : []),
      '',
      'Por su privacidad, no compartimos detalles de su conversación. Este mensaje es automático; por favor no respondas a este correo.',
    ].join('\n');
  }

  function buildHtml(name, loc) {
    const button = (href, label, bg, color) =>
      `<a href="${href}" style="display:inline-block;background:${bg};color:${color};text-decoration:none;font-weight:bold;font-size:15px;padding:13px 22px;border-radius:999px;margin:4px 6px 4px 0;">${label}</a>`;
    const mapBlock = loc
      ? `<tr><td style="padding:0 28px 8px 28px;">
          <p style="margin:0 0 10px 0;font-size:15px;font-weight:bold;color:#004828;">Ubicación actual aproximada de ${esc(name)}</p>
          ${loc.map ? `<a href="${loc.link}"><img src="${loc.map}" width="544" alt="Mapa con la ubicación aproximada" style="display:block;width:100%;max-width:544px;height:auto;border:1px solid #d5e9dc;border-radius:12px;"></a>` : ''}
          <p style="margin:10px 0 0 0;font-size:13px;color:#666666;">${loc.accuracy !== null ? `Precisión aproximada: ±${loc.accuracy} m. ` : ''}Si el mapa no se ve, usa el botón de abajo.</p>
          ${loc.low ? `<p style="margin:10px 0 0 0;padding:10px 12px;background:#fffce6;border-left:4px solid #d9a900;font-size:13px;color:#6b5300;">La precisión de esta ubicación es baja: el punto del mapa puede estar lejos de donde realmente está. Confírmalo llamando a la persona.</p>` : ''}
        </td></tr>
        <tr><td style="padding:12px 28px 4px 28px;">${button(loc.link, 'Abrir en Google Maps', '#004828', '#ffffff')}</td></tr>`
      : `<tr><td style="padding:0 28px 8px 28px;"><p style="margin:0;font-size:13px;color:#666666;">No se pudo obtener la ubicación de esta persona.</p></td></tr>`;

    return `<!DOCTYPE html>
<html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>AIMotion</title></head>
<body style="margin:0;padding:0;background:#eef6f1;font-family:Arial,Helvetica,sans-serif;color:#171717;">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;">${esc(name)} podría necesitar tu apoyo ahora. Comunícate con esta persona cuanto antes.</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#eef6f1;padding:24px 12px;"><tr><td align="center">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #d5e9dc;">
  <tr><td style="background:#004828;padding:20px 28px;border-bottom:4px solid #fbe122;"><span style="color:#ffffff;font-size:22px;font-weight:bold;">AIMotion</span><span style="color:#a9d1b8;font-size:13px;"> &nbsp;·&nbsp; apoyo en salud mental</span></td></tr>
  <tr><td style="background:#ec1c24;padding:14px 28px;color:#ffffff;font-size:14px;font-weight:bold;letter-spacing:1px;">AVISO URGENTE DE APOYO</td></tr>
  <tr><td style="padding:28px 28px 8px 28px;">
    <h1 style="margin:0 0 14px 0;font-size:24px;line-height:1.25;color:#171717;">${esc(name)} podría necesitar tu apoyo ahora</h1>
    <p style="margin:0 0 12px 0;font-size:16px;line-height:1.55;color:#3f3f3f;">AIMotion detectó una situación en la que esta persona podría necesitar ayuda. Tu correo quedó registrado como <strong>contacto de emergencia</strong>.</p>
    <p style="margin:0 0 8px 0;font-size:16px;line-height:1.55;color:#3f3f3f;"><strong>Por favor comunícate con ella cuanto antes.</strong></p>
  </td></tr>
  ${mapBlock}
  <tr><td style="padding:20px 28px 8px 28px;">
    <p style="margin:0 0 8px 0;font-size:15px;font-weight:bold;color:#004828;">Si no logras hablar con ella</p>
    ${button('tel:106', 'Llamar a la Línea 106', '#fbe122', '#001f11')}${button('tel:123', 'Emergencias 123', '#ec1c24', '#ffffff')}
    <p style="margin:6px 0 0 0;font-size:13px;color:#666666;">La Línea 106 ofrece orientación en salud mental, 24/7 y gratuita.</p>
  </td></tr>
  <tr><td style="padding:22px 28px 26px 28px;">
    <p style="margin:0;padding-top:16px;border-top:1px solid #ececec;font-size:12px;line-height:1.5;color:#666666;">Por su privacidad, no compartimos detalles de su conversación. Este mensaje es automático y fue enviado por AIMotion, una herramienta de apoyo que no diagnostica ni reemplaza a un profesional de la salud. Por favor no respondas a este correo.</p>
  </td></tr>
</table>
</td></tr></table>
</body></html>`;
  }

  function buildMessage(user, location) {
    const name = safeFirstName(user.name);
    const loc = describeLocation(location);
    return { subject: `AIMotion: ${name} podría necesitar tu apoyo ahora`, text: buildText(name, loc), html: buildHtml(name, loc) };
  }

  async function send(user, { location } = {}) {
    if (!configured()) return { sent: false, reason: 'Correo al contacto no configurado' };
    const to = String(user.emergencyContact?.email || '').trim();
    if (!to) return { sent: false, reason: 'El contacto no tiene correo registrado' };
    if (!EMAIL_RE.test(to)) return { sent: false, reason: 'El correo del contacto no es válido' };
    const { subject, text, html } = buildMessage(user, location);
    try {
      const res = await fetchImpl('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', accept: 'application/json', 'api-key': brevo.apiKey },
        body: JSON.stringify({ sender: { name: brevo.senderName || 'AIMotion', email: brevo.senderEmail }, to: [{ email: to }], subject, htmlContent: html, textContent: text }),
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
