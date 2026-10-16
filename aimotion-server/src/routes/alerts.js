import { Router } from 'express';
import { nanoid } from 'nanoid';
import { v, validate } from '../security/validate.js';
import { parsePagination, setPaginationHeaders } from '../security/pagination.js';
import { anonCtx, patientCtx, professionalCtx, systemCtx } from '../db/context.js';
import { wrap, idParam, sessionIdSchema, paginationQuery } from './helpers.js';

const CATEGORIES = ['ideacion_suicida', 'planeacion_suicida', 'autolesion', 'violencia_hacia_terceros', 'episodio_psicotico', 'crisis_panico_severa', 'desesperanza'];
const CONTACT_COOLDOWN_MS = 6 * 60 * 60 * 1000; // un SMS al contacto cada 6 h por cuenta

const createSchema = v.object({
  sessionId: sessionIdSchema,
  userName: v.string({ max: 100 }).optional().nullable(),
  category: v.enum(CATEGORIES, { label: 'La categoría' }),
  severity: v.enum(['moderado', 'alto', 'critico'], { label: 'La severidad' }),
  // Se acepta un mensaje largo (nunca se rechaza una alerta por su tamaño) y se recorta a 500 al guardar.
  excerpt: v.string({ max: 5000 }).withDefault(''),
  source: v.enum(['chat', 'phq9', 'gad7']).withDefault('chat'),
});

const reviewSchema = v.object({ reviewerNote: v.string({ max: 1000 }).optional().nullable() });

/** Lo que ve quien envia la alerta: solo si se aviso o no (sin motivos tecnicos internos). */
function publicNotifications(n) {
  return {
    email: { sent: Boolean(n.email?.sent) },
    sms: { sent: Boolean(n.sms?.sent) },
    contactSms: { sent: Boolean(n.contactSms?.sent), alreadyNotified: Boolean(n.contactSms?.alreadyNotified) },
  };
}

export function createAlertsRouter({ repos, services, realtime, alertLimiter, audit }) {
  const router = Router();

  /**
   * Avisa al contacto de emergencia SOLO ante riesgo critico, con cuenta, contacto
   * y consentimiento. El usuario sale del token (req.user), nunca del cuerpo.
   */
  async function notifyEmergencyContact(req, alert) {
    if (alert.severity !== 'critico') return null;
    if (!req.user) return { sent: false, reason: 'Sesión anónima: sin contacto de emergencia' };
    const sys = systemCtx();
    const user = await repos.users.findById(sys, req.user.id);
    if (!user?.emergencyContact) return { sent: false, reason: 'Sin contacto de emergencia registrado' };
    const last = await repos.alerts.lastContactNotification(sys, user.id);
    if (last && Date.now() - new Date(last).getTime() < CONTACT_COOLDOWN_MS) {
      return { sent: false, alreadyNotified: true, reason: 'Ya se avisó al contacto hace poco' };
    }
    return services.contactSms.send(user);
  }

  router.post('/', alertLimiter, validate({ body: createSchema }), wrap(async (req, res) => {
    const b = req.valid.body;
    const user = req.user || null;
    const ctx = user ? patientCtx(user) : anonCtx(b.sessionId);

    let alert = await repos.alerts.create(ctx, {
      id: nanoid(10), sessionId: b.sessionId, userId: user?.id || null, userName: user?.name || b.userName || null,
      category: b.category, severity: b.severity, excerpt: b.excerpt.slice(0, 500), source: b.source,
    });

    if (b.severity === 'alto' || b.severity === 'critico') {
      const sys = systemCtx();
      const [emailResult, smsResult, contactResult] = await Promise.all([
        services.email.sendAlert(alert), services.proSms.sendAlert(alert), notifyEmergencyContact(req, alert),
      ]);
      alert = (await repos.alerts.setNotificationResults(sys, alert.id, { emailResult, smsResult })) || alert;
      if (contactResult) {
        alert = (await repos.alerts.setContactResult(sys, alert.id, contactResult)) || alert;
        alert.notifications.contactSms.alreadyNotified = Boolean(contactResult.alreadyNotified);
      }
    }

    try {
      realtime.emit('alert:new', alert);
    } catch {
      /* el tiempo real nunca debe impedir responder */
    }
    return res.status(201).json({ id: alert.id, notifications: publicNotifications(alert.notifications) });
  }));

  router.get('/', validate({ query: v.object(paginationQuery) }), wrap(async (req, res) => {
    const page = parsePagination(req.valid.query);
    if (!page.ok) return res.status(400).json({ error: page.error });
    const alerts = await repos.alerts.list(professionalCtx(req.professional), page);
    await audit(professionalCtx(req.professional), { professionalId: req.professional.id, action: 'list_alerts', resourceType: 'alert' });
    setPaginationHeaders(res, { ...page, returned: alerts.length });
    return res.json(alerts);
  }));

  router.patch('/:id/review', validate({ params: idParam('id'), body: reviewSchema }), wrap(async (req, res) => {
    const ctx = professionalCtx(req.professional);
    const existing = await repos.alerts.findById(ctx, req.valid.params.id);
    if (!existing) return res.status(404).json({ error: 'Alerta no encontrada' });
    const updated = await repos.alerts.markReviewed(ctx, existing.id, { reviewedById: req.professional.id, reviewerNote: req.valid.body.reviewerNote });
    await audit(ctx, { professionalId: req.professional.id, action: 'review_alert', resourceType: 'alert', resourceId: existing.id });
    try {
      realtime.emit('alert:reviewed', updated);
    } catch {
      /* ver arriba */
    }
    return res.json(updated);
  }));

  return router;
}
