import { Router } from 'express';
import { nanoid } from 'nanoid';
import { v, validate } from '../security/validate.js';
import { parsePagination, setPaginationHeaders } from '../security/pagination.js';
import { scoreScale, validateAnswers } from '../domain/scales.js';
import { anonCtx, patientCtx, professionalCtx } from '../db/context.js';
import { wrap, sessionIdSchema, paginationQuery } from './helpers.js';

const createSchema = v.object({
  sessionId: sessionIdSchema,
  userName: v.string({ max: 100 }).optional().nullable(),
  type: v.enum(['PHQ-9', 'GAD-7'], { label: 'La escala' }),
  answers: v.array(v.int({ min: 0, max: 3 }), { min: 7, max: 9, label: 'Las respuestas' }),
  // Se aceptan por compatibilidad con el cliente, pero se IGNORAN: el servidor recalcula.
  totalScore: v.number().optional(),
  severity: v.string({ max: 40 }).optional(),
});

export function createScreeningsRouter({ repos, screeningLimiter, audit }) {
  const router = Router();

  router.post('/', screeningLimiter, validate({ body: createSchema }), wrap(async (req, res) => {
    const b = req.valid.body;
    const problem = validateAnswers(b.type, b.answers);
    if (problem) return res.status(400).json({ error: problem });
    const { total, severity } = scoreScale(b.type, b.answers); // puntaje calculado por el servidor
    const user = req.user || null;
    const record = await repos.screenings.create(user ? patientCtx(user) : anonCtx(b.sessionId), {
      id: nanoid(10), sessionId: b.sessionId, userId: user?.id || null, userName: user?.name || b.userName || null,
      type: b.type, answers: b.answers, totalScore: total, severity,
    });
    return res.status(201).json({ id: record.id, totalScore: total, severity });
  }));

  router.get('/', validate({ query: v.object(paginationQuery) }), wrap(async (req, res) => {
    const page = parsePagination(req.valid.query);
    if (!page.ok) return res.status(400).json({ error: page.error });
    const ctx = professionalCtx(req.professional);
    const rows = await repos.screenings.list(ctx, page);
    await audit(ctx, { professionalId: req.professional.id, action: 'list_screenings', resourceType: 'screening' });
    setPaginationHeaders(res, { ...page, returned: rows.length });
    return res.json(rows);
  }));

  return router;
}
