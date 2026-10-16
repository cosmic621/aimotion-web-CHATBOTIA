import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createRateLimiter, createLoginGuard } from '../src/security/rateLimit.js';
import { fakeReq, fakeRes, run } from './helpers.js';

function clock(start = 1_000_000) {
  let t = start;
  return { now: () => t, advance: (ms) => { t += ms; } };
}

describe('rateLimit: limitador por ventana', () => {
  it('permite hasta el máximo y responde 429 con Retry-After después', async () => {
    const c = clock();
    const rl = createRateLimiter({ windowMs: 60_000, max: 3, now: c.now, cleanupIntervalMs: 0 });
    for (let i = 0; i < 3; i++) assert.equal((await run(rl, fakeReq())).next, true);
    const { res, next } = await run(rl, fakeReq());
    assert.equal(next, false);
    assert.equal(res.statusCode, 429);
    assert.ok(Number(res.headers['retry-after']) >= 1);
    assert.equal(res.headers['ratelimit-remaining'], '0');
  });
  it('se reinicia al terminar la ventana', async () => {
    const c = clock();
    const rl = createRateLimiter({ windowMs: 1000, max: 1, now: c.now, cleanupIntervalMs: 0 });
    await run(rl, fakeReq());
    assert.equal((await run(rl, fakeReq())).next, false);
    c.advance(1001);
    assert.equal((await run(rl, fakeReq())).next, true);
  });
  it('lleva la cuenta por clave (IP distinta, contador distinto)', async () => {
    const c = clock();
    const rl = createRateLimiter({ windowMs: 1000, max: 1, now: c.now, cleanupIntervalMs: 0 });
    await run(rl, fakeReq({ ip: '1.1.1.1' }));
    assert.equal((await run(rl, fakeReq({ ip: '1.1.1.1' }))).next, false);
    assert.equal((await run(rl, fakeReq({ ip: '2.2.2.2' }))).next, true);
  });
  it('informa las cabeceras RateLimit-* y estadísticas', async () => {
    const c = clock();
    const rl = createRateLimiter({ name: 'x', windowMs: 1000, max: 5, now: c.now, cleanupIntervalMs: 0 });
    const { res } = await run(rl, fakeReq());
    assert.equal(res.headers['ratelimit-limit'], '5');
    assert.equal(res.headers['ratelimit-remaining'], '4');
    assert.deepEqual(rl.stats(), { name: 'x', allowed: 1, blocked: 0, keys: 1 });
  });
  it('sweep elimina entradas vencidas (no crece sin límite)', async () => {
    const c = clock();
    const rl = createRateLimiter({ windowMs: 1000, max: 5, now: c.now, cleanupIntervalMs: 0 });
    for (let i = 0; i < 50; i++) await run(rl, fakeReq({ ip: `9.9.9.${i}` }));
    assert.equal(rl.stats().keys, 50);
    c.advance(2000);
    rl.sweep();
    assert.equal(rl.stats().keys, 0);
  });
});

describe('rateLimit: protección de inicio de sesión (fuerza bruta)', () => {
  const mk = (c, extra = {}) => createLoginGuard({ now: c.now, ...extra });

  it('bloquea la cuenta tras 5 fallos', () => {
    const c = clock();
    const g = mk(c);
    for (let i = 0; i < 4; i++) { assert.equal(g.check('1.1.1.1', 'ana@x.com').allowed, true); g.fail('1.1.1.1', 'ana@x.com'); }
    assert.equal(g.check('1.1.1.1', 'ana@x.com').allowed, true);
    g.fail('1.1.1.1', 'ana@x.com');
    const r = g.check('1.1.1.1', 'ana@x.com');
    assert.equal(r.allowed, false);
    assert.ok(r.retryAfterSec > 0 && r.retryAfterSec <= 900);
  });
  it('el bloqueo aplica a la cuenta aunque cambie la IP (ataque distribuido)', () => {
    const c = clock();
    const g = mk(c);
    for (let i = 0; i < 5; i++) g.fail(`10.0.0.${i}`, 'ana@x.com');
    assert.equal(g.check('99.99.99.99', 'ana@x.com').allowed, false);
  });
  it('bloquea una IP que prueba muchas cuentas (password spraying)', () => {
    const c = clock();
    const g = mk(c);
    for (let i = 0; i < 20; i++) g.fail('5.5.5.5', `user${i}@x.com`);
    assert.equal(g.check('5.5.5.5', 'otra@x.com').allowed, false);
    assert.equal(g.check('6.6.6.6', 'otra@x.com').allowed, true);
  });
  it('ignora mayúsculas y espacios en el identificador', () => {
    const c = clock();
    const g = mk(c);
    for (let i = 0; i < 5; i++) g.fail('1.1.1.1', i % 2 ? ' ANA@x.com ' : 'ana@X.com');
    assert.equal(g.check('2.2.2.2', 'Ana@x.com').allowed, false);
  });
  it('un inicio correcto limpia el contador de la cuenta', () => {
    const c = clock();
    const g = mk(c);
    for (let i = 0; i < 4; i++) g.fail('1.1.1.1', 'ana@x.com');
    g.success('1.1.1.1', 'ana@x.com');
    g.fail('1.1.1.1', 'ana@x.com');
    assert.equal(g.check('1.1.1.1', 'ana@x.com').allowed, true);
  });
  it('el bloqueo expira, y los repetidos duran el doble', () => {
    const c = clock();
    const g = mk(c);
    for (let i = 0; i < 5; i++) g.fail('1.1.1.1', 'ana@x.com');
    const first = g.check('1.1.1.1', 'ana@x.com').retryAfterSec;
    c.advance(15 * 60_000 + 1000);
    assert.equal(g.check('1.1.1.1', 'ana@x.com').allowed, true);
    for (let i = 0; i < 5; i++) g.fail('1.1.1.1', 'ana@x.com');
    const second = g.check('1.1.1.1', 'ana@x.com').retryAfterSec;
    assert.ok(second > first * 1.8, `${second} vs ${first}`);
  });
  it('los fallos antiguos (fuera de la ventana) no se acumulan', () => {
    const c = clock();
    const g = mk(c);
    for (let i = 0; i < 4; i++) g.fail('1.1.1.1', 'ana@x.com');
    c.advance(16 * 60_000);
    g.fail('1.1.1.1', 'ana@x.com');
    assert.equal(g.check('1.1.1.1', 'ana@x.com').allowed, true);
  });
  it('el bloqueo máximo está acotado', () => {
    const c = clock();
    const g = mk(c, { baseLockMs: 60_000, maxLockMs: 120_000, maxFailuresPerAccount: 1, maxFailuresPerIp: 1000 });
    for (let i = 0; i < 6; i++) { g.fail('1.1.1.1', 'a@x.com'); c.advance(200_000); }
    g.fail('1.1.1.1', 'a@x.com');
    assert.ok(g.check('1.1.1.1', 'a@x.com').retryAfterSec <= 120);
  });
});
