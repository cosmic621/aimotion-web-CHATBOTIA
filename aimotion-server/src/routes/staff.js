import { Router } from 'express';
import { nanoid } from 'nanoid';
import { v, validate } from '../security/validate.js';
import { parsePagination, setPaginationHeaders } from '../security/pagination.js';
import { staffCtx } from '../db/context.js';
import { wrap, idParam, paginationQuery } from './helpers.js';

const listQuery = v.object({ q: v.string({ max: 100, label: 'La búsqueda' }).optional(), ...paginationQuery });
const attentionSchema = v.object({ note: v.string({ max: 1000, label: 'La nota' }).optional().nullable() });

/**
 * Funcionario: una cuenta de usuario con perfil FUNCIONARIO. Conserva todo lo del usuario normal
 * (chat, tamizajes, su propio plan) y ademas, con estas rutas:
 *   - ve el historial de los pacientes (chat, tamizajes, planes),
 *   - registra que atendio a un paciente y consulta los pacientes que ha atendido.
 * El funcionario sale SIEMPRE del token (req.user); nunca del cuerpo de la peticion. Cada consulta
 * al historial queda en la bitacora de auditoria.
 */
export function createStaffRouter({ repos, audit }) {
  const router = Router();

  router.get('/patients', validate({ query: listQuery }), wrap(async (req, res) => {
    const page = parsePagination(req.valid.query);
    if (!page.ok) return res.status(400).json({ error: page.error });
    const patients = await repos.staff.listPatients(staffCtx(req.user), { q: req.valid.query.q, ...page });
    setPaginationHeaders(res, { ...page, returned: patients.length });
    return res.json(patients);
  }));

  router.get('/patients/:id/history', validate({ params: idParam('id'), query: v.object(paginationQuery) }), wrap(async (req, res) => {
    const page = parsePagination(req.valid.query, { defaultLimit: 200, maxLimit: 500 });
    if (!page.ok) return res.status(400).json({ error: page.error });
    const ctx = staffCtx(req.user);
    const patient = await repos.staff.findPatient(ctx, req.valid.params.id);
    if (!patient) return res.status(404).json({ error: 'Paciente no encontrado' }); // tambien si no es un usuario "paciente"
    const [messages, screenings, plans, attentions] = await Promise.all([
      repos.chat.listByUser(ctx, patient.id, page),
      repos.staff.screeningsByUser(ctx, patient.id, { limit: 50, offset: 0 }),
      repos.plans.listByUser(ctx, patient.id, { limit: 20, offset: 0 }),
      repos.staff.attentionsFor(ctx, req.user.id, patient.id, { limit: 50, offset: 0 }),
    ]);
    await audit(ctx, { actorUserId: req.user.id, action: 'staff_view_patient_history', resourceType: 'user', resourceId: patient.id });
    setPaginationHeaders(res, { ...page, returned: messages.length });
    return res.json({
      patient,
      messages,
      screenings: screenings.map((s) => ({ id: s.id, type: s.type, totalScore: s.totalScore, severity: s.severity, timestamp: s.timestamp })),
      plans,
      attentions,
    });
  }));

  router.post('/patients/:id/attentions', validate({ params: idParam('id'), body: attentionSchema }), wrap(async (req, res) => {
    const ctx = staffCtx(req.user);
    const patient = await repos.staff.findPatient(ctx, req.valid.params.id);
    if (!patient) return res.status(404).json({ error: 'Paciente no encontrado' });
    const attention = await repos.staff.recordAttention(ctx, {
      id: nanoid(12), staffId: req.user.id, patientId: patient.id, note: req.valid.body.note || null,
    });
    await audit(ctx, { actorUserId: req.user.id, action: 'staff_record_attention', resourceType: 'user', resourceId: patient.id });
    return res.status(201).json(attention);
  }));

  router.get('/attended', validate({ query: v.object(paginationQuery) }), wrap(async (req, res) => {
    const page = parsePagination(req.valid.query);
    if (!page.ok) return res.status(400).json({ error: page.error });
    const attended = await repos.staff.listAttended(staffCtx(req.user), req.user.id, page);
    setPaginationHeaders(res, { ...page, returned: attended.length });
    return res.json(attended);
  }));

  return router;
}
