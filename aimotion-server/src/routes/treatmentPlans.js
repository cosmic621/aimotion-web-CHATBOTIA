import { Router } from 'express';
import { nanoid } from 'nanoid';
import { z } from 'zod';
import { treatmentPlansRepo } from '../db/treatmentPlansRepo.js';
import { usersRepo } from '../db/usersRepo.js';
import { auditRepo } from '../db/auditRepo.js';
import { requireAuth, requirePatientAuth } from '../auth/requireAuth.js';

export const treatmentPlansRouter = Router();

const weekSchema = z.object({
  week_number: z.number().int().positive(),
  title: z.string().min(1).max(200),
  description: z.string().min(1).max(2000),
  completed: z.boolean().optional().default(false),
});

const createPlanSchema = z.object({
  userId: z.string().min(1),
  condition: z.enum(['depresion', 'ansiedad', 'estres', 'esquizofrenia']),
  title: z.string().min(1).max(200),
  weeks: z.array(weekSchema).min(1).max(12),
});

// SOLO un profesional autenticado puede crear un plan. professionalId sale
// del token verificado (req.professional.id), nunca de lo que mande el
// cliente — asi un plan no puede quedar "sin autor humano" por error o por
// manipulacion del request.
treatmentPlansRouter.post('/', requireAuth, async (req, res) => {
  const parsed = createPlanSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues[0]?.message || 'Datos de plan inválidos' });
  }
  const { userId, condition, title, weeks } = parsed.data;

  const patient = await usersRepo.findById(userId);
  if (!patient) return res.status(404).json({ error: 'Usuario no encontrado' });

  const plan = await treatmentPlansRepo.create({
    id: nanoid(12),
    userId,
    professionalId: req.professional.id,
    condition,
    title,
    weeks,
  });
  await auditRepo.log({ professionalId: req.professional.id, action: 'create_treatment_plan', resourceType: 'treatment_plan', resourceId: plan.id });
  res.status(201).json(plan);
});

// El paciente ve sus propios planes.
treatmentPlansRouter.get('/mine', requirePatientAuth, async (req, res) => {
  const plans = await treatmentPlansRepo.listByUser(req.user.id);
  res.json(plans);
});

// El profesional puede ver los planes de cualquier paciente (para dar seguimiento).
treatmentPlansRouter.get('/user/:userId', requireAuth, async (req, res) => {
  const plans = await treatmentPlansRepo.listByUser(req.params.userId);
  res.json(plans);
});

const progressSchema = z.object({
  weekNumber: z.number().int().positive(),
  completed: z.boolean(),
});

// El paciente SOLO puede marcar una semana como completada/pendiente; no
// puede cambiar el titulo, la descripcion ni el contenido clinico del plan
// (eso solo lo edita el profesional que lo creo, no hay ruta para que el
// paciente lo modifique).
treatmentPlansRouter.patch('/:id/progress', requirePatientAuth, async (req, res) => {
  const parsed = progressSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'weekNumber y completed son requeridos' });
  }

  const plan = await treatmentPlansRepo.findById(req.params.id);
  if (!plan) return res.status(404).json({ error: 'Plan no encontrado' });
  if (plan.userId !== req.user.id) return res.status(403).json({ error: 'Este plan no te pertenece' });

  const updatedWeeks = plan.weeks.map((w) =>
    w.week_number === parsed.data.weekNumber ? { ...w, completed: parsed.data.completed } : w
  );
  const updated = await treatmentPlansRepo.updateWeeks(plan.id, updatedWeeks);
  res.json(updated);
});
