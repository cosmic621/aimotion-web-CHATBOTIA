import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { validateEnv } from '../src/security/configCheck.js';
import { generateKey } from '../src/security/crypto.js';

const goodJwt = 'q7Zr3Lm9Xv2Kp8Tn4Hw6Yb1Jc5Gd0FsR8';
const base = () => ({
  DATABASE_URL: 'postgresql://aimotion_app:Xk29dLq8@db.interno:5432/aimotion', // secrets:ignore (dato de prueba falso)
  JWT_SECRET: goodJwt,
  DATA_ENCRYPTION_KEY: generateKey(),
  CORS_ORIGIN: 'http://localhost:5173',
});

describe('configCheck: el servidor se niega a arrancar inseguro', () => {
  it('una configuración correcta no tiene errores', () => assert.deepEqual(validateEnv(base()).errors, []));
  it('exige DATABASE_URL, JWT_SECRET y DATA_ENCRYPTION_KEY', () => {
    const { errors } = validateEnv({});
    assert.ok(errors.some((e) => /DATABASE_URL/.test(e)));
    assert.ok(errors.some((e) => /JWT_SECRET/.test(e)));
    assert.ok(errors.some((e) => /DATA_ENCRYPTION_KEY/.test(e)));
  });
  it('rechaza JWT_SECRET corto, de ejemplo o con poca variedad', () => {
    for (const bad of ['corto', 'cambia-este-valor-por-uno-largo-y-aleatorio', 'a'.repeat(40), 'MiSecretoSuperLargoDeEjemplo1234567890']) {
      assert.ok(validateEnv({ ...base(), JWT_SECRET: bad }).errors.some((e) => /JWT_SECRET/.test(e)), bad);
    }
  });
  it('valida el formato de la clave de cifrado y que difiera del JWT', () => {
    assert.ok(validateEnv({ ...base(), DATA_ENCRYPTION_KEY: 'corta' }).errors.some((e) => /DATA_ENCRYPTION_KEY inválida/.test(e)));
    assert.ok(validateEnv({ ...base(), DATA_ENCRYPTION_KEY_OLD: 'mala' }).errors.some((e) => /KEY_OLD/.test(e)));
  });
  it('CORS: nunca "*" (se usan cookies)', () => {
    assert.ok(validateEnv({ ...base(), CORS_ORIGIN: '*' }).errors.some((e) => /CORS_ORIGIN/.test(e)));
  });
  it('producción: exige https, HTTPS forzado y rol sin privilegios', () => {
    const prod = { ...base(), NODE_ENV: 'production', CORS_ORIGIN: 'https://app.aimotion.co', TRUST_PROXY: '1', ADMIN_DATABASE_URL: 'postgresql://owner:Zz9@db:5432/a' }; // secrets:ignore (dato de prueba falso)
    assert.deepEqual(validateEnv(prod).errors, []);
    assert.ok(validateEnv({ ...prod, CORS_ORIGIN: 'http://app.aimotion.co' }).errors.some((e) => /https/.test(e)));
    assert.ok(validateEnv({ ...prod, FORCE_HTTPS: 'false' }).errors.some((e) => /FORCE_HTTPS/.test(e)));
    assert.ok(validateEnv({ ...prod, DATABASE_URL: 'postgresql://postgres:Xk29dLq8@db:5432/a' }).errors.some((e) => /superusuario/.test(e))); // secrets:ignore (dato de prueba falso)
  });
  it('desarrollo con superusuario: solo advertencia', () => {
    const r = validateEnv({ ...base(), DATABASE_URL: 'postgresql://postgres:Xk29dLq8@localhost:5432/a' }); // secrets:ignore (dato de prueba falso)
    assert.deepEqual(r.errors, []);
    assert.ok(r.warnings.some((w) => /superusuario/.test(w)));
  });
});
