// Revision de la sesion contra la cuenta REAL en cada peticion.
//
// El token (cookie HttpOnly) solo prueba quien inicio sesion; no puede enterarse de que despues
// el administrador suspendio la cuenta, cambio su contrasena, la elimino o cambio su perfil.
// Este middleware consulta la cuenta y, si ya no corresponde, descarta la sesion (la peticion
// sigue como anonima y la politica de acceso responde 401). Tambien toma el ROL desde la base
// de datos (no del token), asi un cambio de perfil aplica de inmediato.
//
// Para no consultar la base en cada clic, el resultado se guarda unos segundos (ttlMs). Cuando el
// admin cambia una cuenta se llama a invalidate() y el cambio se nota al instante en este servidor.
import { systemCtx } from '../db/context.js';
import { isSessionAllowed } from '../domain/accountRules.js';

export function createSessionGuard({ repos, ttlMs = 5000, maxEntries = 2000, now = Date.now }) {
  const cache = new Map();

  async function load(kind, id) {
    const key = `${kind}:${id}`;
    const hit = cache.get(key);
    if (hit && now() - hit.at < ttlMs) return hit.account;
    const repo = kind === 'professional' ? repos.professionals : repos.users;
    const account = (await repo.findById(systemCtx(), id)) || null;
    if (cache.size >= maxEntries) cache.clear();
    cache.set(key, { at: now(), account });
    return account;
  }

  /** Olvida lo guardado de una cuenta. kind: 'professional' | 'patient'. */
  const invalidate = (kind, id) => cache.delete(`${kind}:${id}`);

  async function middleware(req, _res, next) {
    try {
      if (req.professional) {
        const acc = await load('professional', req.professional.id);
        if (isSessionAllowed(acc, req.professional.iat)) {
          req.professional.role = acc.role;
          req.professional.name = acc.name;
        } else {
          delete req.professional;
        }
      }
      if (req.user) {
        const acc = await load('patient', req.user.id);
        if (isSessionAllowed(acc, req.user.iat)) {
          req.user.role = acc.role || 'USUARIO';
          req.user.name = acc.name;
        } else {
          delete req.user;
        }
      }
      next();
    } catch (err) {
      next(err); // si no se puede comprobar la cuenta, no se deja pasar la sesion
    }
  }

  return { middleware, invalidate };
}
