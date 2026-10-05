import { query } from './pool.js';

function toDomain(row) {
  if (!row) return null;
  return {
    id: row.id,
    sessionId: row.session_id,
    userName: row.user_name,
    category: row.category,
    severity: row.severity,
    excerpt: row.excerpt,
    source: row.source,
    status: row.status,
    timestamp: row.created_at,
    reviewedAt: row.reviewed_at,
    reviewerNote: row.reviewer_note,
    reviewedById: row.reviewed_by_id,
    notifications: {
      email: { sent: row.email_sent, reason: row.email_reason || undefined },
      sms: { sent: row.sms_sent, reason: row.sms_reason || undefined },
    },
  };
}

export const alertsRepo = {
  async create({ id, sessionId, userName, category, severity, excerpt, source }) {
    const { rows } = await query(
      `INSERT INTO alerts (id, session_id, user_name, category, severity, excerpt, source)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [id, sessionId, userName || null, category, severity, excerpt, source || 'chat']
    );
    return toDomain(rows[0]);
  },

  async setNotificationResults(id, { emailResult, smsResult }) {
    const { rows } = await query(
      `UPDATE alerts SET email_sent = $2, email_reason = $3, sms_sent = $4, sms_reason = $5
       WHERE id = $1 RETURNING *`,
      [id, !!emailResult?.sent, emailResult?.reason || null, !!smsResult?.sent, smsResult?.reason || null]
    );
    return toDomain(rows[0]);
  },

  async findById(id) {
    const { rows } = await query('SELECT * FROM alerts WHERE id = $1', [id]);
    return toDomain(rows[0]);
  },

  async list() {
    const { rows } = await query('SELECT * FROM alerts ORDER BY created_at DESC');
    return rows.map(toDomain);
  },

  async markReviewed(id, { reviewedById, reviewerNote }) {
    const { rows } = await query(
      `UPDATE alerts SET status = 'revisado', reviewed_at = now(), reviewed_by_id = $2, reviewer_note = $3
       WHERE id = $1 RETURNING *`,
      [id, reviewedById, reviewerNote || null]
    );
    return toDomain(rows[0]);
  },
};
