// Cookies de sesion seguras + proteccion CSRF (item 9).
//
// - La sesion vive en una cookie HttpOnly (JavaScript no puede leerla, asi un
//   XSS no roba el token), Secure en produccion y SameSite=Strict.
// - En produccion se usa el prefijo __Host- (obliga Secure, Path=/ y sin Domain).
// - CSRF: token sincronizado SIN estado: HMAC(secreto, cookies de sesion). Solo
//   el JS del propio sitio puede pedirlo (lo bloquea CORS a otros origenes) y
//   debe enviarlo en la cabecera X-CSRF-Token en cada peticion que modifica datos.
import crypto from 'node:crypto';
import { safeEqual } from './crypto.js';

export function parseCookies(header) {
  const out = Object.create(null);
  if (!header || typeof header !== 'string') return out;
  for (const part of header.split(';')) {
    const i = part.indexOf('=');
    if (i < 1) continue;
    const name = part.slice(0, i).trim();
    let value = part.slice(i + 1).trim();
    if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
    try {
      value = decodeURIComponent(value);
    } catch {
      continue;
    }
    if (!(name in out)) out[name] = value; // la primera gana
  }
  return out;
}

const TOKEN_RE = /^[\w!#$%&'*+.^`|~-]+$/;

export function serializeCookie(name, value, opts = {}) {
  const { maxAgeSec, path = '/', httpOnly = true, secure = false, sameSite = 'Strict', domain } = opts;
  if (!TOKEN_RE.test(name)) throw new Error('Nombre de cookie inválido');
  if (name.startsWith('__Host-') && (!secure || path !== '/' || domain)) {
    throw new Error('Las cookies __Host- requieren Secure, Path=/ y no admiten Domain');
  }
  if (!['Strict', 'Lax', 'None'].includes(sameSite)) throw new Error('SameSite inválido');
  if (sameSite === 'None' && !secure) throw new Error('SameSite=None requiere Secure');
  const parts = [`${name}=${encodeURIComponent(value)}`, `Path=${path}`];
  if (domain) parts.push(`Domain=${domain}`);
  if (maxAgeSec !== undefined) parts.push(`Max-Age=${Math.floor(maxAgeSec)}`);
  if (maxAgeSec === 0) parts.push('Expires=Thu, 01 Jan 1970 00:00:00 GMT');
  if (httpOnly) parts.push('HttpOnly');
  if (secure) parts.push('Secure');
  parts.push(`SameSite=${sameSite}`);
  return parts.join('; ');
}

export function clearCookieHeader(name, opts = {}) {
  return serializeCookie(name, '', { ...opts, maxAgeSec: 0 });
}

export function cookieNames(isProd) {
  const prefix = isProd ? '__Host-' : '';
  return { professional: `${prefix}aimotion_pro`, patient: `${prefix}aimotion_pat` };
}

/** Anade Set-Cookie sin pisar los que ya existan. */
export function appendSetCookie(res, headerValue) {
  const prev = res.getHeader('Set-Cookie');
  const list = prev === undefined ? [] : Array.isArray(prev) ? prev : [String(prev)];
  res.setHeader('Set-Cookie', [...list, headerValue]);
}

export function csrfTokenFor(secret, cookies, names) {
  const material = `csrf|${cookies[names.professional] || ''}|${cookies[names.patient] || ''}`;
  return crypto.createHmac('sha256', secret).update(material).digest('hex');
}

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

/**
 * Middleware CSRF. Solo actua cuando la peticion trae una cookie de sesion
 * (sin cookie no hay "credenciales ambientales" que un tercero pueda abusar).
 * - Siempre verifica el origen (Origin / Sec-Fetch-Site).
 * - Exige el token X-CSRF-Token salvo en rutas marcadas como tokenExempt
 *   (login/registro: ahi basta con la verificacion de origen).
 */
export function csrfProtection({ secret, names, allowedOrigins = [], tokenExempt = () => false }) {
  const allowed = new Set(allowedOrigins);
  const deny = (res, message) => res.status(403).json({ error: message });
  return (req, res, next) => {
    if (SAFE_METHODS.has(req.method)) return next();
    const cookies = req.cookies || parseCookies(req.headers.cookie);
    const hasSession = Boolean(cookies[names.professional] || cookies[names.patient]);
    if (!hasSession) return next();

    const origin = req.headers.origin;
    if (origin !== undefined && !allowed.has(origin)) return deny(res, 'Origen no permitido');
    if (origin === undefined && req.headers['sec-fetch-site'] === 'cross-site') return deny(res, 'Origen no permitido');

    if (tokenExempt(req)) return next();
    const sent = req.headers['x-csrf-token'];
    if (typeof sent !== 'string' || !safeEqual(sent, csrfTokenFor(secret, cookies, names))) {
      return deny(res, 'Token CSRF inválido o ausente');
    }
    return next();
  };
}
