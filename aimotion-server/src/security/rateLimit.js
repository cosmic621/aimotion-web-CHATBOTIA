// Limitacion de peticiones (items 11, 12 y 17). En memoria: suficiente para una
// sola instancia. Si se despliegan varias instancias, reemplazar el store por Redis.

/**
 * Limitador de ventana fija por clave (por defecto la IP).
 */
export function createRateLimiter({
  name = 'limiter',
  windowMs,
  max,
  keyFn = (req) => req.ip || 'unknown',
  message = 'Demasiadas solicitudes. Intenta de nuevo en un momento.',
  now = () => Date.now(),
  cleanupIntervalMs = 60_000,
}) {
  const store = new Map();
  const stats = { allowed: 0, blocked: 0 };

  function hit(key) {
    const t = now();
    let e = store.get(key);
    if (!e || e.resetAt <= t) {
      e = { count: 0, resetAt: t + windowMs };
      store.set(key, e);
    }
    e.count += 1;
    return { count: e.count, remaining: Math.max(0, max - e.count), resetAt: e.resetAt, limited: e.count > max };
  }

  function sweep() {
    const t = now();
    for (const [k, e] of store) if (e.resetAt <= t) store.delete(k);
  }

  const timer = cleanupIntervalMs > 0 ? setInterval(sweep, cleanupIntervalMs) : null;
  timer?.unref?.();

  function middleware(req, res, next) {
    const r = hit(String(keyFn(req)));
    res.setHeader('RateLimit-Limit', String(max));
    res.setHeader('RateLimit-Remaining', String(r.remaining));
    res.setHeader('RateLimit-Reset', String(Math.max(0, Math.ceil((r.resetAt - now()) / 1000))));
    if (r.limited) {
      stats.blocked += 1;
      res.setHeader('Retry-After', String(Math.max(1, Math.ceil((r.resetAt - now()) / 1000))));
      return res.status(429).json({ error: message });
    }
    stats.allowed += 1;
    return next();
  }

  return Object.assign(middleware, {
    hit,
    sweep,
    reset: (key) => store.delete(key),
    stop: () => timer && clearInterval(timer),
    stats: () => ({ name, ...stats, keys: store.size }),
  });
}

/**
 * Proteccion de inicio de sesion (item 11): cuenta intentos fallidos por cuenta
 * y por IP; al superar el limite bloquea, y cada bloqueo repetido dura el doble
 * (hasta un maximo). Un inicio de sesion correcto limpia el contador de la cuenta.
 */
export function createLoginGuard({
  maxFailuresPerAccount = 5,
  maxFailuresPerIp = 20,
  windowMs = 15 * 60_000,
  baseLockMs = 15 * 60_000,
  maxLockMs = 24 * 3_600_000,
  now = () => Date.now(),
  maxEntries = 50_000,
} = {}) {
  const accounts = new Map();
  const ips = new Map();
  const normId = (id) => String(id || '').trim().toLowerCase();

  function getEntry(map, key) {
    let e = map.get(key);
    const t = now();
    if (!e) {
      if (map.size >= maxEntries) {
        for (const [k, v] of map) {
          if (v.lockedUntil <= t && t - v.firstAt > windowMs) map.delete(k);
          if (map.size < maxEntries * 0.9) break;
        }
      }
      e = { failures: 0, firstAt: t, lockedUntil: 0, lockCount: 0 };
      map.set(key, e);
    }
    if (t - e.firstAt > windowMs && e.lockedUntil <= t) {
      e.failures = 0;
      e.firstAt = t;
    }
    return e;
  }

  function registerFailure(map, key, limit) {
    const e = getEntry(map, key);
    e.failures += 1;
    if (e.failures >= limit) {
      e.lockCount += 1;
      e.lockedUntil = now() + Math.min(baseLockMs * 2 ** (e.lockCount - 1), maxLockMs);
      e.failures = 0;
      e.firstAt = now();
    }
  }

  return {
    check(ip, identifier) {
      const t = now();
      const locked = [accounts.get(normId(identifier)), ips.get(String(ip))]
        .filter((e) => e && e.lockedUntil > t)
        .map((e) => e.lockedUntil);
      if (locked.length) return { allowed: false, retryAfterSec: Math.ceil((Math.max(...locked) - t) / 1000) };
      return { allowed: true, retryAfterSec: 0 };
    },
    fail(ip, identifier) {
      registerFailure(accounts, normId(identifier), maxFailuresPerAccount);
      registerFailure(ips, String(ip), maxFailuresPerIp);
    },
    success(_ip, identifier) {
      accounts.delete(normId(identifier));
    },
    stats: () => ({ trackedAccounts: accounts.size, trackedIps: ips.size }),
  };
}
