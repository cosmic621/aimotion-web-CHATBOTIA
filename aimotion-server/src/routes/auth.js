import { Router } from 'express';
import { v, validate } from '../security/validate.js';
import { professionalCtx, systemCtx } from '../db/context.js';
import { wrap, botFields } from './helpers.js';

export function createAuthRouter({ repos, tokens, hasher, loginGuard, botGuard, loginLimiter, sessions, audit }) {
  const router = Router();

  // Token CSRF de la sesion actual (solo el JS del propio sitio puede leer esta respuesta: lo impide CORS).
  router.get('/csrf', (req, res) => res.json({ csrfToken: sessions.csrf(req.cookies || {}) }));

  const loginSchema = v.object({
    email: v.email({ label: 'El correo' }),
    password: v.string({ min: 1, max: 128, trim: false, label: 'La contraseña' }),
    ...botFields,
  });

  // No hay registro publico de profesionales: se crean por consola (npm run create-professional).
  router.post('/login', loginLimiter, validate({ body: loginSchema }), botGuard, wrap(async (req, res) => {
    const { email, password } = req.valid.body;
    const key = `pro:${email}`;

    const gate = loginGuard.check(req.ip, key);
    if (!gate.allowed) {
      res.setHeader('Retry-After', String(gate.retryAfterSec));
      return res.status(429).json({ error: `Demasiados intentos fallidos. Intenta de nuevo en ${Math.ceil(gate.retryAfterSec / 60)} minuto(s).` });
    }

    const professional = await repos.professionals.findByEmail(systemCtx(), email);
    const ok = await hasher.verify(password, professional?.passwordHash); // misma duracion exista o no el correo
    if (!ok) {
      loginGuard.fail(req.ip, key);
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }
    loginGuard.success(req.ip, key);

    const token = tokens.signProfessional(professional);
    sessions.set(res, 'professional', token);
    await audit(professionalCtx(professional), { professionalId: professional.id, action: 'login', resourceType: 'auth' });
    const cookies = { ...(req.cookies || {}), [sessions.names.professional]: token };
    return res.json({
      professional: { id: professional.id, name: professional.name, email: professional.email, role: professional.role },
      csrfToken: sessions.csrf(cookies),
    });
  }));

  router.post('/logout', (req, res) => {
    sessions.clear(res, 'professional');
    res.json({ ok: true });
  });

  router.get('/me', (req, res) => res.json({ authenticated: true, professional: req.professional }));

  return router;
}
