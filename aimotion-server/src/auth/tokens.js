// Tokens de sesion (items 6 y 9). JWT HS256 firmado por el servidor.
// - Algoritmo FIJO (HS256): no se acepta "none" ni cambios de algoritmo.
// - Emisor y audiencia verificados: un token de paciente no sirve como
//   token de profesional, y viceversa.
// - verify() nunca lanza: devuelve el payload o null.
import crypto from 'node:crypto';

export const TTL_SECONDS = { professional: 8 * 3600, patient: 7 * 24 * 3600 };
const AUDIENCE = { professional: 'aimotion-professional', patient: 'aimotion-patient' };
const ISSUER = 'aimotion';

export function createTokenService({ jwt, secret }) {
  if (!secret || secret.length < 32) throw new Error('JWT_SECRET debe tener al menos 32 caracteres');

  function sign(kind, claims) {
    if (!AUDIENCE[kind]) throw new Error('Tipo de sesión desconocido');
    if (!claims?.sub) throw new Error('El token requiere un sujeto (sub)');
    return jwt.sign(claims, secret, {
      algorithm: 'HS256',
      expiresIn: TTL_SECONDS[kind],
      issuer: ISSUER,
      audience: AUDIENCE[kind],
      jwtid: crypto.randomUUID(),
    });
  }

  function verify(token, kind) {
    if (!AUDIENCE[kind] || typeof token !== 'string' || token.length > 4096) return null;
    try {
      const payload = jwt.verify(token, secret, { algorithms: ['HS256'], issuer: ISSUER, audience: AUDIENCE[kind] });
      return payload?.sub ? payload : null;
    } catch {
      return null;
    }
  }

  return {
    signProfessional: (p) => sign('professional', { sub: p.id, email: p.email, role: p.role, name: p.name }),
    signPatient: (u) => sign('patient', { sub: u.id, email: u.email, name: u.name }),
    verify,
    ttl: TTL_SECONDS,
  };
}
