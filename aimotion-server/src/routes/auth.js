import { Router } from 'express';
import { z } from 'zod';
import { professionalsRepo } from '../db/professionalsRepo.js';
import { verifyPassword } from '../auth/hash.js';
import { signProfessionalToken } from '../auth/jwt.js';
import { requireAuth } from '../auth/requireAuth.js';
import { auditRepo } from '../db/auditRepo.js';

export const authRouter = Router();

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

// No existe un endpoint publico de registro a proposito: las cuentas
// profesionales se crean con `npm run create-professional` (ver scripts/),
// para evitar que cualquiera pueda auto-registrarse como profesional en un
// sistema que maneja alertas de riesgo clinico.
authRouter.post('/login', async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Email y contraseña son requeridos' });
  }
  const { email, password } = parsed.data;

  const professional = await professionalsRepo.findByEmail(email);
  if (!professional) {
    return res.status(401).json({ error: 'Credenciales inválidas' });
  }

  const valid = await verifyPassword(password, professional.passwordHash);
  if (!valid) {
    return res.status(401).json({ error: 'Credenciales inválidas' });
  }

  const token = signProfessionalToken(professional);
  await auditRepo.log({ professionalId: professional.id, action: 'login', resourceType: 'auth' });

  res.json({
    token,
    professional: { id: professional.id, name: professional.name, email: professional.email, role: professional.role },
  });
});

// Util para que el frontend verifique si el token guardado sigue siendo valido.
authRouter.get('/me', requireAuth, async (req, res) => {
  res.json({ authenticated: !!req.professional, professional: req.professional || null });
});
