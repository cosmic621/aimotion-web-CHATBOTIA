import { verifyToken } from './jwt.js';

function extractToken(req) {
  const header = req.header('authorization') || '';
  const [scheme, token] = header.split(' ');
  return scheme === 'Bearer' ? token : null;
}

/** Exige un token valido de PROFESIONAL (no sirve un token de paciente). */
export function requireAuth(req, res, next) {
  const token = extractToken(req);
  if (!token) {
    return res.status(401).json({ error: 'Falta el token de autenticación (Authorization: Bearer <token>)' });
  }
  try {
    const payload = verifyToken(token);
    if (payload.type !== 'professional') {
      return res.status(403).json({ error: 'Esta ruta requiere una cuenta profesional' });
    }
    req.professional = { id: payload.sub, email: payload.email, role: payload.role, name: payload.name };
    next();
  } catch {
    return res.status(401).json({ error: 'Token inválido o expirado, inicia sesión de nuevo' });
  }
}

/** Exige un token valido de PACIENTE (no sirve un token de profesional). */
export function requirePatientAuth(req, res, next) {
  const token = extractToken(req);
  if (!token) {
    return res.status(401).json({ error: 'Falta el token de autenticación (Authorization: Bearer <token>)' });
  }
  try {
    const payload = verifyToken(token);
    if (payload.type !== 'patient') {
      return res.status(403).json({ error: 'Esta ruta requiere una cuenta de usuario' });
    }
    req.user = { id: payload.sub, email: payload.email, name: payload.name };
    next();
  } catch {
    return res.status(401).json({ error: 'Token inválido o expirado, inicia sesión de nuevo' });
  }
}

/**
 * Autenticacion opcional de paciente: si viene un token de paciente valido lo
 * adjunta a req.user, pero si no hay token (o es invalido) deja continuar de
 * todas formas como anonimo. Util para el chat, que funciona con o sin cuenta.
 */
export function optionalPatientAuth(req, _res, next) {
  const token = extractToken(req);
  if (!token) return next();
  try {
    const payload = verifyToken(token);
    if (payload.type === 'patient') {
      req.user = { id: payload.sub, email: payload.email, name: payload.name };
    }
  } catch {
    // token invalido/expirado: seguir como anonimo, no es un error aqui
  }
  next();
}

/** Restringe una ruta a uno o mas roles especificos. Usar despues de requireAuth. */
export function requireRole(...roles) {
  return (req, res, next) => {
    if (!roles.includes(req.professional?.role)) {
      return res.status(403).json({ error: 'No tienes permiso para esta acción' });
    }
    next();
  };
}
