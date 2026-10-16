import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { checkPassword } from '../src/security/passwordPolicy.js';

describe('passwordPolicy', () => {
  it('acepta una contraseña razonable', () => {
    assert.equal(checkPassword('Mi gato Pelusa toma leche').ok, true);
    assert.equal(checkPassword('c0rrect-h0rse-battery').ok, true);
  });
  it('exige longitud mínima (10 por defecto, configurable)', () => {
    assert.equal(checkPassword('Corta1!').ok, false);
    assert.equal(checkPassword('abcdefghij1', { minLength: 12 }).ok, false);
  });
  it('rechaza el límite de 72 bytes de bcrypt (se ignoraría en silencio)', () => {
    assert.equal(checkPassword('a1'.repeat(40)).ok, false);
    assert.match(checkPassword('Ñ'.repeat(40)).reason, /72/);
  });
  it('rechaza contraseñas comunes aunque cambien mayúsculas o tildes', () => {
    for (const bad of ['password123', 'Contraseña123', '1234567890', 'QWERTYUIOP', 'aimotion123', 'Colombia123']) assert.equal(checkPassword(bad).ok, false, bad);
  });
  it('rechaza repeticiones y secuencias', () => {
    assert.equal(checkPassword('aaaaaaaaaaaa').ok, false);
    assert.equal(checkPassword('abcdefghijkl').ok, false);
    assert.equal(checkPassword('987654321098').ok, false);
  });
  it('rechaza contraseñas derivadas del correo o del nombre', () => {
    assert.equal(checkPassword('anaperez-2024-x', { email: 'anaperez@correo.com' }).ok, false);
    assert.equal(checkPassword('Fernanda!Luna!77', { name: 'Fernanda Ruiz' }).ok, false);
  });
  it('rechaza contraseñas con muy pocos caracteres distintos', () => {
    assert.equal(checkPassword('abababababab').ok, false);
  });
  it('rechaza valores que no son texto', () => {
    assert.equal(checkPassword(undefined).ok, false);
    assert.equal(checkPassword(12345678901234).ok, false);
  });
});
