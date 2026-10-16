import { nanoid } from 'nanoid';
import { appendSetCookie, clearCookieHeader, csrfTokenFor, serializeCookie } from '../security/cookies.js';
import { TTL_SECONDS } from '../auth/tokens.js';
import { v } from '../security/validate.js';

/** Express 4 no captura errores de handlers async: sin esto un rechazo tumba el proceso. */
export const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

export function createSessionManager({ config }) {
  const { names, secure, sameSite } = config.cookies;
  const opts = (maxAgeSec) => ({ maxAgeSec, secure, sameSite, httpOnly: true, path: '/' });
  return {
    names,
    set: (res, kind, token) => appendSetCookie(res, serializeCookie(names[kind], token, opts(TTL_SECONDS[kind]))),
    clear: (res, kind) => appendSetCookie(res, clearCookieHeader(names[kind], opts(0))),
    csrf: (cookies) => csrfTokenFor(config.csrfSecret, cookies, names),
  };
}

export function createAuditor({ repos, logger = console }) {
  return async (ctx, data) => {
    try {
      await repos.audit.log(ctx, { id: nanoid(12), ...data });
    } catch (err) {
      logger.error('[audit] no se pudo registrar:', err.message);
    }
  };
}

// Campos que solo usan las defensas contra bots (se aceptan pero se ignoran).
export const botFields = {
  website: v.string({ max: 200 }).optional(),
  formStartedAt: v.number({ min: 0 }).optional(),
  turnstileToken: v.string({ max: 2048 }).optional(),
};

export const idParam = (name) => v.object({ [name]: v.string({ min: 1, max: 64, pattern: /^[A-Za-z0-9_-]+$/, label: 'El identificador' }) });
export const sessionIdSchema = v.string({ min: 8, max: 64, pattern: /^[A-Za-z0-9_-]+$/, label: 'La sesión', patternMessage: 'La sesión no es válida' });
export const paginationQuery = { limit: v.string({ max: 6 }).optional(), offset: v.string({ max: 8 }).optional() };
