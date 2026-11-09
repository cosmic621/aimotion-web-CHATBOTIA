import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createSessionGuard } from '../src/security/sessionGuard.js';
import { fakeReq, run } from './helpers.js';

function setup(initial = {}) {
  const pros = new Map(initial.pros || []);
  const users = new Map(initial.users || []);
  const calls = { pro: 0, user: 0 };
  const repos = {
    professionals: { findById: async (_c, id) => { calls.pro++; return pros.get(id) || null; } },
    users: { findById: async (_c, id) => { calls.user++; return users.get(id) || null; } },
  };
  let t = 1_000_000;
  const guard = createSessionGuard({ repos, ttlMs: 5000, now: () => t });
  return { pros, users, calls, guard, tick: (ms) => { t += ms; } };
}

describe('sessionGuard: la sesión solo vale mientras la cuenta siga activa', () => {
  it('cuenta activa: la sesión sigue y el ROL sale de la base de datos, no del token', async () => {
    const { guard } = setup({ users: [['u1', { id: 'u1', name: 'Ana', role: 'FUNCIONARIO', status: 'activo' }]] });
    const req = fakeReq({ user: { id: 'u1', name: 'viejo', iat: 100 } });
    const { next } = await run(guard.middleware, req);
    assert.equal(next, true);
    assert.equal(req.user.role, 'FUNCIONARIO');
    assert.equal(req.user.name, 'Ana');
  });
  it('un usuario sin perfil guardado es USUARIO', async () => {
    const { guard } = setup({ users: [['u1', { id: 'u1', name: 'Ana', status: 'activo' }]] });
    const req = fakeReq({ user: { id: 'u1', iat: 100 } });
    await run(guard.middleware, req);
    assert.equal(req.user.role, 'USUARIO');
  });
  it('cuenta suspendida → se descarta la sesión (la política de acceso responderá 401)', async () => {
    const { guard } = setup({
      users: [['u1', { id: 'u1', status: 'suspendido' }]],
      pros: [['p1', { id: 'p1', role: 'ADMIN', status: 'suspendido' }]],
    });
    const req = fakeReq({ user: { id: 'u1', iat: 100 }, professional: { id: 'p1', role: 'ADMIN', iat: 100 } });
    const { next } = await run(guard.middleware, req);
    assert.equal(next, true);
    assert.equal(req.user, undefined);
    assert.equal(req.professional, undefined);
  });
  it('cuenta eliminada → se descarta la sesión', async () => {
    const { guard } = setup();
    const req = fakeReq({ user: { id: 'fantasma', iat: 100 } });
    await run(guard.middleware, req);
    assert.equal(req.user, undefined);
  });
  it('contraseña cambiada después de emitir el token → se descarta', async () => {
    const { guard } = setup({ users: [['u1', { id: 'u1', status: 'activo', sessionsValidAfter: new Date(200_000 * 1000) }]] });
    const old = fakeReq({ user: { id: 'u1', iat: 100_000 } });
    await run(guard.middleware, old);
    assert.equal(old.user, undefined);
    const fresh = fakeReq({ user: { id: 'u1', iat: 200_001 } });
    await run(guard.middleware, fresh);
    assert.ok(fresh.user);
  });
  it('un administrador cambiado a otro rol pierde el acceso de admin al instante', async () => {
    const { guard } = setup({ pros: [['p1', { id: 'p1', name: 'Ana', role: 'PSICOLOGO', status: 'activo' }]] });
    const req = fakeReq({ professional: { id: 'p1', role: 'ADMIN', iat: 100 } });
    await run(guard.middleware, req);
    assert.equal(req.professional.role, 'PSICOLOGO');
  });
  it('sin sesión no consulta la base de datos', async () => {
    const { guard, calls } = setup();
    await run(guard.middleware, fakeReq());
    assert.equal(calls.pro + calls.user, 0);
  });
  it('guarda el resultado unos segundos y invalidate() lo olvida al instante', async () => {
    const s = setup({ users: [['u1', { id: 'u1', status: 'activo' }]] });
    const hit = () => run(s.guard.middleware, fakeReq({ user: { id: 'u1', iat: 100 } }));
    await hit(); await hit();
    assert.equal(s.calls.user, 1, 'la segunda vez sale del caché');
    s.users.set('u1', { id: 'u1', status: 'suspendido' });
    const stillCached = fakeReq({ user: { id: 'u1', iat: 100 } });
    await run(s.guard.middleware, stillCached);
    assert.ok(stillCached.user, 'dentro del TTL aún se ve la versión guardada');
    s.guard.invalidate('patient', 'u1');
    const after = fakeReq({ user: { id: 'u1', iat: 100 } });
    await run(s.guard.middleware, after);
    assert.equal(after.user, undefined, 'tras invalidate se nota de inmediato');
  });
  it('vencido el TTL vuelve a consultar', async () => {
    const s = setup({ users: [['u1', { id: 'u1', status: 'activo' }]] });
    await run(s.guard.middleware, fakeReq({ user: { id: 'u1', iat: 100 } }));
    s.tick(6000);
    await run(s.guard.middleware, fakeReq({ user: { id: 'u1', iat: 100 } }));
    assert.equal(s.calls.user, 2);
  });
  it('si la base falla, no deja pasar: pasa el error a Express (500), no la sesión', async () => {
    const guard = createSessionGuard({ repos: { users: { findById: async () => { throw new Error('db caída'); } }, professionals: {} } });
    let received;
    await guard.middleware(fakeReq({ user: { id: 'u1', iat: 1 } }), {}, (e) => { received = e; });
    assert.match(received.message, /db caída/);
  });
});
