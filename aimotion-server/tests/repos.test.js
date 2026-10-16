import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { createRepos, publicUser } from '../src/db/repos.js';
import { createCipherBox } from '../src/security/crypto.js';
import { systemCtx, anonCtx, patientCtx, professionalCtx } from '../src/db/context.js';

const cipher = createCipherBox({ keys: { k1: crypto.randomBytes(32) }, currentKeyId: 'k1' });

function fakeDb() {
  const db = {
    calls: [], next: [],
    async query(ctx, sql, params) {
      db.calls.push({ ctx, sql, params });
      const rows = db.next.length ? db.next.shift() : [];
      return { rows, rowCount: rows.length };
    },
  };
  return db;
}

let db; let repos;
beforeEach(() => { db = fakeDb(); repos = createRepos({ db, cipher }); });
const last = () => db.calls[db.calls.length - 1];

describe('repos: cifrado de datos sensibles (en reposo)', () => {
  it('el chat se guarda cifrado y no aparece el texto en los parámetros', async () => {
    await repos.chat.addMessage(patientCtx({ id: 'u1' }), { id: 'm1', sessionId: 's', userId: 'u1', role: 'user', content: 'me quiero morir', topic: 'depresion' });
    const stored = last().params[4];
    assert.ok(cipher.isEncrypted(stored));
    assert.ok(!JSON.stringify(last().params).includes('me quiero morir'));
    assert.equal(cipher.decrypt(stored, 'chat_messages.content:m1'), 'me quiero morir');
  });
  it('al leer, descifra el chat', async () => {
    db.next.push([{ id: 'm1', session_id: 's', user_id: 'u1', role: 'user', content: cipher.encrypt('hola', 'chat_messages.content:m1'), topic: null, created_at: 'x' }]);
    const [m] = await repos.chat.listByUser(professionalCtx({ id: 'p1' }), 'u1');
    assert.equal(m.content, 'hola');
  });
  it('lee mensajes antiguos en texto plano (compatibilidad)', async () => {
    db.next.push([{ id: 'm9', session_id: 's', user_id: null, role: 'bot', content: 'texto viejo', topic: null, created_at: 'x' }]);
    assert.equal((await repos.chat.listBySession(anonCtx('s'), 's'))[0].content, 'texto viejo');
  });
  it('un dato cifrado movido a otra fila NO se puede leer (AAD ligado al id)', async () => {
    const stolen = cipher.encrypt('secreto de otra persona', 'chat_messages.content:m1');
    db.next.push([{ id: 'm2', session_id: 's', user_id: 'u2', role: 'user', content: stolen, topic: null, created_at: 'x' }]);
    await assert.rejects(() => repos.chat.listByUser(systemCtx(), 'u2'), /No se pudo descifrar/);
  });
  it('el contacto de emergencia se guarda cifrado (nombre, teléfono y parentesco)', async () => {
    db.next.push([{ id: 'u1', name: 'Ana', email: 'a@x.com', password_hash: 'h', created_at: 'x', emergency_contact_name: 'x', emergency_contact_phone: 'y', emergency_contact_relation: 'z', contact_consent_at: 'now' }]);
    await repos.users.create(systemCtx(), { id: 'u1', name: 'Ana', email: 'A@X.com', passwordHash: 'h', contact: { name: 'Mamá Rosa', phone: '+573001234567', relation: 'mamá' } });
    const p = last().params;
    assert.equal(p[2], 'a@x.com');
    for (const idx of [4, 5, 6]) assert.ok(cipher.isEncrypted(p[idx]));
    assert.ok(!JSON.stringify(p).includes('3001234567'));
    assert.equal(cipher.decrypt(p[5], 'users.emergency_contact_phone:u1'), '+573001234567');
  });
  it('al leer un usuario descifra el contacto', async () => {
    db.next.push([{
      id: 'u1', name: 'Ana', email: 'a@x.com', password_hash: 'h', created_at: 'x', contact_consent_at: 'c',
      emergency_contact_name: cipher.encrypt('Rosa', 'users.emergency_contact_name:u1'),
      emergency_contact_phone: cipher.encrypt('+573001234567', 'users.emergency_contact_phone:u1'),
      emergency_contact_relation: cipher.encrypt('mamá', 'users.emergency_contact_relation:u1'),
    }]);
    const u = await repos.users.findById(patientCtx({ id: 'u1' }), 'u1');
    assert.deepEqual(u.emergencyContact, { name: 'Rosa', phone: '+573001234567', relation: 'mamá', consentAt: 'c' });
  });
  it('usuario sin contacto → emergencyContact null', async () => {
    db.next.push([{ id: 'u1', name: 'Ana', email: 'a@x.com', password_hash: 'h', created_at: 'x', emergency_contact_phone: null }]);
    assert.equal((await repos.users.findById(systemCtx(), 'u1')).emergencyContact, null);
  });
  it('publicUser nunca expone el hash de la contraseña', () => {
    const u = publicUser({ id: '1', name: 'A', email: 'a@x.com', passwordHash: 'SECRETO', emergencyContact: null, createdAt: 'x' });
    assert.ok(!('passwordHash' in u));
    assert.ok(!JSON.stringify(u).includes('SECRETO'));
  });
  it('el extracto de la alerta y la nota del profesional se cifran', async () => {
    await repos.alerts.create(anonCtx('s'), { id: 'a1', sessionId: 's', category: 'ideacion_suicida', severity: 'critico', excerpt: 'ya no quiero vivir' });
    assert.ok(cipher.isEncrypted(last().params[6]));
    assert.ok(!JSON.stringify(last().params).includes('ya no quiero vivir'));
    db.next.push([{ id: 'a1', session_id: 's', excerpt: 'x', reviewer_note: 'x', notifications: {} }]);
    await repos.alerts.markReviewed(professionalCtx({ id: 'p1' }), 'a1', { reviewedById: 'p1', reviewerNote: 'llamé a la familia' });
    assert.ok(cipher.isEncrypted(last().params[2]));
    assert.ok(!JSON.stringify(last().params).includes('llamé a la familia'));
  });
  it('las respuestas del tamizaje y las semanas del plan se guardan cifradas (JSONB)', async () => {
    await repos.screenings.create(anonCtx('s'), { id: 's1', sessionId: 's', type: 'PHQ-9', answers: [3, 3, 3, 3, 3, 3, 3, 3, 3], totalScore: 27, severity: 'severa' });
    const stored = JSON.parse(last().params[5]);
    assert.equal(typeof stored.enc, 'string');
    assert.ok(!last().params[5].includes('[3,3,3'));
    db.next.push([{ id: 'p1', user_id: 'u1', professional_id: 'pr', condition: 'depresion', title: 't', weeks: { enc: 'x' }, created_at: 'x', updated_at: 'x' }]);
    await assert.rejects(() => repos.plans.create(professionalCtx({ id: 'pr' }), { id: 'p1', userId: 'u1', professionalId: 'pr', condition: 'depresion', title: 't', weeks: [{ week_number: 1, title: 'a', description: 'b', completed: false }] }));
    assert.equal(typeof JSON.parse(last().params[5]).enc, 'string');
  });
  it('lee tamizajes antiguos con respuestas sin cifrar', async () => {
    db.next.push([{ id: 's1', session_id: 's', user_id: null, user_name: null, type: 'GAD-7', answers: [1, 2, 3, 0, 0, 0, 1], total_score: 7, severity: 'leve', created_at: 'x' }]);
    assert.deepEqual((await repos.screenings.list(professionalCtx({ id: 'p' })))[0].answers, [1, 2, 3, 0, 0, 0, 1]);
  });
});

describe('repos: contexto RLS y límites', () => {
  it('cada consulta recibe el contexto de quien la pide', async () => {
    await repos.chat.listByUser(patientCtx({ id: 'u1' }), 'u1');
    assert.deepEqual(last().ctx, { role: 'patient', userId: 'u1' });
    await repos.alerts.list(professionalCtx({ id: 'p1' }));
    assert.deepEqual(last().ctx, { role: 'professional', userId: 'p1' });
    await repos.chat.listBySession(anonCtx('sess1'), 'sess1');
    assert.deepEqual(last().ctx, { role: 'anon', sessionId: 'sess1' });
  });
  it('toda lista lleva LIMIT/OFFSET (valores por defecto y personalizados)', async () => {
    await repos.alerts.list(systemCtx());
    assert.match(last().sql, /LIMIT \$1 OFFSET \$2/);
    assert.deepEqual(last().params, [50, 0]);
    await repos.screenings.list(systemCtx(), { limit: 10, offset: 20 });
    assert.deepEqual(last().params, [10, 20]);
    await repos.chat.listActiveUsers(systemCtx(), { limit: 5, offset: 0 });
    assert.match(last().sql, /LIMIT \$1 OFFSET \$2/);
  });
  it('el historial de una sesión anónima solo incluye mensajes SIN cuenta', async () => {
    await repos.chat.listBySession(anonCtx('s'), 's');
    assert.match(last().sql, /user_id IS NULL/);
  });
  it('alerts.create no usa RETURNING (un anónimo no puede leer alertas)', async () => {
    await repos.alerts.create(anonCtx('s'), { id: 'a', sessionId: 's', category: 'x', severity: 'alto', excerpt: '' });
    assert.ok(!/RETURNING/i.test(last().sql));
  });
});

describe('repos: sin inyección SQL', () => {
  it('ninguna entrada maliciosa llega al texto SQL (solo a los parámetros)', async () => {
    const evil = "x'; DROP TABLE users; --";
    const sys = systemCtx();
    const calls = [
      () => repos.professionals.findByEmail(sys, evil),
      () => repos.users.findByEmail(sys, evil),
      () => repos.users.findById(sys, evil),
      () => repos.alerts.findById(sys, evil),
      () => repos.alerts.lastContactNotification(sys, evil),
      () => repos.chat.listBySession(sys, evil),
      () => repos.chat.listByUser(sys, evil),
      () => repos.plans.listByUser(sys, evil),
      () => repos.plans.findById(sys, evil),
      () => repos.chat.addMessage(sys, { id: evil, sessionId: evil, userId: evil, role: 'user', content: evil, topic: evil }),
      () => repos.alerts.create(sys, { id: evil, sessionId: evil, userId: evil, userName: evil, category: evil, severity: 'alto', excerpt: evil }),
      () => repos.screenings.create(sys, { id: evil, sessionId: evil, type: 'PHQ-9', answers: [1], totalScore: 1, severity: evil }),
      () => repos.audit.log(sys, { id: evil, professionalId: evil, action: evil, resourceType: evil, resourceId: evil }),
    ];
    for (const c of calls) await c();
    assert.equal(db.calls.length, calls.length);
    for (const call of db.calls) {
      assert.ok(!call.sql.includes('DROP TABLE'), call.sql);
      assert.ok(!call.sql.includes(evil));
      assert.match(call.sql, /\$1/);
    }
  });
  it('los emails se normalizan a minúsculas antes de consultar', async () => {
    await repos.users.findByEmail(systemCtx(), 'ANA@X.COM');
    assert.deepEqual(last().params, ['ana@x.com']);
  });
});
