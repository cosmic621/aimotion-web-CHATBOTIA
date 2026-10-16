// Cabeceras de seguridad (item 18) y obligatoriedad de HTTPS (item 19).
// La API solo devuelve JSON, por eso la CSP es la mas estricta posible.

export function securityHeaders({ hsts = false, hstsMaxAgeSec = 31_536_000 } = {}) {
  return (req, res, next) => {
    res.removeHeader?.('X-Powered-By');
    res.setHeader('Content-Security-Policy', "default-src 'none'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'");
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Referrer-Policy', 'no-referrer');
    res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=(), payment=(), usb=(), interest-cohort=()');
    res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
    res.setHeader('Cross-Origin-Resource-Policy', 'same-site');
    res.setHeader('X-DNS-Prefetch-Control', 'off');
    // Datos de salud: nunca deben quedar en cachés del navegador o intermediarios.
    res.setHeader('Cache-Control', 'no-store, max-age=0');
    res.setHeader('Pragma', 'no-cache');
    if (hsts) res.setHeader('Strict-Transport-Security', `max-age=${hstsMaxAgeSec}; includeSubDomains`);
    next();
  };
}

const HOST_RE = /^[a-z0-9.-]+(:\d{1,5})?$/i;

/**
 * Obliga a usar HTTPS. Detras de un proxy (nginx, Render, etc.) configura
 * TRUST_PROXY para que Express interprete X-Forwarded-Proto (req.secure).
 * publicHost evita redirecciones abiertas por Host manipulado.
 */
export function forceHttps({ enabled = false, publicHost = '' } = {}) {
  return (req, res, next) => {
    if (!enabled || req.secure) return next();
    if (req.method === 'GET' || req.method === 'HEAD') {
      const host = publicHost || String(req.headers.host || '');
      if (!HOST_RE.test(host)) return res.status(400).json({ error: 'Host inválido' });
      return res.redirect(308, `https://${host}${req.originalUrl || req.url}`);
    }
    return res.status(426).json({ error: 'Se requiere HTTPS' });
  };
}
