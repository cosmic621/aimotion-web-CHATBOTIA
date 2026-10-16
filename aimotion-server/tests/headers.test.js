import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { securityHeaders, forceHttps } from '../src/security/headers.js';
import { fakeReq, fakeRes, run } from './helpers.js';

describe('headers: cabeceras de seguridad', () => {
  it('establece las cabeceras defensivas y quita X-Powered-By', async () => {
    const res = fakeRes();
    res.setHeader('X-Powered-By', 'Express');
    const { next } = await run(securityHeaders(), fakeReq(), res);
    assert.equal(next, true);
    const h = res.headers;
    assert.match(h['content-security-policy'], /default-src 'none'/);
    assert.match(h['content-security-policy'], /frame-ancestors 'none'/);
    assert.equal(h['x-content-type-options'], 'nosniff');
    assert.equal(h['x-frame-options'], 'DENY');
    assert.equal(h['referrer-policy'], 'no-referrer');
    assert.match(h['permissions-policy'], /camera=\(\)/);
    assert.equal(h['cross-origin-opener-policy'], 'same-origin');
    assert.equal(h['x-powered-by'], undefined);
  });
  it('los datos de salud nunca se cachean', async () => {
    const { res } = await run(securityHeaders(), fakeReq());
    assert.match(res.headers['cache-control'], /no-store/);
  });
  it('HSTS solo cuando está activado', async () => {
    assert.equal((await run(securityHeaders(), fakeReq())).res.headers['strict-transport-security'], undefined);
    const on = (await run(securityHeaders({ hsts: true }), fakeReq())).res.headers['strict-transport-security'];
    assert.match(on, /max-age=31536000/);
    assert.match(on, /includeSubDomains/);
  });
});

describe('headers: HTTPS obligatorio', () => {
  it('desactivado: no hace nada', async () => {
    assert.equal((await run(forceHttps({ enabled: false }), fakeReq({ secure: false }))).next, true);
  });
  it('conexión segura: pasa', async () => {
    assert.equal((await run(forceHttps({ enabled: true }), fakeReq({ secure: true }))).next, true);
  });
  it('GET por HTTP: redirige 308 a https conservando la ruta', async () => {
    const { res, next } = await run(forceHttps({ enabled: true }), fakeReq({ secure: false, headers: { host: 'api.ejemplo.com' }, originalUrl: '/api/alerts?limit=5' }));
    assert.equal(next, false);
    assert.equal(res.statusCode, 308);
    assert.equal(res.redirected, 'https://api.ejemplo.com/api/alerts?limit=5');
  });
  it('usa el host público configurado (evita redirecciones abiertas por Host manipulado)', async () => {
    const { res } = await run(forceHttps({ enabled: true, publicHost: 'api.aimotion.co' }), fakeReq({ secure: false, headers: { host: 'evil.com' } }));
    assert.equal(res.redirected, 'https://api.aimotion.co/');
  });
  it('rechaza un Host malicioso', async () => {
    for (const host of ['evil.com/\r\nX: y', 'a b', 'x@y.com', '<script>']) {
      const { res } = await run(forceHttps({ enabled: true }), fakeReq({ secure: false, headers: { host } }));
      assert.equal(res.statusCode, 400, host);
    }
  });
  it('POST por HTTP no se redirige (se rechaza con 426)', async () => {
    const { res } = await run(forceHttps({ enabled: true }), fakeReq({ method: 'POST', secure: false, headers: { host: 'a.com' } }));
    assert.equal(res.statusCode, 426);
  });
});
