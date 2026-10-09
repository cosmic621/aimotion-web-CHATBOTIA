import { Router } from 'express';
import { nanoid } from 'nanoid';
import { z } from 'zod';
import { alertsRepo } from '../db/alertsRepo.js';
import { usersRepo } from '../db/usersRepo.js';
import { auditRepo } from '../db/auditRepo.js';
import { sendAlertEmail } from '../services/emailService.js';
import { sendAlertSms } from '../services/smsService.js';
import { sendContactSms } from '../services/contactSmsService.js';
import { requireAuth, optionalPatientAuth } from '../auth/requireAuth.js';
import { emitToProfessionals } from '../realtime.js';

export const alertsRouter = Router();

// Para no saturar al contacto de emergencia: maximo un SMS cada 6 horas por cuenta.
const CONTACT_COOLDOWN_MS = 6 * 60 * 60 * 1000;

const createAlertSchema = z.object({
  sessionId: z.string().min(1),
  userName: z.string().optional().nullable(),
  category: z.string().min(1),
  severity: z.enum(['moderado', 'alto', 'critico']),
  excerpt: z.string().max(500).optional().default(''),
  source: z.string().optional().default('chat'),
});

/**
 * Decide si se avisa al contacto de emergencia y lo hace.
 * Solo para riesgo CRITICO, solo si hay cuenta con contacto y consentimiento.
 * El usuario sale del token verificado (req.user), nunca del cuerpo del
 * request: asi nadie puede usar este endpoint para enviar SMS a un numero
 * arbitrario.
 */
async function notifyEmergencyContact(req, alert) {
  if (alert.severity !== 'critico') return null;
  if (!req.user) return { sent: false, reason: 'Sesión anónima: sin contacto de emergencia' };

  const user = await usersRepo.findById(req.user.id);
  if (!user?.emergencyContact) return { sent: false, reason: 'Sin contacto de emergencia registrado' };

  const last = await alertsRepo.lastContactNotification(user.id);
  if (last && Date.now() - new Date(last).getTime() < CONTACT_COOLDOWN_MS) {
    return { sent: false, alreadyNotified: true, reason: 'Ya se avisó al contacto hace poco' };
  }
  return sendContactSms(user);
}

// Lo crea el asistente (o el tamizaje) cuando el motor de riesgo detecta un
// factor critico o alto. Funciona con o sin cuenta (optionalPatientAuth).
alertsRouter.post('/', optionalPatientAuth, async (req, res) => {
  const parsed = createAlertSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'sessionId, category y severity (moderado|alto|critico) son requeridos' });
  }
  const { sessionId, userName, category, severity, excerpt, source } = parsed.data;

  let alert = await alertsRepo.create({
    id: nanoid(10),
    sessionId,
    userId: req.user?.id || null,
    userName: userName || req.user?.name || null,
    category,
    severity,
    excerpt,
    source,
  });

  if (severity === 'alto' || severity === 'critico') {
    const [emailResult, smsResult, contactResult] = await Promise.all([
      sendAlertEmail(alert),
      sendAlertSms(alert),
      notifyEmergencyContact(req, alert),
    ]);
    alert = await alertsRepo.setNotificationResults(alert.id, { emailResult, smsResult });
    if (contactResult) {
      alert = await alertsRepo.setContactResult(alert.id, contactResult);
      // setContactResult no conoce "alreadyNotified"; se lo pasamos a la respuesta.
      if (contactResult.alreadyNotified) alert.notifications.contactSms.alreadyNotified = true;
    }
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
