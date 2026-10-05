import { query } from './pool.js';

function toDomain(row) {
  if (!row) return null;
  return {
    id: row.id,
    sessionId: row.session_id,
    userName: row.user_name,
    type: row.type,
    answers: row.answers,
    totalScore: row.total_score,
    severity: row.severity,
    timestamp: row.created_at,
  };
}

export const screeningsRepo = {
  async create({ id, sessionId, userName, type, answers, totalScore, severity }) {
    const { rows } = await query(
      `INSERT INTO screenings (id, session_id, user_name, type, answers, total_score, severity)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [id, sessionId, userName || null, type, JSON.stringify(answers), totalScore, severity]
    );
    return toDomain(rows[0]);
  },

  async list() {
    const { rows } = await query('SELECT * FROM screenings ORDER BY created_at DESC');
    return rows.map(toDomain);
  },
};
