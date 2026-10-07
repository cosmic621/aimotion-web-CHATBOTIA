import { Router } from 'express';
import { nanoid } from 'nanoid';
import { z } from 'zod';
import { chatRepo } from '../db/chatRepo.js';
import { optionalPatientAuth, requireAuth } from '../auth/requireAuth.js';

export const chatRouter = Router();

const messageSchema = z.object({
  sessionId: z.string().min(1),
  role: z.enum(['user', 'bot']),
  content: z.string().min(1).max(5000),
  topic: z.string().optional().nullable(),
});

// Registra un turno del chat. Si la persona inicio sesion (optionalPatientAuth
// adjunta req.user), el mensaje queda asociado a su cuenta ademas de a la
// sesion; si no, solo queda bajo la sesion anonima. Esto es lo que da la
// trazabilidad: tanto por sesion suelta como, si hay cuenta, a traves del
// tiempo y de varias visitas.
chatRouter.post('/messages', optionalPatientAuth, async (req, res) => {
  const parsed = messageSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'sessionId, role (user|bot) y content son requeridos' });
  }
  const { sessionId, role, content, topic } = parsed.data;

  const saved = await chatRepo.addMessage({
    id: nanoid(12),
    sessionId,
    userId: req.user?.id || null,
    role,
    content,
    topic,
  });
  res.status(201).json(saved);
});

// Historial de la sesion actual (funciona con o sin cuenta: si hay cuenta,
// devuelve todo el historial asociado a ella; si no, solo el de esta sesion).
chatRouter.get('/messages', optionalPatientAuth, async (req, res) => {
  const { sessionId } = req.query;
  if (req.user) {
    const history = await chatRepo.listByUser(req.user.id);
    return res.json(history);
  }
  if (!sessionId) return res.status(400).json({ error: 'sessionId es requerido si no hay sesión iniciada' });
  const history = await chatRepo.listBySession(sessionId);
  res.json(history);
});

// Panel profesional: lista de usuarios con actividad, y el historial
// completo de uno en particular, para trazabilidad.
chatRouter.get('/users', requireAuth, async (_req, res) => {
  const users = await chatRepo.listActiveUsers();
  res.json(users);
});

chatRouter.get('/users/:userId/messages', requireAuth, async (req, res) => {
  const history = await chatRepo.listByUser(req.params.userId);
  res.json(history);
});
