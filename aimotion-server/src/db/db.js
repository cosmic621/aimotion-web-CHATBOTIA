// Acceso a PostgreSQL (items 3, 4, 13): pool con tiempos limite, contexto de
// rol para RLS y monitoreo de consultas.
import pg from 'pg';
import { createDbMonitor } from '../security/dbMonitor.js';

export function createDb({ connectionString, ssl = undefined, max = 10, statementTimeoutMs = 10_000, monitor = createDbMonitor() }) {
  const pool = new pg.Pool({
    connectionString,
    ssl,
    max,
    statement_timeout: statementTimeoutMs, // una consulta descontrolada no puede colgar el servidor
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 5_000,
  });
  pool.on('error', (err) => console.error('[db] error inesperado en el pool:', err.message));

  let rlsActive = false;

  /** Detecta si RLS esta activo en la base (tras `npm run migrate:rls`). */
  async function detectRls() {
    try {
      const { rows } = await pool.query("SELECT relrowsecurity FROM pg_class WHERE oid = 'public.users'::regclass");
      rlsActive = Boolean(rows[0]?.relrowsecurity);
    } catch {
      rlsActive = false;
    }
    return rlsActive;
  }

  /**
   * Ejecuta una consulta. Si RLS esta activo, lo hace dentro de una transaccion
   * con las variables de sesion (app.role, app.user_id, app.session_id) que
   * leen las politicas. set_config(..., true) = valido solo en esa transaccion.
   */
  function query(ctx, text, params) {
    return monitor.track(text, async () => {
      if (!rlsActive) return pool.query(text, params);
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        await client.query("SELECT set_config('app.role', $1, true), set_config('app.user_id', $2, true), set_config('app.session_id', $3, true)", [
          String(ctx?.role || 'none'),
          String(ctx?.userId || ''),
          String(ctx?.sessionId || ''),
        ]);
        const res = await client.query(text, params);
        await client.query('COMMIT');
        return res;
      } catch (err) {
        try {
          await client.query('ROLLBACK');
        } catch {
          /* la conexion ya estaba rota */
        }
        throw err;
      } finally {
        client.release();
      }
    });
  }

  return {
    query,
    detectRls,
    isRlsActive: () => rlsActive,
    health: () => pool.query('SELECT 1'),
    metrics: () => monitor.snapshot(),
    close: () => pool.end(),
    pool,
  };
}
