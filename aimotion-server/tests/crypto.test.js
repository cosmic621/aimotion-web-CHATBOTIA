import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { createCipherBox, createCipherBoxFromEnv, parseKey, generateKey, safeEqual } from '../src/security/crypto.js';

const key = () => crypto.randomBytes(32);
const box = () => createCipherBox({ keys: { k1: key() }, currentKeyId: 'k1' });

describe('crypto: AES-256-GCM', () => {
  it('cifra y descifra (ida y vuelta), incluyendo tildes, emojis y texto largo', () => {
    const b = box();
    for (const text of ['hola', 'Estoy muy triste 😢 ñandú', 'x'.repeat(10000), '']) {
      const enc = b.encrypt(text, 'chat_messages.content');
      assert.ok(b.isEncrypted(enc));
      assert.equal(b.decrypt(enc, 'chat_messages.content'), text);
    }
  });
  it('el texto cifrado no contiene el texto original', () => {
    const b = box();
    assert.ok(!b.encrypt('mensaje-secreto-123', 'a').includes('mensaje-secreto-123'));
  });
  it('cada cifrado usa un IV distinto', () => {
    const b = box();
    assert.notEqual(b.encrypt('igual', 'a'), b.encrypt('igual', 'a'));
  });
  it('detecta manipulación del dato cifrado', () => {
    const b = box();
    const parts = b.encrypt('hola', 'a').split(':');
    const last = parts[4];
    parts[4] = (last[0] === 'A' ? 'B' : 'A') + last.slice(1);
    assert.throws(() => b.decrypt(parts.join(':'), 'a'), /No se pudo descifrar/);
  });
  it('el contexto (AAD) queda ligado: no se puede mover a otra columna', () => {
    const b = box();
    const enc = b.encrypt('dato', 'chat_messages.content');
    assert.throws(() => b.decrypt(enc, 'alerts.excerpt'), /No se pudo descifrar/);
  });
  it('una clave distinta no puede descifrar', () => {
    const enc = box().encrypt('dato', 'a');
    assert.throws(() => box().decrypt(enc, 'a'));
  });
  it('datos antiguos en texto plano se devuelven tal cual (migración gradual)', () => {
    const b = box();
    assert.equal(b.decrypt('mensaje viejo', 'a'), 'mensaje viejo');
    assert.equal(b.isEncrypted('mensaje viejo'), false);
    assert.equal(b.isEncrypted('enc:solo:tres'), false);
  });
  it('null y undefined pasan sin cambios', () => {
    const b = box();
    assert.equal(b.encrypt(null, 'a'), null);
    assert.equal(b.decrypt(undefined, 'a'), undefined);
  });
  it('rotación de claves: la clave anterior sigue descifrando lo viejo', () => {
    const k0 = key();
    const k1 = key();
    const oldBox = createCipherBox({ keys: { k0 }, currentKeyId: 'k0' });
    const enc = oldBox.encrypt('antiguo', 'a');
    const newBox = createCipherBox({ keys: { k1, k0 }, currentKeyId: 'k1' });
    assert.equal(newBox.decrypt(enc, 'a'), 'antiguo');
    assert.ok(newBox.encrypt('nuevo', 'a').startsWith('enc:k1:'));
  });
  it('clave desconocida produce un error claro', () => {
    const enc = createCipherBox({ keys: { zz: key() }, currentKeyId: 'zz' }).encrypt('x', 'a');
    assert.throws(() => box().decrypt(enc, 'a'), /desconocida/);
  });
  it('JSON: ida y vuelta y compatibilidad con JSON antiguo sin cifrar', () => {
    const b = box();
    const stored = b.encryptJson([1, 2, { a: 'ñ' }], 'screenings.answers');
    assert.equal(typeof stored.enc, 'string');
    assert.deepEqual(b.decryptJson(stored, 'screenings.answers'), [1, 2, { a: 'ñ' }]);
    assert.deepEqual(b.decryptJson([3, 2, 1], 'screenings.answers'), [3, 2, 1]);
  });
});

describe('crypto: claves', () => {
  it('parseKey acepta 64 hex o 32 bytes en base64 y rechaza lo demás', () => {
    assert.equal(parseKey(generateKey()).length, 32);
    assert.equal(parseKey(crypto.randomBytes(32).toString('base64')).length, 32);
    for (const bad of ['', 'corta', 'zz'.repeat(32), '00'.repeat(31)]) assert.throws(() => parseKey(bad), /32 bytes/);
  });
  it('createCipherBox valida identificadores y tamaño de clave', () => {
    assert.throws(() => createCipherBox({ keys: { 'k 1': key() }, currentKeyId: 'k 1' }));
    assert.throws(() => createCipherBox({ keys: { k1: Buffer.alloc(16) }, currentKeyId: 'k1' }));
    assert.throws(() => createCipherBox({ keys: {}, currentKeyId: 'k1' }));
  });
  it('createCipherBoxFromEnv exige la clave y soporta la clave anterior', () => {
    assert.throws(() => createCipherBoxFromEnv({}), /DATA_ENCRYPTION_KEY/);
    const env = { DATA_ENCRYPTION_KEY: generateKey(), DATA_ENCRYPTION_KEY_OLD: generateKey() };
    const b = createCipherBoxFromEnv(env);
    assert.equal(b.decrypt(b.encrypt('x', 'a'), 'a'), 'x');
  });
  it('safeEqual compara en tiempo constante y respeta longitudes', () => {
    assert.equal(safeEqual('abc', 'abc'), true);
    assert.equal(safeEqual('abc', 'abd'), false);
    assert.equal(safeEqual('abc', 'abcd'), false);
  });
});
