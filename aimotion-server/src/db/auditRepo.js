import { nanoid } from 'nanoid';
import { query } from './pool.js';

export const auditRepo = {
  async log({ professionalId, action, resourceType, resourceId }) {
    await query(
      `INSERT INTO audit_log (id, professional_id, action, resource_type, resource_id)
       VALUES ($1, $2, $3, $4, $5)`,
      [nanoid(12), professionalId || null, action, resourceType, resourceId || null]
    );
  },
};
