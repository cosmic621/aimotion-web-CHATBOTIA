import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { v, parse, idSchema, validate } from '../src/security/validate.js';
import { fakeReq, fakeRes, run } from './helpers.js';

describe('validate: objetos estrictos (bloqueo de manipulación de campos)', () => {
  const schema = v.object({ name: v.string({ min: 1, max: 20, label: 'El nombre' }) });

  it('rechaza campos no declarados (mass assignment: role, userId, status...)', () => {
    const r = parse(schema, { name: 'Ana', role: 'ADMIN' });
    assert.equal(r.ok, false);
    assert.match(r.errors[0].message, /role/);
  });
  it('acepta solo lo declarado y devuelve un objeto limpio', () => {
    const r = parse(schema, { name: '  Ana  ' });
    assert.deepEqual(r.value, { name: 'Ana' });
  });
  it('rechaza __proto__ / constructor / prototype (prototype pollution)', () => {
    for (const body of ['{"__proto__":{"admin":true},"name":"a"}', '{"constructor":{"x":1},"name":"a"}', '{"prototype":1,"name":"a"}']) {
      assert.equal(parse(schema, JSON.parse(body)).ok, false);
    }
    assert.equal({}.admin, undefined);
  });
  it('rechaza arrays y primitivos donde se espera un objeto', () => {
    assert.equal(parse(schema, []).ok, false);
    assert.equal(parse(schema, 'x').ok, false);
    assert.equal(parse(schema, null).ok, false);
  });
});

describe('validate: tipos y limpieza', () => {
  it('no hace coerción: "5" no es entero', () => {
    assert.equal(v.int().run('5').ok, false);
    assert.equal(v.int().run(5).ok, true);
    assert.equal(v.int().run(5.5).ok, false);
    assert.equal(v.number().run(NaN).ok, false);
    assert.equal(v.number().run(Infinity).ok, false);
  });
  it('int respeta min y max', () => {
    const s = v.int({ min: 1, max: 12 });
    assert.equal(s.run(0).ok, false);
    assert.equal(s.run(13).ok, false);
    assert.equal(s.run(12).ok, true);
  });
  it('strings: quita control/invisibles, recorta y limita longitud', () => {
    const s = v.string({ min: 1, max: 5 });
    assert.equal(s.run('  ho\u0000la\u200B ').value, 'hola');
    assert.equal(s.run('abcdefg').ok, false);
    assert.equal(s.run('   ').ok, false);
    assert.equal(s.run(123).ok, false);
  });
  it('strings: patrón', () => {
    const s = v.string({ pattern: /^\d+$/ });
    assert.equal(s.run('123').ok, true);
    assert.equal(s.run('12a').ok, false);
  });
  it('email: normaliza a minúsculas y valida formato', () => {
    assert.equal(v.email().run('  ANA@Correo.COM ').value, 'ana@correo.com');
    for (const bad of ['ana', 'ana@', '@x.com', 'a b@x.com', 'a@x', 'a@@x.com']) assert.equal(v.email().run(bad).ok, false, bad);
    assert.equal(v.email().run('a'.repeat(250) + '@x.com').ok, false);
  });
  it('boolean, literal y enum', () => {
    assert.equal(v.boolean().run('true').ok, false);
    assert.equal(v.literal(true, { message: 'Debes aceptar' }).run(false).errors[0].message, 'Debes aceptar');
    assert.equal(v.enum(['a', 'b']).run('c').ok, false);
    assert.equal(v.enum(['a', 'b']).run('a').ok, true);
  });
  it('array: límites, elementos validados y rutas de error', () => {
    const s = v.array(v.int({ min: 0, max: 3 }), { min: 2, max: 3 });
    assert.equal(s.run([1]).ok, false);
    assert.equal(s.run([1, 2, 3, 3]).ok, false);
    const r = s.run([1, 9]);
    assert.equal(r.ok, false);
    assert.equal(r.errors[0].path, '[1]');
  });
  it('optional, nullable y default', () => {
    assert.equal(v.string().optional().run(undefined).ok, true);
    assert.equal(v.string().run(undefined).ok, false);
    assert.equal(v.string().run(null).ok, false);
    assert.equal(v.string().nullable().run(null).value, null);
    assert.equal(v.string().withDefault('chat').run(undefined).value, 'chat');
  });
  it('idSchema rechaza traversal e inyección, acepta ids de nanoid', () => {
    for (const bad of ['../etc/passwd', "a'; DROP TABLE users;--", 'a b', '', 'x'.repeat(65), '<script>']) assert.equal(idSchema('Id').run(bad).ok, false, bad);
    assert.equal(idSchema('Id').run('Ae5tWJJIvt').ok, true);
    assert.equal(idSchema('Id').run('a_b-C9').ok, true);
  });
});

describe('validate: middleware', () => {
  const schemas = { body: v.object({ n: v.int({ min: 1 }) }), query: v.object({ page: v.int().optional() }) };
  it('deja el resultado limpio en req.valid y llama next()', async () => {
    const req = fakeReq({ body: { n: 2 }, query: {} });
    const { next } = await run(validate(schemas), req);
    assert.equal(next, true);
    assert.deepEqual(req.valid.body, { n: 2 });
  });
  it('responde 400 con mensaje claro si algo no cumple', async () => {
    const { res, next } = await run(validate(schemas), fakeReq({ body: { n: 0 }, query: {} }));
    assert.equal(next, false);
    assert.equal(res.statusCode, 400);
    assert.ok(res.body.error);
  });
  it('rechaza campos extra en el body y en el query', async () => {
    assert.equal((await run(validate(schemas), fakeReq({ body: { n: 1, admin: true }, query: {} }))).res.statusCode, 400);
    assert.equal((await run(validate(schemas), fakeReq({ body: { n: 1 }, query: { evil: '1' } }))).res.statusCode, 400);
  });
  it('un body ausente se trata como objeto vacío', async () => {
    const { res } = await run(validate({ body: v.object({ a: v.string() }) }), fakeReq({}));
    assert.equal(res.statusCode, 400);
  });
});
