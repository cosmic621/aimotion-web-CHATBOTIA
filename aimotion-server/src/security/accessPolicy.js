// Politica de acceso CENTRAL "denegar por defecto" (items 6 y 7).
//
// Cada ruta de la API debe aparecer aqui con su nivel de acceso. Una ruta que
// no esta en la tabla se rechaza con 403, asi que olvidar proteger una ruta
// nueva es imposible: queda cerrada hasta que alguien decida abrirla.
//
//   public       sin sesion
//   optional     sin sesion obligatoria; si hay sesion de paciente se asocia
//   patient      requiere sesion de paciente
//   professional requiere sesion de profesional
//   admin        requiere profesional con rol ADMIN
import { parseCookies } from './cookies.js';

export const ACCESS_POLICY = [
  ['GET', '/api/health', 'public'],
  ['GET', '/api/auth/csrf', 'public'],
  ['POST', '/api/auth/login', 'public'],
  ['POST', '/api/auth/logout', 'public'],
  ['GET', '/api/auth/me', 'professional'],
  ['POST', '/api/patient-auth/register', 'public'],
  ['POST', '/api/patient-auth/login', 'public'],
  ['POST', '/api/patient-auth/logout', 'public'],
  ['GET', '/api/patient-auth/me', 'patient'],
  ['PATCH', '/api/patient-auth/contact', 'patient'],
  ['POST', '/api/screenings', 'optional'],
  ['GET', '/api/screenings', 'professional'],
  ['POST', '/api/alerts', 'optional'],
  ['GET', '/api/alerts', 'professional'],
  ['PATCH', '/api/alerts/:id/review', 'professional'],
  ['POST', '/api/chat/messages', 'optional'],
  ['GET', '/api/chat/messages', 'optional'],
  ['GET', '/api/chat/users', 'professional'],
  ['GET', '/api/chat/users/:userId/messages', 'professional'],
  ['POST', '/api/treatment-plans', 'professional'],
  ['GET', '/api/treatment-plans/mine', 'patient'],
  ['GET', '/api/treatment-plans/user/:userId', 'professional'],
  ['PATCH', '/api/treatment-plans/:id/progress', 'patient'],
  ['GET', '/api/admin/metrics', 'admin'],
];

function matches(pattern, path) {
  const a = pattern.split('/').filter(Boolean);
  const b = path.split('/').filter(Boolean);
  if (a.length !== b.length) return false;
  return a.every((seg, i) => (seg.startsWith(':') ? /^[A-Za-z0-9_-]{1,64}$/.test(b[i]) : seg === b[i]));
}

/** Devuelve el nivel de acceso de (metodo, ruta) o null si no esta permitida. */
export function matchPolicy(method, path, policy = ACCESS_POLICY) {
  const clean = String(path).split('?')[0].replace(/\/+$/, '') || '/';
  const m = String(method).toUpperCase();
  for (const [pm, pattern, level] of policy) {
    if (pm === m && matches(pattern, clean)) return level;
  }
  return null;
}

/**
 * Identifica la sesion de la peticion a partir de las cookies HttpOnly.
 * verify(token, audience) devuelve el payload o null (nunca lanza).
 */
export function createAuthenticator({ verify, names }) {
  return (req, _res, next) => {
    req.cookies = parseCookies(req.headers.cookie);
    const pro = req.cookies[names.professional] ? verify(req.cookies[names.professional], 'professional') : null;
    const pat = req.cookies[names.patient] ? verify(req.cookies[names.patient], 'patient') : null;
    if (pro) req.professional = { id: pro.sub, email: pro.email, role: pro.role, name: pro.name };
    if (pat) req.user = { id: pat.sub, email: pat.email, name: pat.name };
    next();
  };
}

export function enforceAccess(policy = ACCESS_POLICY) {
  return (req, res, next) => {
    const level = matchPolicy(req.method, req.originalUrl || req.url, policy);
    if (level === null) return res.status(403).json({ error: 'Ruta no permitida' });
    if (level === 'public' || level === 'optional') return next();
    if (level === 'patient') return req.user ? next() : res.status(401).json({ error: 'Inicia sesión para continuar' });
    if (level === 'professional') return req.professional ? next() : res.status(401).json({ error: 'Inicia sesión como profesional para continuar' });
    if (level === 'admin') {
      if (!req.professional) return res.status(401).json({ error: 'Inicia sesión como profesional para continuar' });
      return req.professional.role === 'ADMIN' ? next() : res.status(403).json({ error: 'No tienes permiso para esta acción' });
    }
    return res.status(403).json({ error: 'Ruta no permitida' });
  };
}
