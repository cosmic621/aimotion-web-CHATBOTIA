import { Router } from 'express';
import { nanoid } from 'nanoid';
import { z } from 'zod';
import { alertsRepo } from '../db/alertsRepo.js';
import { auditRepo } from '../db/auditRepo.js';
import { sendAlertEmail } from '../services/emailService.js';
import { sendAlertSms } from '../services/smsService.js';
import { requireAuth } from '../auth/requireAuth.js';
import { emitToProfessionals } from '../realtime.js';

export const alertsRouter = Router();

const createAlertSchema = z.object({
  sessionId: z.string().min(1),
  userName: z.string().optional().nullable(),
  category: z.string().min(1),
  severity: z.enum(['moderado', 'alto', 'critico']),
  excerpt: z.string().max(500).optional().default(''),
  source: z.string().optional().default('chat'),
});

// Creado por el asistente conversacional cuando el motor de riesgo del
// cliente detecta un factor critico o alto. No requiere autenticacion
// porque lo dispara la propia sesion de chat de la persona usuaria.
alertsRouter.post('/', async (req, res) => {
  const parsed = createAlertSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'sessionId, category y severity (moderado|alto|critico) son requeridos' });
  }
  const { sessionId, userName, category, severity, excerpt, source } = parsed.data;

  const alert = await alertsRepo.create({
    id: nanoid(10),
    sessionId,
    userName,
    category,
    severity,
    excerpt,
    source,
  });

  // El escalamiento solo dispara notificaciones reales para riesgo alto/critico.
  if (severity === 'alto' || severity === 'critico') {
    const [emailResult, smsResult] = await Promise.all([sendAlertEmail(alert), sendAlertSms(alert)]);
    const updated = await alertsRepo.setNotificationResults(alert.id, { emailResult, smsResult });
    emitToProfessionals('alert:new', updated);
    return res.status(201).json(updated);
  }

  emitToProfessionals('alert:new', alert);
  res.status(201).json(alert);
});

// Panel profesional: requiere sesion valida (JWT).
alertsRouter.get('/', requireAuth, async (req, res) => {
  const alerts = await alertsRepo.list();
  await auditRepo.log({ professionalId: req.professional.id, action: 'list_alerts', resourceType: 'alert' });
  res.json(alerts);
});

const reviewSchema = z.object({ reviewerNote: z.string().max(1000).optional().nullable() });

alertsRouter.patch('/:id/review', requireAuth, async (req, res) => {
  const parsed = reviewSchema.safeParse(req.body || {});
  const existing = await alertsRepo.findById(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Alerta no encontrada' });

  const updated = await alertsRepo.markReviewed(req.params.id, {
    reviewedById: req.professional.id,
    reviewerNote: parsed.success ? parsed.data.reviewerNote : null,
  });
  await auditRepo.log({ professionalId: req.professional.id, action: 'review_alert', resourceType: 'alert', resourceId: req.params.id });
  emitToProfessionals('alert:reviewed', updated);
  res.json(updated);
});
