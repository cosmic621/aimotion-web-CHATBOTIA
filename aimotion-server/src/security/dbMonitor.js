// Monitoreo de consultas a la base de datos (item 13): tiempos, errores y
// consultas lentas. Solo guarda la plantilla SQL (con $1, $2...), NUNCA los
// parametros, para no filtrar datos sensibles a los logs.

function normalizeSql(sql) {
  return String(sql).replace(/\s+/g, ' ').trim().slice(0, 160);
}

export function createDbMonitor({ slowMs = 200, maxSlow = 50, logger = console, now = () => performance.now() } = {}) {
  const stats = { total: 0, errors: 0, slow: 0, totalMs: 0, maxMs: 0 };
  const slowQueries = [];
  const byQuery = new Map();

  async function track(sql, fn) {
    const start = now();
    let failed = false;
    try {
      return await fn();
    } catch (err) {
      failed = true;
      throw err;
    } finally {
      const ms = now() - start;
      const key = normalizeSql(sql);
      stats.total += 1;
      stats.totalMs += ms;
      stats.maxMs = Math.max(stats.maxMs, ms);
      if (failed) stats.errors += 1;
      const q = byQuery.get(key) || { calls: 0, errors: 0, totalMs: 0, maxMs: 0 };
      q.calls += 1;
      q.totalMs += ms;
      q.maxMs = Math.max(q.maxMs, ms);
      if (failed) q.errors += 1;
      byQuery.set(key, q);
      if (byQuery.size > 500) byQuery.delete(byQuery.keys().next().value);
      if (ms >= slowMs) {
        stats.slow += 1;
        slowQueries.push({ sql: key, ms: Math.round(ms), at: new Date().toISOString() });
        if (slowQueries.length > maxSlow) slowQueries.shift();
        logger.warn?.(`[db] consulta lenta (${Math.round(ms)} ms): ${key}`);
      }
    }
  }

  return {
    track,
    snapshot() {
      const top = [...byQuery.entries()]
        .map(([sql, q]) => ({ sql, ...q, avgMs: Math.round(q.totalMs / q.calls), totalMs: Math.round(q.totalMs), maxMs: Math.round(q.maxMs) }))
        .sort((a, b) => b.totalMs - a.totalMs)
        .slice(0, 10);
      return {
        total: stats.total,
        errors: stats.errors,
        slow: stats.slow,
        avgMs: stats.total ? Math.round(stats.totalMs / stats.total) : 0,
        maxMs: Math.round(stats.maxMs),
        slowThresholdMs: slowMs,
        recentSlow: [...slowQueries],
        topByTotalTime: top,
      };
    },
  };
}
