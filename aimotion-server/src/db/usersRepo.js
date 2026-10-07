import { query } from './pool.js';

function toDomain(row) {
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    passwordHash: row.password_hash,
    createdAt: row.created_at,
  };
}

export const usersRepo = {
  async findByEmail(email) {
    const { rows } = await query('SELECT * FROM users WHERE email = $1', [email.toLowerCase()]);
    return toDomain(rows[0]);
  },

  async findById(id) {
    const { rows } = await query('SELECT * FROM users WHERE id = $1', [id]);
    return toDomain(rows[0]);
  },

  async create({ id, name, email, passwordHash }) {
    const { rows } = await query(
      `INSERT INTO users (id, name, email, password_hash) VALUES ($1, $2, $3, $4) RETURNING *`,
      [id, name, email.toLowerCase(), passwordHash]
    );
    return toDomain(rows[0]);
  },
};
