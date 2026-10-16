import { Router } from 'express';
import { nanoid } from 'nanoid';
import { v, validate } from '../security/validate.js';
import { parsePagination, setPaginationHeaders } from '../security/pagination.js';
import { anonCtx, patientCtx, professionalCtx } from '../db/context.js';
import { wrap, idParam, sessionIdSchema, paginationQuery } from './helpers.js';

const messageSchema = v.object({
  sessionId: sessionIdSchema,
  role: v.enum(['user', 'bot'], { label: 'El rol' }),
  content: v.string({ min: 1, max: 5000, label: 'El mensaje' }),
  topic: v.string({ max: 40, pattern: /^[a-z_]+$/, label: 'El tema' }).optional().nullable(),
});

export function createChatRouter({ repos, chatLimiter, audit }) {
  const router = Router();

  // Funciona con o sin cuenta. Con cuenta, el mensaje queda ligado al usuario del TOKEN.
  router.post('/messages', chatLimiter, validate({ body: messageSchema }), wrap(async (req, res) => {
    const b = req.valid.body;
    const user = req.user || null;
    const saved = await repos.chat.addMessage(user ? patientCtx(user) : anonCtx(b.sessionId), {
      id: nanoid(12), sessionId: b.sessionId, userId: user?.id || null, role: b.role, content: b.content, topic: b.topic,
    });
    return res.status(201).json({ id: saved.id });
  }));

  const historyQuery = v.object({ sessionId: sessionIdSchema.optional(), ...paginationQuery });
  router.get('/messages', validate({ query: historyQuery }), wrap(async (req, res) => {
    const page = parsePagination(req.valid.query, { defaultLimit: 100, maxLimit: 200 });
    if (!page.ok) return res.status(400).json({ error: page.error });
    let rows;
    if (req.user) {
      rows = await repos.chat.listByUser(patientCtx(req.user), req.user.id, page);
    } else {
      const { sessionId } = req.valid.query;
      if (!sessionId) return res.status(400).json({ error: 'sessionId es requerido si no hay sesión iniciada' });
      rows = await repos.chat.listBySession(anonCtx(sessionId), sessionId, page);
    }
    setPaginationHeaders(res, { ...page, returned: rows.length });
    return res.json(rows);
  }));

  router.get('/users', validate({ query: v.object(paginationQuery) }), wrap(async (req, res) => {
    const page = parsePagination(req.valid.query);
    if (!page.ok) return res.status(400).json({ error: page.error });
    const users = await repos.chat.listActiveUsers(professionalCtx(req.professional), page);
    setPaginationHeaders(res, { ...page, returned: users.length });
    return res.json(users);
  }));

  // Leer la conversacion de una persona queda registrado en la bitacora de auditoria.
  router.get('/users/:userId/messages', validate({ params: idParam('userId'), query: v.object(paginationQuery) }), wrap(async (req, res) => {
    const page = parsePagination(req.valid.query, { defaultLimit: 200, maxLimit: 500 });
    if (!page.ok) return res.status(400).json({ error: page.error });
    const ctx = professionalCtx(req.professional);
    const rows = await repos.chat.listByUser(ctx, req.valid.params.userId, page);
    await audit(ctx, { professionalId: req.professional.id, action: 'view_chat_history', resourceType: 'user', resourceId: req.valid.params.userId });
    setPaginationHeaders(res, { ...page, returned: rows.length });
    return res.json(rows);
  }));

  return router;
}
