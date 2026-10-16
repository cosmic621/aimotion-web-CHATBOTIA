import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { parseCookies, serializeCookie, clearCookieHeader, cookieNames, csrfTokenFor, csrfProtection, appendSetCookie } from '../src/security/cookies.js';
import { fakeReq, fakeRes, run } from './helpers.js';

describe('cookies: parseo', () => {
  it('lee varias cookies, decodifica y la primera gana', () => {
    const c = parseCookies('a=1; b=hola%20mundo; a=2; c="x"');
    assert.equal(c.a, '1');
    assert.equal(c.b, 'hola mundo');
    assert.equal(c.c, 'x');
  });
  it('ignora basura y valores mal codificados; no usa prototipo', () => {
    const c = parseCookies('=sin-nombre; solo; bad=%E0%A4%A; ok=1');
    assert.equal(c.ok, '1');
    assert.equal(c.bad, undefined);
    assert.equal(Object.getPrototypeOf(c), null);
    assert.deepEqual(Object.keys(parseCookies(undefined)), []);
  });
});

describe('cookies: atributos de seguridad', () => {
  it('HttpOnly + SameSite=Strict por defecto', () => {
    const c = serializeCookie('s', 'v', { maxAgeSec: 3600 });
    assert.match(c, /HttpOnly/);
    assert.match(c, /SameSite=Strict/);
    assert.match(c, /Max-Age=3600/);
    assert.match(c, /Path=\//);
  });
  it('Secure cuando se pide', () => assert.match(serializeCookie('s', 'v', { secure: true }), /; Secure/));
  it('__Host- exige Secure, Path=/ y sin Domain', () => {
    assert.throws(() => serializeCookie('__Host-s', 'v', { secure: false }));
    assert.throws(() => serializeCookie('__Host-s', 'v', { secure: true, domain: 'x.com' }));
    assert.throws(() => serializeCookie('__Host-s', 'v', { secure: true, path: '/api' }));
    assert.match(serializeCookie('__Host-s', 'v', { secure: true }), /^__Host-s=v/);
  });
  it('SameSite=None exige Secure; valores inválidos fallan', () => {
    assert.throws(() => serializeCookie('s', 'v', { sameSite: 'None' }));
    assert.throws(() => serializeCookie('s', 'v', { sameSite: 'Cualquiera' }));
  });
  it('rechaza nombres inválidos (inyección de cabeceras)', () => {
    assert.throws(() => serializeCookie('a b', 'v'));
    assert.throws(() => serializeCookie('a;b', 'v'));
    assert.throws(() => serializeCookie('a\r\nSet-Cookie: x', 'v'));
  });
  it('codifica el valor (no permite romper la cabecera)', () => {
    const c = serializeCookie('s', 'v; Domain=evil.com\r\nX: y');
    assert.ok(!/[\r\n]/.test(c));
    assert.ok(!c.includes('; Domain=evil'));
  });
  it('clearCookieHeader expira la cookie', () => {
    const c = clearCookieHeader('s', { secure: true });
    assert.match(c, /Max-Age=0/);
    assert.match(c, /1970/);
  });
  it('usa el prefijo __Host- solo en producción', () => {
    assert.equal(cookieNames(false).professional, 'aimotion_pro');
    assert.equal(cookieNames(true).patient, '__Host-aimotion_pat');
  });
  it('appendSetCookie no pisa cookies existentes', () => {
    const res = fakeRes();
    appendSetCookie(res, 'a=1');
    appendSetCookie(res, 'b=2');
    assert.deepEqual(res.getHeader('Set-Cookie'), ['a=1', 'b=2']);
  });
});

describe('cookies: protección CSRF', () => {
  const names = cookieNames(false);
  const secret = 'secreto-de-prueba-solo-para-tests-1234567890'; // secrets:ignore (dato de prueba falso)
  const origins = ['http://localhost:5173'];
  const cookieHeader = `${names.patient}=tok123`;
  const mw = csrfProtection({ secret, names, allowedOrigins: origins, tokenExempt: (r) => r.originalUrl === '/api/auth/login' });
  const goodToken = csrfTokenFor(secret, { [names.patient]: 'tok123' }, names);

  it('el token es determinista, depende de la sesión y del secreto', () => {
    assert.equal(goodToken, csrfTokenFor(secret, { [names.patient]: 'tok123' }, names));
    assert.notEqual(goodToken, csrfTokenFor(secret, { [names.patient]: 'otra' }, names));
    assert.notEqual(goodToken, csrfTokenFor('otro-secreto-distinto', { [names.patient]: 'tok123' }, names));
  });
  it('GET/HEAD/OPTIONS pasan sin token', async () => {
    for (const method of ['GET', 'HEAD', 'OPTIONS']) assert.equal((await run(mw, fakeReq({ method, headers: { cookie: cookieHeader } }))).next, true);
  });
  it('sin cookie de sesión no hay nada que proteger (peticiones anónimas)', async () => {
    assert.equal((await run(mw, fakeReq({ method: 'POST' }))).next, true);
  });
  it('POST con sesión y SIN token → 403', async () => {
    const { res, next } = await run(mw, fakeReq({ method: 'POST', headers: { cookie: cookieHeader, origin: origins[0] } }));
    assert.equal(next, false);
    assert.equal(res.statusCode, 403);
  });
  it('POST con token incorrecto → 403', async () => {
    const r = await run(mw, fakeReq({ method: 'PATCH', headers: { cookie: cookieHeader, origin: origins[0], 'x-csrf-token': 'x'.repeat(64) } }));
    assert.equal(r.res.statusCode, 403);
  });
  it('POST con token correcto y origen permitido → pasa', async () => {
    const r = await run(mw, fakeReq({ method: 'POST', headers: { cookie: cookieHeader, origin: origins[0], 'x-csrf-token': goodToken } }));
    assert.equal(r.next, true);
  });
  it('origen no permitido → 403 aunque el token sea correcto', async () => {
    const r = await run(mw, fakeReq({ method: 'POST', headers: { cookie: cookieHeader, origin: 'https://evil.example', 'x-csrf-token': goodToken } }));
    assert.equal(r.res.statusCode, 403);
  });
  it('sin Origin pero con Sec-Fetch-Site: cross-site → 403', async () => {
    const r = await run(mw, fakeReq({ method: 'POST', headers: { cookie: cookieHeader, 'sec-fetch-site': 'cross-site', 'x-csrf-token': goodToken } }));
    assert.equal(r.res.statusCode, 403);
  });
  it('rutas exentas de token (login) siguen verificando el origen', async () => {
    const ok = await run(mw, fakeReq({ method: 'POST', originalUrl: '/api/auth/login', headers: { cookie: cookieHeader, origin: origins[0] } }));
    assert.equal(ok.next, true);
    const bad = await run(mw, fakeReq({ method: 'POST', originalUrl: '/api/auth/login', headers: { cookie: cookieHeader, origin: 'https://evil.example' } }));
    assert.equal(bad.res.statusCode, 403);
  });
});
