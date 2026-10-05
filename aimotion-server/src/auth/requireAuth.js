import { verifyToken } from './jwt.js';

export function requireAuth(req, res, next) {
  const header = req.header('authorization') || '';
  const [scheme, token] = header.split(' ');

  if (scheme !== 'Bearer' || !token) {
    return res.status(401).json({ error: 'Falta el token de autenticación (Authorization: Bearer <token>)' });
  }

  try {
    const payload = verifyToken(token);
    req.professional = { id: payload.sub, email: payload.email, role: payload.role, name: payload.name };
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Token inválido o expirado, inicia sesión de nuevo' });
  }
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
