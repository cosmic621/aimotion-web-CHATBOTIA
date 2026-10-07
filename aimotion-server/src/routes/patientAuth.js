import { Router } from 'express';
import { nanoid } from 'nanoid';
import { z } from 'zod';
import { usersRepo } from '../db/usersRepo.js';
import { hashPassword, verifyPassword } from '../auth/hash.js';
import { signPatientToken } from '../auth/jwt.js';
import { requirePatientAuth } from '../auth/requireAuth.js';

export const patientAuthRouter = Router();

const registerSchema = z.object({
  name: z.string().min(1).max(200),
  email: z.string().email(),
  password: z.string().min(8, 'La contraseña debe tener al menos 8 caracteres'),
});

// A diferencia de las cuentas profesionales, aqui SI hay registro publico:
// cualquier persona que use el chat puede crear una cuenta para que su
// historial persista entre visitas. No se recolecta ningun dato clinico en
// el registro mismo, solo nombre/email/contraseña.
patientAuthRouter.post('/register', async (req, res) => {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues[0]?.message || 'Datos inválidos' });
  }
  const { name, email, password } = parsed.data;

  const existing = await usersRepo.findByEmail(email);
  if (existing) {
    return res.status(409).json({ error: 'Ya existe una cuenta con ese correo' });
  }

  const passwordHash = await hashPassword(password);
  const user = await usersRepo.create({ id: nanoid(12), name, email, passwordHash });
  const token = signPatientToken(user);

  res.status(201).json({ token, user: { id: user.id, name: user.name, email: user.email } });
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

patientAuthRouter.post('/login', async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Email y contraseña son requeridos' });
  }
  const { email, password } = parsed.data;

  const user = await usersRepo.findByEmail(email);
  if (!user) return res.status(401).json({ error: 'Credenciales inválidas' });

  const valid = await verifyPassword(password, user.passwordHash);
  if (!valid) return res.status(401).json({ error: 'Credenciales inválidas' });

  const token = signPatientToken(user);
  res.json({ token, user: { id: user.id, name: user.name, email: user.email } });
});

patientAuthRouter.get('/me', requirePatientAuth, async (req, res) => {
  res.json({ authenticated: true, user: req.user });
});
