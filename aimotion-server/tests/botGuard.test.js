import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { checkHoneypot, checkFormTiming, verifyTurnstile, createBotGuard } from '../src/security/botGuard.js';
import { fakeReq, run } from './helpers.js';

describe('botGuard: honeypot y tiempo', () => {
  it('honeypot: detecta el campo oculto lleno', () => {
    assert.equal(checkHoneypot({ website: 'http://spam' }), true);
    assert.equal(checkHoneypot({ website: '   ' }), false);
    assert.equal(checkHoneypot({ website: '' }), false);
    assert.equal(checkHoneypot({}), false);
    assert.equal(checkHoneypot(null), false);
  });
  it('tiempo: muy rápido, ausente, futuro o vencido fallan', () => {
    const now = () => 100_000;
    assert.equal(checkFormTiming(99_500, { now }).reason, 'too_fast');
    assert.equal(checkFormTiming(undefined, { now }).reason, 'missing');
    assert.equal(checkFormTiming('99000', { now }).reason, 'missing');
    assert.equal(checkFormTiming(200_000, { now }).reason, 'invalid');
    assert.equal(checkFormTiming(100_000 - 3 * 3_600_000, { now }).reason, 'expired');
  });
  it('tiempo: un llenado humano pasa', () => assert.equal(checkFormTiming(90_000, { now: () => 100_000 }).ok, true));
});

describe('botGuard: Turnstile (verificación en servidor)', () => {
  const fakeFetch = (success) => async (url, opts) => {
    assert.match(url, /challenges\.cloudflare\.com/);
    assert.equal(opts.method, 'POST');
    return { json: async () => ({ success }) };
  };
  it('sin secreto configurado se omite', async () => assert.deepEqual(await verifyTurnstile({ token: 't', secret: '' }), { ok: true, skipped: true }));
  it('con secreto y token válido pasa', async () => assert.equal((await verifyTurnstile({ token: 't', secret: 's', fetchImpl: fakeFetch(true) })).ok, true));
  it('token rechazado por Cloudflare falla', async () => assert.equal((await verifyTurnstile({ token: 't', secret: 's', fetchImpl: fakeFetch(false) })).ok, false));
  it('sin token o token absurdo falla', async () => {
    assert.equal((await verifyTurnstile({ token: '', secret: 's', fetchImpl: fakeFetch(true) })).ok, false);
    assert.equal((await verifyTurnstile({ token: 'x'.repeat(5000), secret: 's', fetchImpl: fakeFetch(true) })).ok, false);
  });
  it('si Cloudflare no responde, falla cerrado (no deja pasar)', async () => {
    const boom = async () => { throw new Error('red'); };
    assert.equal((await verifyTurnstile({ token: 't', secret: 's', fetchImpl: boom })).ok, false);
  });
});

describe('botGuard: middleware', () => {
  const now = () => 100_000;
  const guard = createBotGuard({ now });
  const withBody = (body) => fakeReq({ valid: { body } });

  it('persona real: pasa', async () => assert.equal((await run(guard, withBody({ website: '', formStartedAt: 90_000 }))).next, true));
  it('honeypot lleno → 400 genérico', async () => {
    const { res, next } = await run(guard, withBody({ website: 'x', formStartedAt: 90_000 }));
    assert.equal(next, false);
    assert.equal(res.statusCode, 400);
    assert.ok(!/honeypot|bot/i.test(res.body.error)); // no revela el mecanismo
  });
  it('envío instantáneo o sin marca de tiempo → 400', async () => {
    assert.equal((await run(guard, withBody({ formStartedAt: 99_900 }))).res.statusCode, 400);
    assert.equal((await run(guard, withBody({}))).res.statusCode, 400);
  });
  it('con Turnstile activo y sin token → 400', async () => {
    const g = createBotGuard({ now, turnstileSecret: 'sec', fetchImpl: async () => ({ json: async () => ({ success: true }) }) });
    assert.equal((await run(g, withBody({ formStartedAt: 90_000 }))).res.statusCode, 400);
    assert.equal((await run(g, withBody({ formStartedAt: 90_000, turnstileToken: 'ok' }))).next, true);
  });
});
