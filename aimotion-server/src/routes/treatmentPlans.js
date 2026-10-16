import { Router } from 'express';
import { nanoid } from 'nanoid';
import { v, validate } from '../security/validate.js';
import { parsePagination, setPaginationHeaders } from '../security/pagination.js';
import { patientCtx, professionalCtx } from '../db/context.js';
import { wrap, idParam, paginationQuery } from './helpers.js';

const weekSchema = v.object({
  week_number: v.int({ min: 1, max: 12, label: 'El número de semana' }),
  title: v.string({ min: 1, max: 200, label: 'El título de la semana' }),
  description: v.string({ min: 1, max: 2000, label: 'La descripción de la semana' }),
  completed: v.boolean().withDefault(false),
});

const createSchema = v.object({
  userId: v.string({ min: 1, max: 64, pattern: /^[A-Za-z0-9_-]+$/, label: 'El usuario' }),
  condition: v.enum(['depresion', 'ansiedad', 'estres', 'esquizofrenia'], { label: 'El trastorno' }),
  title: v.string({ min: 1, max: 200, label: 'El título del plan' }),
  weeks: v.array(weekSchema, { min: 1, max: 12, label: 'Las semanas' }),
});

const progressSchema = v.object({ weekNumber: v.int({ min: 1, max: 12 }), completed: v.boolean() });

export function createTreatmentPlansRouter({ repos, audit }) {
  const router = Router();

  // SOLO un profesional crea planes; professionalId sale SIEMPRE del token (nunca del cuerpo).
  router.post('/', validate({ body: createSchema }), wrap(async (req, res) => {
    const b = req.valid.body;
    const numbers = b.weeks.map((w) => w.week_number);
    if (new Set(numbers).size !== numbers.length) return res.status(400).json({ error: 'Los números de semana no pueden repetirse' });
    const ctx = professionalCtx(req.professional);
    const patient = await repos.users.findById(ctx, b.userId);
    if (!patient) return res.status(404).json({ error: 'Usuario no encontrado' });
    const plan = await repos.plans.create(ctx, { id: nanoid(12), userId: b.userId, professionalId: req.professional.id, condition: b.condition, title: b.title, weeks: b.weeks });
    await audit(ctx, { professionalId: req.professional.id, action: 'create_treatment_plan', resourceType: 'treatment_plan', resourceId: plan.id });
    return res.status(201).json(plan);
  }));

  router.get('/mine', validate({ query: v.object(paginationQuery) }), wrap(async (req, res) => {
    const page = parsePagination(req.valid.query);
    if (!page.ok) return res.status(400).json({ error: page.error });
    const plans = await repos.plans.listByUser(patientCtx(req.user), req.user.id, page);
    setPaginationHeaders(res, { ...page, returned: plans.length });
    return res.json(plans);
  }));

  router.get('/user/:userId', validate({ params: idParam('userId'), query: v.object(paginationQuery) }), wrap(async (req, res) => {
    const page = parsePagination(req.valid.query);
    if (!page.ok) return res.status(400).json({ error: page.error });
    const plans = await repos.plans.listByUser(professionalCtx(req.professional), req.valid.params.userId, page);
    setPaginationHeaders(res, { ...page, returned: plans.length });
    return res.json(plans);
  }));

  // El paciente SOLO marca semanas como completadas; no puede editar el contenido clinico del plan.
  router.patch('/:id/progress', validate({ params: idParam('id'), body: progressSchema }), wrap(async (req, res) => {
    const ctx = patientCtx(req.user);
    const plan = await repos.plans.findById(ctx, req.valid.params.id);
    if (!plan || plan.userId !== req.user.id) return res.status(404).json({ error: 'Plan no encontrado' }); // 404 (no 403): no revela si existe
    const { weekNumber, completed } = req.valid.body;
    if (!plan.weeks.some((w) => w.week_number === weekNumber)) return res.status(400).json({ error: 'Esa semana no existe en el plan' });
    const weeks = plan.weeks.map((w) => (w.week_number === weekNumber ? { ...w, completed } : w));
    return res.json(await repos.plans.updateWeeks(ctx, plan.id, weeks));
  }));

  return router;
}
