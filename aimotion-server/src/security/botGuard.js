// Proteccion contra bots (item 12), en capas:
//   1. Honeypot: campo oculto que una persona nunca llena.
//   2. Tiempo minimo de llenado del formulario (los bots envian al instante).
//   3. (Opcional) Cloudflare Turnstile verificado en el servidor si hay TURNSTILE_SECRET.
//   + limitacion de peticiones (rateLimit.js).

export function checkHoneypot(body, field = 'website') {
  return typeof body?.[field] === 'string' && body[field].trim() !== '';
}

export function checkFormTiming(startedAt, { minMs = 2000, maxMs = 2 * 3_600_000, now = () => Date.now() } = {}) {
  if (typeof startedAt !== 'number' || !Number.isFinite(startedAt)) return { ok: false, reason: 'missing' };
  const elapsed = now() - startedAt;
  if (elapsed < 0) return { ok: false, reason: 'invalid' };
  if (elapsed < minMs) return { ok: false, reason: 'too_fast' };
  if (elapsed > maxMs) return { ok: false, reason: 'expired' };
  return { ok: true };
}

export async function verifyTurnstile({ token, secret, ip, fetchImpl = globalThis.fetch, timeoutMs = 5000 }) {
  if (!secret) return { ok: true, skipped: true };
  if (!token || typeof token !== 'string' || token.length > 2048) return { ok: false, reason: 'missing_token' };
  try {
    const form = new URLSearchParams({ secret, response: token });
    if (ip) form.set('remoteip', ip);
    const res = await fetchImpl('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      body: form,
      signal: AbortSignal.timeout(timeoutMs),
    });
    const data = await res.json();
    return data?.success === true ? { ok: true } : { ok: false, reason: 'failed' };
  } catch {
    return { ok: false, reason: 'unreachable' };
  }
}

/**
 * Middleware para login/registro. El cuerpo ya validado debe traer
 * website (honeypot), formStartedAt y, si se usa Turnstile, turnstileToken.
 */
export function createBotGuard({ turnstileSecret = '', requireTiming = true, minMs = 2000, now = () => Date.now(), fetchImpl } = {}) {
  const blocked = (res) => res.status(400).json({ error: 'No se pudo procesar la solicitud. Intenta de nuevo.' });
  return async (req, res, next) => {
    const body = req.valid?.body || req.body || {};
    if (checkHoneypot(body)) return blocked(res);
    if (requireTiming && !checkFormTiming(body.formStartedAt, { minMs, now }).ok) return blocked(res);
    const t = await verifyTurnstile({ token: body.turnstileToken, secret: turnstileSecret, ip: req.ip, fetchImpl });
    if (!t.ok) return blocked(res);
    return next();
  };
}
