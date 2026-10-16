// Repositorios de datos. Reglas (items 4, 5, 7, 14, 17):
//  - TODAS las consultas son parametrizadas ($1, $2...): sin concatenar entradas.
//  - Los datos sensibles se cifran al guardar y se descifran al leer (AES-256-GCM),
//    ligando cada dato a su columna y a su fila (AAD) para que no se puedan
//    intercambiar entre filas.
//  - Cada metodo recibe un ctx (rol de aplicacion) que usan las politicas RLS.
//  - Toda lista tiene LIMIT/OFFSET.
//  - Reciben `db` y `cipher` por inyeccion, por lo que se prueban sin base de datos.

const aad = (column, id) => `${column}:${id}`;
const DEFAULT_PAGE = { limit: 50, offset: 0 };
const page = (p) => ({ ...DEFAULT_PAGE, ...(p || {}) });

export function publicUser(user) {
  return { id: user.id, name: user.name, email: user.email, emergencyContact: user.emergencyContact };
}

export function createRepos({ db, cipher }) {
  const q = (ctx, sql, params) => db.query(ctx, sql, params);

  // ------------------------------------------------------------ profesionales
  const professionalFromRow = (r) =>
    r && { id: r.id, name: r.name, email: r.email, passwordHash: r.password_hash, role: r.role, createdAt: r.created_at };

  const professionals = {
    async findByEmail(ctx, email) {
      const { rows } = await q(ctx, 'SELECT * FROM professionals WHERE email = $1', [String(email).toLowerCase()]);
      return professionalFromRow(rows[0]) || null;
    },
    async findById(ctx, id) {
      const { rows } = await q(ctx, 'SELECT * FROM professionals WHERE id = $1', [id]);
      return professionalFromRow(rows[0]) || null;
    },
    async create(ctx, { id, name, email, passwordHash, role }) {
      const { rows } = await q(
        ctx,
        'INSERT INTO professionals (id, name, email, password_hash, role) VALUES ($1, $2, $3, $4, $5) RETURNING *',
        [id, name, String(email).toLowerCase(), passwordHash, role]
      );
      return professionalFromRow(rows[0]);
    },
  };

  // ------------------------------------------------------------ usuarios (pacientes)
  function userFromRow(r) {
    if (!r) return null;
    const hasContact = Boolean(r.emergency_contact_phone);
    return {
      id: r.id,
      name: r.name,
      email: r.email,
      passwordHash: r.password_hash,
      createdAt: r.created_at,
      emergencyContact: hasContact
        ? {
            name: cipher.decrypt(r.emergency_contact_name, aad('users.emergency_contact_name', r.id)),
            phone: cipher.decrypt(r.emergency_contact_phone, aad('users.emergency_contact_phone', r.id)),
            relation: cipher.decrypt(r.emergency_contact_relation, aad('users.emergency_contact_relation', r.id)),
            consentAt: r.contact_consent_at,
          }
        : null,
    };
  }
  const encContact = (id, c) => [
    cipher.encrypt(c.name, aad('users.emergency_contact_name', id)),
    cipher.encrypt(c.phone, aad('users.emergency_contact_phone', id)),
    cipher.encrypt(c.relation, aad('users.emergency_contact_relation', id)),
  ];

  const users = {
    async findByEmail(ctx, email) {
      const { rows } = await q(ctx, 'SELECT * FROM users WHERE email = $1', [String(email).toLowerCase()]);
      return userFromRow(rows[0]);
    },
    async findById(ctx, id) {
      const { rows } = await q(ctx, 'SELECT * FROM users WHERE id = $1', [id]);
      return userFromRow(rows[0]);
    },
    async create(ctx, { id, name, email, passwordHash, contact }) {
      const [n, p, r] = encContact(id, contact);
      const { rows } = await q(
        ctx,
        `INSERT INTO users (id, name, email, password_hash, emergency_contact_name, emergency_contact_phone,
           emergency_contact_relation, contact_consent_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, now()) RETURNING *`,
        [id, name, String(email).toLowerCase(), passwordHash, n, p, r]
      );
      return userFromRow(rows[0]);
    },
    async updateContact(ctx, id, contact) {
      const [n, p, r] = encContact(id, contact);
      const { rows } = await q(
        ctx,
        `UPDATE users SET emergency_contact_name = $2, emergency_contact_phone = $3,
           emergency_contact_relation = $4, contact_consent_at = now()
         WHERE id = $1 RETURNING *`,
        [id, n, p, r]
      );
      return userFromRow(rows[0]);
    },
  };

  // ------------------------------------------------------------ alertas
  function alertFromRow(r) {
    if (!r) return null;
    return {
      id: r.id,
      sessionId: r.session_id,
      userId: r.user_id,
      userName: r.user_name,
      category: r.category,
      severity: r.severity,
      excerpt: cipher.decrypt(r.excerpt, aad('alerts.excerpt', r.id)),
      source: r.source,
      status: r.status,
      timestamp: r.created_at,
      reviewedAt: r.reviewed_at,
      reviewerNote: cipher.decrypt(r.reviewer_note, aad('alerts.reviewer_note', r.id)),
      reviewedById: r.reviewed_by_id,
      notifications: {
        email: { sent: r.email_sent, reason: r.email_reason || undefined },
        sms: { sent: r.sms_sent, reason: r.sms_reason || undefined },
        contactSms: { sent: r.contact_sms_sent, reason: r.contact_sms_reason || undefined },
      },
    };
  }

  const alerts = {
    /** No usa RETURNING: un visitante anonimo puede insertar pero no leer alertas (RLS). */
    async create(ctx, a) {
      await q(
        ctx,
        `INSERT INTO alerts (id, session_id, user_id, user_name, category, severity, excerpt, source)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [a.id, a.sessionId, a.userId || null, a.userName || null, a.category, a.severity, cipher.encrypt(a.excerpt ?? '', aad('alerts.excerpt', a.id)), a.source || 'chat']
      );
      return {
        id: a.id, sessionId: a.sessionId, userId: a.userId || null, userName: a.userName || null, category: a.category,
        severity: a.severity, excerpt: a.excerpt ?? '', source: a.source || 'chat', status: 'pendiente', timestamp: new Date().toISOString(),
        reviewedAt: null, reviewerNote: null, reviewedById: null,
        notifications: { email: { sent: false }, sms: { sent: false }, contactSms: { sent: false } },
      };
    },
    async setNotificationResults(ctx, id, { emailResult, smsResult }) {
      const { rows } = await q(
        ctx,
        `UPDATE alerts SET email_sent = $2, email_reason = $3, sms_sent = $4, sms_reason = $5 WHERE id = $1 RETURNING *`,
        [id, !!emailResult?.sent, emailResult?.reason || null, !!smsResult?.sent, smsResult?.reason || null]
      );
      return alertFromRow(rows[0]);
    },
    async setContactResult(ctx, id, result) {
      const { rows } = await q(
        ctx,
        `UPDATE alerts SET contact_sms_sent = $2, contact_sms_reason = $3,
           contact_notified_at = CASE WHEN $2 THEN now() ELSE contact_notified_at END
         WHERE id = $1 RETURNING *`,
        [id, !!result?.sent, result?.reason || null]
      );
      return alertFromRow(rows[0]);
    },
    async lastContactNotification(ctx, userId) {
      const { rows } = await q(ctx, 'SELECT MAX(contact_notified_at) AS last FROM alerts WHERE user_id = $1 AND contact_sms_sent = true', [userId]);
      return rows[0]?.last || null;
    },
    async findById(ctx, id) {
      const { rows } = await q(ctx, 'SELECT * FROM alerts WHERE id = $1', [id]);
      return alertFromRow(rows[0]);
    },
    async list(ctx, p) {
      const { limit, offset } = page(p);
      const { rows } = await q(ctx, 'SELECT * FROM alerts ORDER BY created_at DESC LIMIT $1 OFFSET $2', [limit, offset]);
      return rows.map(alertFromRow);
    },
    async markReviewed(ctx, id, { reviewedById, reviewerNote }) {
      const { rows } = await q(
        ctx,
        `UPDATE alerts SET status = 'revisado', reviewed_at = now(), reviewed_by_id = $2, reviewer_note = $3 WHERE id = $1 RETURNING *`,
        [id, reviewedById, reviewerNote ? cipher.encrypt(reviewerNote, aad('alerts.reviewer_note', id)) : null]
      );
      return alertFromRow(rows[0]);
    },
  };

  // ------------------------------------------------------------ tamizajes
  const screeningFromRow = (r) =>
    r && {
      id: r.id, sessionId: r.session_id, userId: r.user_id, userName: r.user_name, type: r.type,
      answers: cipher.decryptJson(r.answers, aad('screenings.answers', r.id)),
      totalScore: r.total_score, severity: r.severity, timestamp: r.created_at,
    };

  const screenings = {
    async create(ctx, s) {
      await q(
        ctx,
        `INSERT INTO screenings (id, session_id, user_id, user_name, type, answers, total_score, severity)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [s.id, s.sessionId, s.userId || null, s.userName || null, s.type, JSON.stringify(cipher.encryptJson(s.answers, aad('screenings.answers', s.id))), s.totalScore, s.severity]
      );
      return { ...s, userId: s.userId || null, timestamp: new Date().toISOString() };
    },
    async list(ctx, p) {
      const { limit, offset } = page(p);
      const { rows } = await q(ctx, 'SELECT * FROM screenings ORDER BY created_at DESC LIMIT $1 OFFSET $2', [limit, offset]);
      return rows.map(screeningFromRow);
    },
  };

  // ------------------------------------------------------------ chat
  const messageFromRow = (r) =>
    r && {
      id: r.id, sessionId: r.session_id, userId: r.user_id, role: r.role,
      content: cipher.decrypt(r.content, aad('chat_messages.content', r.id)), topic: r.topic, createdAt: r.created_at,
    };

  const chat = {
    async addMessage(ctx, m) {
      await q(
        ctx,
        `INSERT INTO chat_messages (id, session_id, user_id, role, content, topic) VALUES ($1, $2, $3, $4, $5, $6)`,
        [m.id, m.sessionId, m.userId || null, m.role, cipher.encrypt(m.content, aad('chat_messages.content', m.id)), m.topic || null]
      );
      return { id: m.id, sessionId: m.sessionId, userId: m.userId || null, role: m.role, content: m.content, topic: m.topic || null, createdAt: new Date().toISOString() };
    },
    /** Sesion anonima: SOLO mensajes sin cuenta. Una sesion ligada a una cuenta no se lee sin iniciar sesion. */
    async listBySession(ctx, sessionId, p) {
      const { limit, offset } = page(p);
      const { rows } = await q(
        ctx,
        `SELECT * FROM (SELECT * FROM chat_messages WHERE session_id = $1 AND user_id IS NULL ORDER BY created_at DESC LIMIT $2 OFFSET $3) t ORDER BY created_at ASC`,
        [sessionId, limit, offset]
      );
      return rows.map(messageFromRow);
    },
    async listByUser(ctx, userId, p) {
      const { limit, offset } = page(p);
      const { rows } = await q(
        ctx,
        `SELECT * FROM (SELECT * FROM chat_messages WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3) t ORDER BY created_at ASC`,
        [userId, limit, offset]
      );
      return rows.map(messageFromRow);
    },
    async listActiveUsers(ctx, p) {
      const { limit, offset } = page(p);
      const { rows } = await q(
        ctx,
        `SELECT u.id, u.name, u.email, COUNT(cm.id)::int AS message_count, MAX(cm.created_at) AS last_activity
         FROM users u JOIN chat_messages cm ON cm.user_id = u.id
         GROUP BY u.id, u.name, u.email ORDER BY last_activity DESC LIMIT $1 OFFSET $2`,
        [limit, offset]
      );
      return rows.map((r) => ({ id: r.id, name: r.name, email: r.email, messageCount: r.message_count, lastActivity: r.last_activity }));
    },
  };

  // ------------------------------------------------------------ planes de tratamiento
  const planFromRow = (r) =>
    r && {
      id: r.id, userId: r.user_id, professionalId: r.professional_id, condition: r.condition, title: r.title,
      weeks: cipher.decryptJson(r.weeks, aad('treatment_plans.weeks', r.id)), createdAt: r.created_at, updatedAt: r.updated_at,
    };

  const plans = {
    async create(ctx, p) {
      const { rows } = await q(
        ctx,
        `INSERT INTO treatment_plans (id, user_id, professional_id, condition, title, weeks) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
        [p.id, p.userId, p.professionalId, p.condition, p.title, JSON.stringify(cipher.encryptJson(p.weeks, aad('treatment_plans.weeks', p.id)))]
      );
      return planFromRow(rows[0]);
    },
    async listByUser(ctx, userId, p) {
      const { limit, offset } = page(p);
      const { rows } = await q(ctx, 'SELECT * FROM treatment_plans WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3', [userId, limit, offset]);
      return rows.map(planFromRow);
    },
    async findById(ctx, id) {
      const { rows } = await q(ctx, 'SELECT * FROM treatment_plans WHERE id = $1', [id]);
      return planFromRow(rows[0]) || null;
    },
    async updateWeeks(ctx, id, weeks) {
      const { rows } = await q(
        ctx,
        'UPDATE treatment_plans SET weeks = $2, updated_at = now() WHERE id = $1 RETURNING *',
        [id, JSON.stringify(cipher.encryptJson(weeks, aad('treatment_plans.weeks', id)))]
      );
      return planFromRow(rows[0]);
    },
  };

  // ------------------------------------------------------------ auditoria
  const audit = {
    async log(ctx, { id, professionalId, action, resourceType, resourceId }) {
      await q(
        ctx,
        'INSERT INTO audit_log (id, professional_id, action, resource_type, resource_id) VALUES ($1, $2, $3, $4, $5)',
        [id, professionalId || null, action, resourceType, resourceId || null]
      );
    },
  };

  return { professionals, users, alerts, screenings, chat, plans, audit };
}
