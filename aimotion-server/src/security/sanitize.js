// Limpieza y escape de contenido controlado por el usuario (item 15).
// React ya escapa lo que se renderiza; esto protege los demas destinos:
// base de datos, correos, SMS y logs.

// eslint-disable-next-line no-control-regex
const CONTROL_RE = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F\u200B-\u200F\u202A-\u202E\u2066-\u2069\uFEFF]/g;

/** Quita caracteres de control, invisibles y bidireccionales (Postgres rechaza \u0000). */
export function stripControlChars(text) {
  return String(text ?? '').replace(CONTROL_RE, '');
}

/** Texto libre: sin caracteres de control, normalizado y acotado. */
export function sanitizeText(text, { max = 5000 } = {}) {
  return stripControlChars(text).normalize('NFC').trim().slice(0, max);
}

const HTML_ESCAPES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;', '`': '&#96;' };
/** Escapa HTML (para cualquier plantilla HTML futura, p. ej. correos). */
export function escapeHtml(text) {
  return String(text ?? '').replace(/[&<>"'`]/g, (c) => HTML_ESCAPES[c]);
}

/**
 * Primer nombre seguro para incluir en un SMS: solo letras (cualquier idioma),
 * guion o apostrofe, de 2 a 20 caracteres; si no cumple, valor neutro. Evita que alguien use su "nombre" para colar enlaces o
 * texto arbitrario en un mensaje que se envia a un tercero.
 */
export function safeFirstName(name, fallback = 'Una persona cercana') {
  const first = String(name ?? '').trim().split(/\s+/)[0].replace(/[.,;:]+$/, '');
  // Un nombre real solo tiene letras (con tildes/ñ), guion o apostrofe. Si trae
  // cualquier otra cosa (enlaces, simbolos, emojis, numeros) NO se "limpia": se
  // descarta y se usa el valor neutro.
  return /^[\p{L}\p{M}'’-]{2,20}$/u.test(first) ? first : fallback;
}

/** Para registrar en logs sin permitir inyeccion de lineas falsas. */
export function sanitizeForLog(text, max = 200) {
  return stripControlChars(String(text ?? '')).replace(/[\r\n]+/g, ' ').slice(0, max);
}
