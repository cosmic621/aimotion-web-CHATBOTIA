import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { ACCESS_POLICY, matchPolicy, enforceAccess, createAuthenticator } from '../src/security/accessPolicy.js';
import { cookieNames } from '../src/security/cookies.js';
import { fakeReq, run } from './helpers.js';

describe('accessPolicy: tabla central (deny-by-default)', () => {
  it('rutas desconocidas → null (se rechazan)', () => {
    for (const [m, p] of [['GET', '/api/secret'], ['GET', '/'], ['DELETE', '/api/alerts'], ['GET', '/api/users'], ['POST', '/api/admin/metrics'], ['PUT', '/api/alerts']]) {
      assert.equal(matchPolicy(m, p), null, `${m} ${p}`);
    }
  });
  it('el método importa', () => {
    assert.equal(matchPolicy('GET', '/api/alerts'), 'professional');
    assert.equal(matchPolicy('POST', '/api/alerts'), 'optional');
    assert.equal(matchPolicy('DELETE', '/api/alerts'), null);
  });
  it('resuelve parámetros y rechaza ids sospechosos o rutas manipuladas', () => {
    assert.equal(matchPolicy('PATCH', '/api/alerts/Ae5tWJJIvt/review'), 'professional');
    assert.equal(matchPolicy('PATCH', '/api/alerts/../review'), null);
    assert.equal(matchPolicy('PATCH', "/api/alerts/a'b/review"), null);
    assert.equal(matchPolicy('PATCH', '/api/alerts//review'), null);
    assert.equal(matchPolicy('GET', '/api/chat/users/x%2F..%2Fy/messages'), null);
  });
  it('ignora query string y barra final', () => {
    assert.equal(matchPolicy('GET', '/api/alerts/?limit=5'), 'professional');
  });
  it('las rutas sensibles NUNCA son públicas ni opcionales', () => {
    const sensitive = [
      ['GET', '/api/alerts'], ['PATCH', '/api/alerts/abc/review'], ['GET', '/api/screenings'], ['GET', '/api/chat/users'],
      ['GET', '/api/chat/users/abc/messages'], ['POST', '/api/treatment-plans'], ['GET', '/api/treatment-plans/user/abc'],
    ];
    for (const [m, p] of sensitive) assert.equal(matchPolicy(m, p), 'professional', `${m} ${p}`);
    assert.equal(matchPolicy('GET', '/api/admin/metrics'), 'admin');
    assert.equal(matchPolicy('GET', '/api/treatment-plans/mine'), 'patient');
    assert.equal(matchPolicy('PATCH', '/api/patient-auth/contact'), 'patient');
  });
  it('solo estas rutas son anónimas (lista cerrada)', () => {
    const open = ACCESS_POLICY.filter(([, , l]) => l === 'public' || l === 'optional').map(([m, p]) => `${m} ${p}`).sort();
    assert.deepEqual(open, [
      'GET /api/auth/csrf', 'GET /api/chat/messages', 'GET /api/health', 'POST /api/alerts', 'POST /api/auth/login', 'POST /api/auth/logout',
      'POST /api/chat/messages', 'POST /api/patient-auth/login', 'POST /api/patient-auth/logout', 'POST /api/patient-auth/register', 'POST /api/screenings',
    ]);
  });
  it('todos los niveles son válidos', () => {
    for (const [, , level] of ACCESS_POLICY) assert.ok(['public', 'optional', 'patient', 'professional', 'admin'].includes(level));
  });
});

describe('accessPolicy: enforceAccess', () => {
  const guard = enforceAccess();
  const req = (method, url, extra = {}) => fakeReq({ method, originalUrl: url, ...extra });

  it('ruta fuera de la tabla → 403 aunque haya sesión', async () => {
    const { res, next } = await run(guard, req('GET', '/api/oculta', { professional: { id: '1', role: 'ADMIN' } }));
    assert.equal(next, false);
    assert.equal(res.statusCode, 403);
  });
  it('profesional sin sesión → 401; con sesión → pasa', async () => {
    assert.equal((await run(guard, req('GET', '/api/alerts'))).res.statusCode, 401);
    assert.equal((await run(guard, req('GET', '/api/alerts', { professional: { id: '1', role: 'PSICOLOGO' } }))).next, true);
  });
  it('una sesión de paciente NO sirve en rutas de profesional', async () => {
    assert.equal((await run(guard, req('GET', '/api/alerts', { user: { id: 'u1' } }))).res.statusCode, 401);
  });
  it('una sesión de profesional NO sirve en rutas de paciente', async () => {
    assert.equal((await run(guard, req('GET', '/api/treatment-plans/mine', { professional: { id: '1', role: 'ADMIN' } }))).res.statusCode, 401);
  });
  it('paciente: sin sesión → 401; con sesión → pasa', async () => {
    assert.equal((await run(guard, req('GET', '/api/patient-auth/me'))).res.statusCode, 401);
    assert.equal((await run(guard, req('GET', '/api/patient-auth/me', { user: { id: 'u1' } }))).next, true);
  });
  it('admin: PSICOLOGO → 403; ADMIN → pasa; sin sesión → 401', async () => {
    assert.equal((await run(guard, req('GET', '/api/admin/metrics'))).res.statusCode, 401);
    assert.equal((await run(guard, req('GET', '/api/admin/metrics', { professional: { id: '1', role: 'PSICOLOGO' } }))).res.statusCode, 403);
    assert.equal((await run(guard, req('GET', '/api/admin/metrics', { professional: { id: '1', role: 'ADMIN' } }))).next, true);
  });
  it('públicas y opcionales pasan sin sesión', async () => {
    for (const [m, u] of [['GET', '/api/health'], ['POST', '/api/auth/login'], ['POST', '/api/alerts'], ['GET', '/api/chat/messages?sessionId=x']]) {
      assert.equal((await run(guard, req(m, u))).next, true, `${m} ${u}`);
    }
  });
});

describe('accessPolicy: identificación de la sesión por cookie', () => {
  const names = cookieNames(false);
  const verify = (token, audience) => (token === `valid-${audience}` ? { sub: 'id1', email: 'a@x.com', role: 'ADMIN', name: 'Ana' } : null);
  const auth = createAuthenticator({ verify, names });

  it('reconoce la cookie de profesional', async () => {
    const r = fakeReq({ headers: { cookie: `${names.professional}=valid-professional` } });
    await run(auth, r);
    assert.equal(r.professional.id, 'id1');
    assert.equal(r.user, undefined);
  });
  it('reconoce la cookie de paciente', async () => {
    const r = fakeReq({ headers: { cookie: `${names.patient}=valid-patient` } });
    await run(auth, r);
    assert.equal(r.user.id, 'id1');
    assert.equal(r.professional, undefined);
  });
  it('un token de paciente en la cookie de profesional NO autentica (audiencia)', async () => {
    const r = fakeReq({ headers: { cookie: `${names.professional}=valid-patient` } });
    await run(auth, r);
    assert.equal(r.professional, undefined);
  });
  it('tokens inválidos o ausentes no autentican', async () => {
    const r = fakeReq({ headers: { cookie: `${names.professional}=basura` } });
    await run(auth, r);
    assert.equal(r.professional, undefined);
    const r2 = fakeReq({});
    await run(auth, r2);
    assert.equal(r2.professional, undefined);
    assert.equal(r2.user, undefined);
  });
  it('ignora la cabecera Authorization (solo se aceptan cookies HttpOnly)', async () => {
    const r = fakeReq({ headers: { authorization: 'Bearer valid-professional' } });
    await run(auth, r);
    assert.equal(r.professional, undefined);
  });
});
