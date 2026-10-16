import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { rejectUploads, requireJson } from '../src/security/uploads.js';
import { parsePagination, setPaginationHeaders } from '../src/security/pagination.js';
import { fakeReq, fakeRes, run } from './helpers.js';

describe('uploads: la API no acepta archivos', () => {
  it('rechaza multipart y binarios con 415', async () => {
    for (const ct of ['multipart/form-data; boundary=x', 'MULTIPART/FORM-DATA', 'application/octet-stream']) {
      const { res, next } = await run(rejectUploads, fakeReq({ method: 'POST', headers: { 'content-type': ct } }));
      assert.equal(next, false, ct);
      assert.equal(res.statusCode, 415);
    }
  });
  it('permite JSON y peticiones sin cuerpo', async () => {
    assert.equal((await run(rejectUploads, fakeReq({ method: 'POST', headers: { 'content-type': 'application/json' } }))).next, true);
    assert.equal((await run(rejectUploads, fakeReq({ method: 'GET' }))).next, true);
  });
  it('requireJson: un POST con cuerpo y otro Content-Type → 415', async () => {
    const r = await run(requireJson, fakeReq({ method: 'POST', headers: { 'content-type': 'text/plain', 'content-length': '10' } }));
    assert.equal(r.res.statusCode, 415);
    const r2 = await run(requireJson, fakeReq({ method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded', 'content-length': '10' } }));
    assert.equal(r2.res.statusCode, 415);
  });
  it('requireJson: JSON, GET y POST sin cuerpo pasan', async () => {
    assert.equal((await run(requireJson, fakeReq({ method: 'POST', headers: { 'content-type': 'application/json; charset=utf-8', 'content-length': '10' } }))).next, true);
    assert.equal((await run(requireJson, fakeReq({ method: 'GET', headers: { 'content-type': 'text/plain' } }))).next, true);
    assert.equal((await run(requireJson, fakeReq({ method: 'POST', headers: {} }))).next, true);
  });
});

describe('pagination: límites de respuesta', () => {
  it('valores por defecto', () => {
    const p = parsePagination({});
    assert.equal(p.ok, true);
    assert.equal(p.limit, 50);
    assert.equal(p.offset, 0);
  });
  it('acota limit al máximo', () => {
    assert.equal(parsePagination({ limit: '100000' }).limit, 100);
    assert.equal(parsePagination({ limit: '20' }, { maxLimit: 30 }).limit, 20);
    assert.equal(parsePagination({ limit: '999' }, { maxLimit: 30 }).limit, 30);
  });
  it('rechaza valores inválidos (negativos, decimales, texto, inyecciones)', () => {
    for (const q of [{ limit: '0' }, { limit: '-5' }, { limit: '1.5' }, { limit: 'abc' }, { offset: '-1' }, { limit: '1; DROP TABLE x' }, { offset: 'NaN' }]) {
      assert.equal(parsePagination(q).ok, false, JSON.stringify(q));
    }
  });
  it('acota el offset', () => assert.equal(parsePagination({ offset: '99999999999' }).offset, 1_000_000));
  it('informa si hay más resultados', () => {
    const res = fakeRes();
    setPaginationHeaders(res, { limit: 50, offset: 0, returned: 50 });
    assert.equal(res.headers['x-has-more'], 'true');
    setPaginationHeaders(res, { limit: 50, offset: 0, returned: 10 });
    assert.equal(res.headers['x-has-more'], 'false');
  });
});
