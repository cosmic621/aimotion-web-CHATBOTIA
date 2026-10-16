import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createPasswordHasher, MIN_COST } from '../src/auth/hash.js';
import { createTokenService, TTL_SECONDS } from '../src/auth/tokens.js';
import { scoreScale, validateAnswers } from '../src/domain/scales.js';
import { createContactSmsService } from '../src/services/contactSmsService.js';
import { normalizePhone } from '../src/utils/phone.js';

// ---- bcrypt simulado (la logica propia se prueba aqui; bcrypt real corre en tu maquina) ----
function fakeBcrypt() {
  const b = { compareCalls: 0, hashCalls: [], async hash(pw, rounds) { b.hashCalls.push(rounds); return `$2b$${String(rounds).padStart(2, '0')}$${Buffer.from(pw).toString('base64')}`; },
    async compare(pw, hash) { b.compareCalls++; return hash.endsWith(Buffer.from(pw).toString('base64')); } };
  return b;
}

describe('auth/hash: contraseñas', () => {
  it('usa un costo mínimo de 12 aunque se configure menos', async () => {
    const bc = fakeBcrypt();
    const h = createPasswordHasher({ bcrypt: bc, cost: 4 });
    await h.hash('una contraseña larga');
    assert.equal(bc.hashCalls[0], MIN_COST);
    assert.equal(h.rounds, 12);
  });
  it('permite subir el costo', () => assert.equal(createPasswordHasher({ bcrypt: fakeBcrypt(), cost: 14 }).rounds, 14));
  it('verifica correctamente la contraseña buena y la mala', async () => {
    const h = createPasswordHasher({ bcrypt: fakeBcrypt() });
    const stored = await h.hash('correcta-123456');
    assert.equal(await h.verify('correcta-123456', stored), true);
    assert.equal(await h.verify('incorrecta-123456', stored), false);
  });
  it('si el usuario NO existe igual hace una comparación (mismo tiempo) y devuelve false', async () => {
    const bc = fakeBcrypt();
    const h = createPasswordHasher({ bcrypt: bc });
    assert.equal(await h.verify('lo-que-sea', null), false);
    assert.equal(bc.compareCalls, 1);
  });
  it('nunca autentica con la contraseña vacía o inválida', async () => {
    const h = createPasswordHasher({ bcrypt: fakeBcrypt() });
    const stored = await h.hash('correcta-123456');
    for (const bad of ['', undefined, null, 123, {}]) assert.equal(await h.verify(bad, stored), false);
  });
  it('rechaza guardar contraseñas vacías o de más de 72 bytes', async () => {
    const h = createPasswordHasher({ bcrypt: fakeBcrypt() });
    await assert.rejects(() => h.hash(''));
    await assert.rejects(() => h.hash('x'.repeat(73)), /72/);
    assert.equal(await h.verify('x'.repeat(73), await h.hash('x'.repeat(10))), false);
  });
  it('detecta hashes con costo menor al actual (re-hash al iniciar sesión)', () => {
    const h = createPasswordHasher({ bcrypt: fakeBcrypt(), cost: 12 });
    assert.equal(h.needsRehash('$2b$10$abc'), true);
    assert.equal(h.needsRehash('$2b$12$abc'), false);
    assert.equal(h.needsRehash('texto-plano'), true);
    assert.equal(h.needsRehash(null), true);
  });
});

// ---- jwt simulado que respeta las opciones de seguridad que le pasamos ----
function fakeJwt() {
  const j = { lastVerifyOpts: null,
    sign(claims, secret, o) { return Buffer.from(JSON.stringify({ claims, secret, o })).toString('base64url'); },
    verify(token, secret, o) {
      j.lastVerifyOpts = o;
      const d = JSON.parse(Buffer.from(token, 'base64url').toString());
      if (d.secret !== secret) throw new Error('firma');
      if (!o.algorithms?.includes(d.o.algorithm)) throw new Error('algoritmo');
      if (d.o.issuer !== o.issuer) throw new Error('emisor');
      if (d.o.audience !== o.audience) throw new Error('audiencia');
      return { ...d.claims, aud: d.o.audience };
    } };
  return j;
}
const SECRET = 'q7Zr3Lm9Xv2Kp8Tn4Hw6Yb1Jc5Gd0FsR8'; // secrets:ignore (dato de prueba falso)

describe('auth/tokens: sesiones', () => {
  it('exige un secreto fuerte', () => {
    assert.throws(() => createTokenService({ jwt: fakeJwt(), secret: 'corto' }));
    assert.throws(() => createTokenService({ jwt: fakeJwt(), secret: '' }));
  });
  it('fija algoritmo HS256, emisor y audiencia al verificar (no acepta "none")', () => {
    const j = fakeJwt();
    const t = createTokenService({ jwt: j, secret: SECRET });
    const token = t.signProfessional({ id: 'p1', email: 'a@x.com', role: 'ADMIN', name: 'Ana' });
    assert.equal(t.verify(token, 'professional').sub, 'p1');
    assert.deepEqual(j.lastVerifyOpts.algorithms, ['HS256']);
    assert.equal(j.lastVerifyOpts.issuer, 'aimotion');
  });
  it('un token de paciente NO verifica como profesional (y viceversa)', () => {
    const t = createTokenService({ jwt: fakeJwt(), secret: SECRET });
    const pat = t.signPatient({ id: 'u1', email: 'u@x.com', name: 'Uno' });
    const pro = t.signProfessional({ id: 'p1', email: 'a@x.com', role: 'ADMIN', name: 'Ana' });
    assert.equal(t.verify(pat, 'professional'), null);
    assert.equal(t.verify(pro, 'patient'), null);
    assert.ok(t.verify(pat, 'patient'));
  });
  it('verify nunca lanza: basura, secreto distinto, token enorme, tipo inválido → null', () => {
    const t = createTokenService({ jwt: fakeJwt(), secret: SECRET });
    const other = createTokenService({ jwt: fakeJwt(), secret: SECRET.replace('q', 'z') });
    const foreign = other.signPatient({ id: 'u1', email: 'e', name: 'n' });
    for (const bad of ['basura', '', undefined, null, 42, 'x'.repeat(5000), foreign]) assert.equal(t.verify(bad, 'patient'), null);
    assert.equal(t.verify(t.signPatient({ id: 'u', email: 'e', name: 'n' }), 'admin'), null);
  });
  it('los tokens de profesional duran 8 h y los de paciente 7 días', () => {
    assert.equal(TTL_SECONDS.professional, 8 * 3600);
    assert.equal(TTL_SECONDS.patient, 7 * 24 * 3600);
    const t = createTokenService({ jwt: fakeJwt(), secret: SECRET });
    const body = JSON.parse(Buffer.from(t.signProfessional({ id: 'p', email: 'e', role: 'ADMIN', name: 'n' }), 'base64url').toString());
    assert.equal(body.o.expiresIn, 28800);
    assert.equal(body.o.algorithm, 'HS256');
    assert.ok(body.o.jwtid);
  });
  it('no firma un token sin sujeto', () => {
    const t = createTokenService({ jwt: fakeJwt(), secret: SECRET });
    assert.throws(() => t.signProfessional({ id: '' }));
  });
});

describe('domain/scales: puntaje calculado en el servidor', () => {
  it('PHQ-9: severidades según cortes estándar', () => {
    const at = (n) => scoreScale('PHQ-9', [n, 0, 0, 0, 0, 0, 0, 0, 0]).severity;
    assert.equal(scoreScale('PHQ-9', Array(9).fill(0)).severity, 'mínima');
    assert.equal(at(3), 'mínima');
    assert.equal(scoreScale('PHQ-9', [3, 2, 0, 0, 0, 0, 0, 0, 0]).severity, 'leve');
    assert.equal(scoreScale('PHQ-9', [3, 3, 3, 1, 0, 0, 0, 0, 0]).severity, 'moderada');
    assert.equal(scoreScale('PHQ-9', [3, 3, 3, 3, 3, 0, 0, 0, 0]).severity, 'moderadamente severa');
    assert.equal(scoreScale('PHQ-9', Array(9).fill(3)).severity, 'severa');
    assert.equal(scoreScale('PHQ-9', Array(9).fill(3)).total, 27);
  });
  it('GAD-7: severidades según cortes estándar', () => {
    assert.equal(scoreScale('GAD-7', Array(7).fill(0)).severity, 'mínima');
    assert.equal(scoreScale('GAD-7', [3, 2, 0, 0, 0, 0, 0]).severity, 'leve');
    assert.equal(scoreScale('GAD-7', [3, 3, 3, 1, 0, 0, 0]).severity, 'moderada');
    assert.equal(scoreScale('GAD-7', Array(7).fill(3)).severity, 'severa');
  });
  it('valida cantidad de respuestas y rango 0-3', () => {
    assert.equal(validateAnswers('PHQ-9', Array(9).fill(1)), null);
    assert.ok(validateAnswers('PHQ-9', Array(8).fill(1)));
    assert.ok(validateAnswers('GAD-7', Array(9).fill(1)));
    assert.ok(validateAnswers('PHQ-9', [0, 0, 0, 0, 0, 0, 0, 0, 4]));
    assert.ok(validateAnswers('PHQ-9', [0, 0, 0, 0, 0, 0, 0, 0, -1]));
    assert.ok(validateAnswers('PHQ-9', [0, 0, 0, 0, 0, 0, 0, 0, 1.5]));
    assert.ok(validateAnswers('XYZ', []));
  });
});

describe('services/contactSms: SMS al contacto de emergencia', () => {
  const gateway = { url: 'http://192.168.1.50:8080/message', username: 'u', password: 'p' };
  const user = { name: 'Ana María Pérez', emergencyContact: { name: 'Rosa', phone: '3001234567', relation: 'mamá' } };
  const okFetch = () => { const f = async (url, opts) => { f.calls.push({ url, opts }); return { ok: true, status: 200 }; }; f.calls = []; return f; };

  it('envía a la pasarela con autenticación básica y el teléfono normalizado', async () => {
    const f = okFetch();
    const r = await createContactSmsService({ gateway, fetchImpl: f }).send(user);
    assert.deepEqual(r, { sent: true });
    const body = JSON.parse(f.calls[0].opts.body);
    assert.deepEqual(body.phoneNumbers, ['+573001234567']);
    assert.match(f.calls[0].opts.headers.Authorization, /^Basic /);
  });
  it('el mensaje NO contiene nada clínico ni de la conversación', () => {
    const msg = createContactSmsService({ gateway }).buildMessage({ ...user, excerpt: 'me quiero morir', category: 'ideacion_suicida' });
    assert.ok(!/morir|suicid|ideacion|riesgo|depres|ansied/i.test(msg));
    assert.match(msg, /Linea 106/);
    assert.ok(msg.includes('Ana'));
    assert.ok(!msg.includes('Pérez'));
  });
  it('el mensaje usa solo GSM-7 simple (sin tildes ni caracteres especiales)', () => {
    const msg = createContactSmsService({ gateway }).buildMessage({ name: 'José' });
    assert.ok(!/[^\x20-\x7E]/.test(msg));
  });
  it('un nombre malicioso no puede colar enlaces ni texto en el SMS', () => {
    const svc = createContactSmsService({ gateway });
    for (const name of ['http://phishing.example/login', '<script>', 'Ana, llama a este número 3009998888', 'CLICK-AQUI!!!!']) {
      const msg = svc.buildMessage({ name });
      assert.ok(!/http|:\/\/|<|>|3009998888/.test(msg), `${name} -> ${msg}`);
    }
  });
  it('sin pasarela configurada, con teléfono inválido o URL rara: no envía', async () => {
    const f = okFetch();
    assert.equal((await createContactSmsService({ gateway: {}, fetchImpl: f }).send(user)).sent, false);
    assert.equal((await createContactSmsService({ gateway, fetchImpl: f }).send({ ...user, emergencyContact: { phone: '123' } })).sent, false);
    assert.equal((await createContactSmsService({ gateway: { ...gateway, url: 'file:///etc/passwd' }, fetchImpl: f }).send(user)).sent, false);
    assert.equal(f.calls.length, 0);
  });
  it('maneja respuestas de error y fallos de red sin lanzar', async () => {
    const bad = async () => ({ ok: false, status: 401 });
    assert.match((await createContactSmsService({ gateway, fetchImpl: bad }).send(user)).reason, /401/);
    const boom = async () => { throw new Error('sin red'); };
    assert.equal((await createContactSmsService({ gateway, fetchImpl: boom }).send(user)).sent, false);
  });
});

describe('utils/phone', () => {
  it('normaliza celulares colombianos y números internacionales', () => {
    assert.equal(normalizePhone('300 123 4567'), '+573001234567');
    assert.equal(normalizePhone('573001234567'), '+573001234567');
    assert.equal(normalizePhone('+1 (415) 555-0100'), '+14155550100');
  });
  it('rechaza lo que no parece un teléfono', () => {
    for (const bad of ['', 'abc', '123', '2001234567', '+12', undefined, null, '300123456789012345']) assert.equal(normalizePhone(bad), null, String(bad));
  });
});
