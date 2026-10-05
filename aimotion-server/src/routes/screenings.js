import { Router } from 'express';
import { nanoid } from 'nanoid';
import { z } from 'zod';
import { screeningsRepo } from '../db/screeningsRepo.js';
import { auditRepo } from '../db/auditRepo.js';
import { requireAuth } from '../auth/requireAuth.js';

export const screeningsRouter = Router();

const createSchema = z.object({
  sessionId: z.string().min(1),
  userName: z.string().optional().nullable(),
  type: z.enum(['PHQ-9', 'GAD-7']),
  answers: z.array(z.number()),
  totalScore: z.number(),
  severity: z.string(),
});

screeningsRouter.post('/', async (req, res) => {
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'sessionId, type (PHQ-9|GAD-7), answers[], totalScore y severity son requeridos' });
  }

  const record = await screeningsRepo.create({ id: nanoid(10), ...parsed.data });
  res.status(201).json(record);
});

// Panel profesional: requiere sesion valida (JWT).
screeningsRouter.get('/', requireAuth, async (req, res) => {
  const screenings = await screeningsRepo.list();
  await auditRepo.log({ professionalId: req.professional.id, action: 'list_screenings', resourceType: 'screening' });
  res.json(screenings);
});
