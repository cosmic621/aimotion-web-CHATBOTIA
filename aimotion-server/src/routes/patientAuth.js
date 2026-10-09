import { Router } from 'express';
import { nanoid } from 'nanoid';
import { z } from 'zod';
import { usersRepo, publicUser } from '../db/usersRepo.js';
import { hashPassword, verifyPassword } from '../auth/hash.js';
import { signPatientToken } from '../auth/jwt.js';
import { requirePatientAuth } from '../auth/requireAuth.js';
import { normalizePhone } from '../utils/phone.js';

export const patientAuthRouter = Router();

// Contacto de emergencia: persona de confianza (padre, madre, acudiente,
// pareja, amistad...) a quien se le enviara un SMS breve SOLO si el sistema
// detecta una situacion de riesgo critico. Requiere consentimiento explicito.
const contactSchema = z.object({
  contactName: z.string().min(1, 'Escribe el nombre de tu contacto de emergencia').max(120),
  contactPhone: z.string().min(1, 'Escribe el número de tu contacto de emergencia'),
  contactRelation: z.string().min(1, 'Indica quién es esta persona (ej. mamá, papá, acudiente)').max(60),
  contactConsent: z.literal(true, { message: 'Debes autorizar el aviso al contacto de emergencia para crear la cuenta' }),
});

function parseContact(data) {
  const phone = normalizePhone(data.contactPhone);
  if (!phone) return { error: 'El número del contacto no parece válido. Ejemplo: 3001234567 o +573001234567' };
  return { contact: { name: data.contactName.trim(), phone, relation: data.contactRelation.trim() } };
}

const registerSchema = z
  .object({
    name: z.string().min(1).max(200),
    email: z.string().email('Correo inválido'),
    password: z.string().min(8, 'La contraseña debe tener al menos 8 caracteres'),
  })
  .and(contactSchema);

patientAuthRouter.post('/register', async (req, res) => {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues[0]?.message || 'Datos inválidos' });
  }
  const { name, email, password } = parsed.data;
  const { contact, error } = parseContact(parsed.data);
  if (error) return res.status(400).json({ error });

  const existing = await usersRepo.findByEmail(email);
  if (existing) return res.status(409).json({ error: 'Ya existe una cuenta con ese correo' });

  const passwordHash = await hashPassword(password);
  const user = await usersRepo.create({ id: nanoid(12), name, email, passwordHash, contact });
  const token = signPatientToken(user);
  res.status(201).json({ token, user: publicUser(user) });
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

patientAuthRouter.post('/login', async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Email y contraseña son requeridos' });
  const { email, password } = parsed.data;

  const user = await usersRepo.findByEmail(email);
  if (!user) return res.status(401).json({ error: 'Credenciales inválidas' });
  const valid = await verifyPassword(password, user.passwordHash);
  if (!valid) return res.status(401).json({ error: 'Credenciales inválidas' });

  const token = signPatientToken(user);
  res.json({ token, user: publicUser(user) });
});

patientAuthRouter.get('/me', requirePatientAuth, async (req, res) => {
  const user = await usersRepo.findById(req.user.id);
  if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });
  res.json({ authenticated: true, user: publicUser(user) });
});

// Agregar o cambiar el contacto de emergencia (p.ej. cuentas creadas antes de
// que fuera obligatorio). Tambien exige consentimiento explicito.
patientAuthRouter.patch('/contact', requirePatientAuth, async (req, res) => {
  const parsed = contactSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0]?.message || 'Datos inválidos' });
  const { contact, error } = parseContact(parsed.data);
  if (error) return res.status(400).json({ error });

  const user = await usersRepo.updateContact(req.user.id, contact);
  res.json({ user: publicUser(user) });
});
