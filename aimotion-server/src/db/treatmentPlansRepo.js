import { query } from './pool.js';

function toDomain(row) {
  if (!row) return null;
  return {
    id: row.id,
    userId: row.user_id,
    professionalId: row.professional_id,
    condition: row.condition,
    title: row.title,
    weeks: row.weeks,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export const treatmentPlansRepo = {
  // Solo un profesional puede crear un plan: professionalId es obligatorio
  // y viene de req.professional (del JWT verificado), nunca del cliente.
  async create({ id, userId, professionalId, condition, title, weeks }) {
    const { rows } = await query(
      `INSERT INTO treatment_plans (id, user_id, professional_id, condition, title, weeks)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [id, userId, professionalId, condition, title, JSON.stringify(weeks)]
    );
    return toDomain(rows[0]);
  },

  async listByUser(userId) {
    const { rows } = await query(
      'SELECT * FROM treatment_plans WHERE user_id = $1 ORDER BY created_at DESC',
      [userId]
    );
    return rows.map(toDomain);
  },

  async findById(id) {
    const { rows } = await query('SELECT * FROM treatment_plans WHERE id = $1', [id]);
    return toDomain(rows[0]);
  },

  // El paciente solo puede marcar semanas como completadas (actualiza
  // "weeks" completo, ya validado en la ruta); el contenido del plan en si
  // (titulos/descripciones) solo lo edita el profesional que lo creo.
  async updateWeeks(id, weeks) {
    const { rows } = await query(
      `UPDATE treatment_plans SET weeks = $2, updated_at = now() WHERE id = $1 RETURNING *`,
      [id, JSON.stringify(weeks)]
    );
    return toDomain(rows[0]);
  },
};
