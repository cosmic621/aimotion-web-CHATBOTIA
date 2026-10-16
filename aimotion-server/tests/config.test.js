import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { loadConfig, redactConfig } from '../src/config.js';
import { createLimiters } from '../src/security/limiters.js';
import { generateKey } from '../src/security/crypto.js';

const JWT = 'q7Zr3Lm9Xv2Kp8Tn4Hw6Yb1Jc5Gd0FsR8';
const base = () => ({ DATABASE_URL: 'postgresql://aimotion_app:Xk29dLq8@db.interno:5432/aimotion', JWT_SECRET: JWT, DATA_ENCRYPTION_KEY: generateKey() }); // secrets:ignore (dato de prueba falso)
const prod = () => ({ ...base(), NODE_ENV: 'production', CORS_ORIGIN: 'https://app.aimotion.co', TRUST_PROXY: '1' });

describe('config: loadConfig', () => {
  it('desarrollo: HTTP permitido, cookies sin Secure y sin prefijo __Host-', () => {
    const { config, errors } = loadConfig(base());
    assert.deepEqual(errors, []);
    assert.equal(config.forceHttps, false);
    assert.equal(config.cookies.secure, false);
    assert.equal(config.cookies.names.professional, 'aimotion_pro');
    assert.equal(config.cookies.sameSite, 'Strict');
  });
  it('producción: HTTPS forzado, cookies Secure y prefijo __Host- automáticamente', () => {
    const { config, errors } = loadConfig(prod());
    assert.deepEqual(errors, []);
    assert.equal(config.forceHttps, true);
    assert.equal(config.cookies.secure, true);
    assert.equal(config.cookies.names.patient, '__Host-aimotion_pat');
    assert.equal(config.trustProxy, 1);
  });
  it('producción no puede desactivar HTTPS', () => {
    assert.ok(loadConfig({ ...prod(), FORCE_HTTPS: 'false' }).errors.length > 0);
  });
  it('el secreto CSRF es distinto del JWT_SECRET (derivado)', () => {
    const { config } = loadConfig(base());
    assert.notEqual(config.csrfSecret, JWT);
    assert.equal(config.csrfSecret.length, 64);
    assert.equal(config.csrfSecret, loadConfig(base()).config.csrfSecret);
  });
  it('bcrypt: costo mínimo 12 aunque pidan menos', () => {
    assert.equal(loadConfig({ ...base(), BCRYPT_COST: '4' }).config.bcryptCost, 12);
    assert.equal(loadConfig({ ...base(), BCRYPT_COST: '14' }).config.bcryptCost, 14);
  });
  it('SameSite solo acepta Strict o Lax (nunca None)', () => {
    assert.equal(loadConfig({ ...base(), COOKIE_SAMESITE: 'None' }).config.cookies.sameSite, 'Strict');
    assert.equal(loadConfig({ ...base(), COOKIE_SAMESITE: 'Lax' }).config.cookies.sameSite, 'Lax');
  });
  it('TLS hacia la base de datos valida el certificado por defecto', () => {
    assert.deepEqual(loadConfig({ ...base(), DB_SSL: 'true' }).config.dbSsl, { rejectUnauthorized: true });
    assert.equal(loadConfig(base()).config.dbSsl, undefined);
  });
  it('sin secretos no hay configuración válida', () => {
    assert.ok(loadConfig({}).errors.length >= 3);
  });
  it('redactConfig nunca incluye secretos', () => {
    const env = { ...base(), SMTP_PASS: 'clave-smtp-muy-secreta-123', SMS_GATEWAY_PASS: 'clave-sms-secreta-456', TURNSTILE_SECRET: 'turnstile-secreto-789' }; // secrets:ignore (dato de prueba falso)
    const dump = JSON.stringify(redactConfig(loadConfig(env).config));
    for (const secret of [JWT, env.DATA_ENCRYPTION_KEY, 'clave-smtp-muy-secreta-123', 'clave-sms-secreta-456', 'turnstile-secreto-789', 'Xk29dLq8']) {
      assert.ok(!dump.includes(secret), `se filtró ${secret.slice(0, 6)}…`);
    }
  });
});

describe('limiters', () => {
  it('define un limitador por cada superficie sensible con nombres distintos', () => {
    const l = createLimiters();
    assert.deepEqual(Object.keys(l).sort(), ['alerts', 'chat', 'global', 'login', 'register', 'screenings']);
    assert.equal(new Set(Object.values(l).map((x) => x.stats().name)).size, 6);
    Object.values(l).forEach((x) => x.stop());
  });
  it('registro es el más estricto (5 por hora)', async () => {
    const l = createLimiters();
    let blocked = 0;
    for (let i = 0; i < 7; i++) {
      let nextCalled = false;
      const res = { headers: {}, setHeader(k, v) { this.headers[k] = v; }, status(c) { this.code = c; return this; }, json() { blocked++; } };
      l.register({ ip: '1.1.1.1' }, res, () => { nextCalled = true; });
      if (!nextCalled && res.code !== 429) assert.fail('debió llamar next o responder 429');
    }
    assert.equal(blocked, 2);
    Object.values(l).forEach((x) => x.stop());
  });
});
