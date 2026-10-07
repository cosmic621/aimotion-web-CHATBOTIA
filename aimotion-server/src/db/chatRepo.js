import { query } from './pool.js';

function toDomain(row) {
  if (!row) return null;
  return {
    id: row.id,
    sessionId: row.session_id,
    userId: row.user_id,
    role: row.role,
    content: row.content,
    topic: row.topic,
    createdAt: row.created_at,
  };
}

export const chatRepo = {
  async addMessage({ id, sessionId, userId, role, content, topic }) {
    const { rows } = await query(
      `INSERT INTO chat_messages (id, session_id, user_id, role, content, topic)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [id, sessionId, userId || null, role, content, topic || null]
    );
    return toDomain(rows[0]);
  },

  /** Historial de una sesion anonima o de una cuenta, en orden cronologico. */
  async listBySession(sessionId) {
    const { rows } = await query(
      'SELECT * FROM chat_messages WHERE session_id = $1 ORDER BY created_at ASC',
      [sessionId]
    );
    return rows.map(toDomain);
  },

  /** Todo el historial de una cuenta (puede abarcar varias sesiones/visitas). Para trazabilidad profesional. */
  async listByUser(userId) {
    const { rows } = await query(
      'SELECT * FROM chat_messages WHERE user_id = $1 ORDER BY created_at ASC',
      [userId]
    );
    return rows.map(toDomain);
  },

  /** Lista de usuarios con actividad reciente de chat, para el panel profesional. */
  async listActiveUsers() {
    const { rows } = await query(`
      SELECT u.id, u.name, u.email, COUNT(cm.id)::int AS message_count, MAX(cm.created_at) AS last_activity
      FROM users u
      JOIN chat_messages cm ON cm.user_id = u.id
      GROUP BY u.id, u.name, u.email
      ORDER BY last_activity DESC
    `);
    return rows.map((r) => ({
      id: r.id,
      name: r.name,
      email: r.email,
      messageCount: r.message_count,
      lastActivity: r.last_activity,
    }));
  },
};
