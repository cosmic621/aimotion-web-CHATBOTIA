import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createDbMonitor } from '../src/security/dbMonitor.js';

function mk(opts = {}) {
  let t = 0;
  const logs = [];
  const mon = createDbMonitor({ slowMs: 100, logger: { warn: (m) => logs.push(m) }, now: () => t, ...opts });
  const advance = (ms) => { t += ms; };
  return { mon, logs, advance };
}

describe('dbMonitor: monitoreo de consultas', () => {
  it('cuenta consultas y mide tiempos', async () => {
    const { mon, advance } = mk();
    await mon.track('SELECT 1', async () => { advance(10); });
    await mon.track('SELECT 1', async () => { advance(30); });
    const s = mon.snapshot();
    assert.equal(s.total, 2);
    assert.equal(s.avgMs, 20);
    assert.equal(s.maxMs, 30);
    assert.equal(s.errors, 0);
  });
  it('detecta y registra consultas lentas', async () => {
    const { mon, logs, advance } = mk();
    await mon.track('SELECT * FROM chat_messages', async () => { advance(250); });
    const s = mon.snapshot();
    assert.equal(s.slow, 1);
    assert.equal(s.recentSlow[0].ms, 250);
    assert.equal(logs.length, 1);
    assert.match(logs[0], /lenta/);
  });
  it('cuenta errores y vuelve a lanzarlos', async () => {
    const { mon } = mk();
    await assert.rejects(() => mon.track('SELECT x', async () => { throw new Error('falló'); }), /falló/);
    assert.equal(mon.snapshot().errors, 1);
  });
  it('devuelve el valor de la consulta', async () => {
    const { mon } = mk();
    assert.deepEqual(await mon.track('SELECT 1', async () => ({ rows: [1] })), { rows: [1] });
  });
  it('solo guarda la plantilla SQL, nunca los parámetros (no filtra datos sensibles)', async () => {
    const { mon, logs, advance } = mk();
    const sql = 'SELECT * FROM users WHERE email = $1';
    await mon.track(sql, async () => { advance(500); });
    const dump = JSON.stringify(mon.snapshot()) + logs.join('');
    assert.ok(dump.includes('$1'));
    assert.ok(!dump.includes('ana@correo.com'));
  });
  it('normaliza espacios y agrupa por consulta, ordenando por tiempo total', async () => {
    const { mon, advance } = mk();
    await mon.track('SELECT   a\n FROM t', async () => { advance(5); });
    await mon.track('SELECT a FROM t', async () => { advance(5); });
    await mon.track('SELECT b FROM t', async () => { advance(500); });
    const top = mon.snapshot().topByTotalTime;
    assert.equal(top[0].sql, 'SELECT b FROM t');
    assert.equal(top.find((q) => q.sql === 'SELECT a FROM t').calls, 2);
  });
  it('acota la memoria de consultas lentas', async () => {
    const { mon, advance } = mk({ maxSlow: 3 });
    for (let i = 0; i < 10; i++) await mon.track(`SELECT ${i}`, async () => { advance(200); });
    assert.equal(mon.snapshot().recentSlow.length, 3);
  });
});
