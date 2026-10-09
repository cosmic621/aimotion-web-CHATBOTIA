import { query } from './pool.js';

function toDomain(row) {
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    passwordHash: row.password_hash,
    createdAt: row.created_at,
    emergencyContact: row.emergency_contact_phone
      ? {
          name: row.emergency_contact_name,
          phone: row.emergency_contact_phone,
          relation: row.emergency_contact_relation,
          consentAt: row.contact_consent_at,
        }
      : null,
  };
}

/** Version publica del usuario (sin hash de contrasena). */
export function publicUser(user) {
  return { id: user.id, name: user.name, email: user.email, emergencyContact: user.emergencyContact };
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

  async create({ id, name, email, passwordHash, contact }) {
    const { rows } = await query(
      `INSERT INTO users (id, name, email, password_hash,
         emergency_contact_name, emergency_contact_phone, emergency_contact_relation, contact_consent_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, now()) RETURNING *`,
      [id, name, email.toLowerCase(), passwordHash, contact.name, contact.phone, contact.relation]
    );
    return toDomain(rows[0]);
  },

  async updateContact(id, contact) {
    const { rows } = await query(
      `UPDATE users SET emergency_contact_name = $2, emergency_contact_phone = $3,
         emergency_contact_relation = $4, contact_consent_at = now()
       WHERE id = $1 RETURNING *`,
      [id, contact.name, contact.phone, contact.relation]
    );
    return toDomain(rows[0]);
  },
};
