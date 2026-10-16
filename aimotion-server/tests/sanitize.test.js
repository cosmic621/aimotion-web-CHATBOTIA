import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { stripControlChars, sanitizeText, escapeHtml, safeFirstName, sanitizeForLog } from '../src/security/sanitize.js';

describe('sanitize: contenido del usuario', () => {
  it('quita nulos, control e invisibles/bidi (Postgres rechaza \\u0000)', () => {
    assert.equal(stripControlChars('a\u0000b\u0007c\u200Bd\u202Ee\uFEFFf'), 'abcdef');
  });
  it('conserva saltos de línea y tabulaciones legítimos', () => {
    assert.equal(stripControlChars('a\nb\tc'), 'a\nb\tc');
  });
  it('sanitizeText recorta y limita', () => {
    assert.equal(sanitizeText('  hola  '), 'hola');
    assert.equal(sanitizeText('x'.repeat(50), { max: 10 }).length, 10);
  });
  it('escapeHtml neutraliza etiquetas y comillas', () => {
    const out = escapeHtml('<img src=x onerror="alert(1)">&\'`');
    assert.ok(!out.includes('<') && !out.includes('>') && !out.includes('"'));
    assert.equal(escapeHtml('<b>'), '&lt;b&gt;');
  });
  it('escapeHtml tolera null/undefined', () => {
    assert.equal(escapeHtml(null), '');
    assert.equal(escapeHtml(undefined), '');
  });
});

describe('sanitize: nombre seguro para SMS', () => {
  it('toma solo el primer nombre', () => assert.equal(safeFirstName('Ana María Pérez'), 'Ana'));
  it('soporta tildes y ñ', () => assert.equal(safeFirstName('Ñandú López'), 'Ñandú'));
  it('no deja pasar enlaces, símbolos ni etiquetas', () => {
    for (const evil of ['http://evil.example/x', '<script>alert(1)</script>', 'Ana!!!www.malo.com', '[PHISH]', '😀😀😀']) {
      const out = safeFirstName(evil);
      // Solo letras/guion, o el valor por defecto (que no contiene nada del usuario)
      assert.ok(/^[\p{L}-]+$/u.test(out) || out === 'Una persona cercana', `${evil} -> ${out}`);
      assert.ok(!/[:/.<>\[\]!]/.test(out));
    }
  });
  it('limita a 20 caracteres (un "nombre" más largo se descarta)', () => assert.ok(safeFirstName('A'.repeat(100)).length <= 20));
  it('acepta nombres reales con guion o apóstrofe y descarta los que traen símbolos', () => {
    assert.equal(safeFirstName("O'Brien"), "O'Brien");
    assert.equal(safeFirstName('Ana-Lucía'), 'Ana-Lucía');
    assert.equal(safeFirstName('Ana,'), 'Ana');
    assert.equal(safeFirstName('Ana2024'), 'Una persona cercana');
    assert.equal(safeFirstName('ana.malo.com'), 'Una persona cercana');
  });
  it('usa un valor por defecto si no queda nada útil', () => {
    for (const x of ['', '   ', '1234', '😀', null, undefined, 'A']) assert.equal(safeFirstName(x), 'Una persona cercana');
  });
});

describe('sanitize: logs', () => {
  it('evita inyección de líneas falsas en logs', () => {
    assert.ok(!/[\r\n]/.test(sanitizeForLog('hola\nINFO usuario admin entró\r\n')));
  });
  it('acota la longitud', () => assert.equal(sanitizeForLog('x'.repeat(1000), 50).length, 50));
});
