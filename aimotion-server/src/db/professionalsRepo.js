import { query } from './pool.js';

function toDomain(row) {
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    passwordHash: row.password_hash,
    role: row.role,
    createdAt: row.created_at,
  };
}

export const professionalsRepo = {
  async findByEmail(email) {
    const { rows } = await query('SELECT * FROM professionals WHERE email = $1', [email.toLowerCase()]);
    return toDomain(rows[0]);
  },

  async findById(id) {
    const { rows } = await query('SELECT * FROM professionals WHERE id = $1', [id]);
    return toDomain(rows[0]);
  },

  async create({ id, name, email, passwordHash, role }) {
    const { rows } = await query(
      `INSERT INTO professionals (id, name, email, password_hash, role)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [id, name, email.toLowerCase(), passwordHash, role]
    );
    return toDomain(rows[0]);
  },

  async count() {
    const { rows } = await query('SELECT COUNT(*)::int AS count FROM professionals');
    return rows[0].count;
  },
};
