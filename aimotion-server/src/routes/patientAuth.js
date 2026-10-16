import { Router } from 'express';
import { nanoid } from 'nanoid';
import { v, validate } from '../security/validate.js';
import { checkPassword } from '../security/passwordPolicy.js';
import { normalizePhone } from '../utils/phone.js';
import { publicUser } from '../db/repos.js';
import { patientCtx, systemCtx } from '../db/context.js';
import { wrap, botFields } from './helpers.js';

const contactFields = {
  contactName: v.string({ min: 1, max: 100, label: 'El nombre del contacto de emergencia' }),
  contactPhone: v.string({ min: 1, max: 30, label: 'El número del contacto de emergencia' }),
  contactRelation: v.string({ min: 1, max: 60, label: 'El parentesco del contacto' }),
  contactConsent: v.literal(true, { message: 'Debes autorizar el aviso al contacto de emergencia para crear la cuenta' }),
};

export function createPatientAuthRouter({ repos, tokens, hasher, loginGuard, botGuard, registerLimiter, loginLimiter, sessions }) {
  const router = Router();

  const registerSchema = v.object({
    name: v.string({ min: 1, max: 100, label: 'Tu nombre' }),
    email: v.email({ label: 'El correo' }),
    password: v.string({ min: 1, max: 128, trim: false, label: 'La contraseña' }),
    ...contactFields,
    ...botFields,
  });

  function parseContact(b) {
    const phone = normalizePhone(b.contactPhone);
    if (!phone) return { error: 'El número del contacto no parece válido. Ejemplo: 3001234567 o +573001234567' };
    return { contact: { name: b.contactName, phone, relation: b.contactRelation } };
  }

  router.post('/register', registerLimiter, validate({ body: registerSchema }), botGuard, wrap(async (req, res) => {
    const b = req.valid.body;
    const pw = checkPassword(b.password, { email: b.email, name: b.name });
    if (!pw.ok) return res.status(400).json({ error: pw.reason });
    const { contact, error } = parseContact(b);
    if (error) return res.status(400).json({ error });

    const sys = systemCtx();
    if (await repos.users.findByEmail(sys, b.email)) return res.status(409).json({ error: 'Ya existe una cuenta con ese correo' });

    const passwordHash = await hasher.hash(b.password);
    const user = await repos.users.create(sys, { id: nanoid(12), name: b.name, email: b.email, passwordHash, contact });
    const token = tokens.signPatient(user);
    sessions.set(res, 'patient', token);
    const cookies = { ...(req.cookies || {}), [sessions.names.patient]: token };
    return res.status(201).json({ user: publicUser(user), csrfToken: sessions.csrf(cookies) });
  }));

  const loginSchema = v.object({
    email: v.email({ label: 'El correo' }),
    password: v.string({ min: 1, max: 128, trim: false, label: 'La contraseña' }),
    ...botFields,
  });

  router.post('/login', loginLimiter, validate({ body: loginSchema }), botGuard, wrap(async (req, res) => {
    const { email, password } = req.valid.body;
    const key = `pat:${email}`;
    const gate = loginGuard.check(req.ip, key);
    if (!gate.allowed) {
      res.setHeader('Retry-After', String(gate.retryAfterSec));
      return res.status(429).json({ error: `Demasiados intentos fallidos. Intenta de nuevo en ${Math.ceil(gate.retryAfterSec / 60)} minuto(s).` });
    }
    const user = await repos.users.findByEmail(systemCtx(), email);
    const ok = await hasher.verify(password, user?.passwordHash);
    if (!ok) {
      loginGuard.fail(req.ip, key);
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }
    loginGuard.success(req.ip, key);
    const token = tokens.signPatient(user);
    sessions.set(res, 'patient', token);
    const cookies = { ...(req.cookies || {}), [sessions.names.patient]: token };
    return res.json({ user: publicUser(user), csrfToken: sessions.csrf(cookies) });
  }));

  router.post('/logout', (req, res) => {
    sessions.clear(res, 'patient');
    res.json({ ok: true });
  });

  router.get('/me', wrap(async (req, res) => {
    const user = await repos.users.findById(patientCtx(req.user), req.user.id);
    if (!user) return res.status(401).json({ error: 'Sesión inválida' });
    return res.json({ authenticated: true, user: publicUser(user) });
  }));

  const contactSchema = v.object(contactFields);
  router.patch('/contact', validate({ body: contactSchema }), wrap(async (req, res) => {
    const { contact, error } = parseContact(req.valid.body);
    if (error) return res.status(400).json({ error });
    const user = await repos.users.updateContact(patientCtx(req.user), req.user.id, contact);
    if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });
    return res.json({ user: publicUser(user) });
  }));

  return router;
}
