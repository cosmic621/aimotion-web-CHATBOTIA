import { Router } from 'express';

/** Metricas operativas para ADMIN: consultas a la BD, limitadores, estado de RLS y configuracion (sin secretos). */
export function createAdminRouter({ db, limiters, redactedConfig }) {
  const router = Router();
  router.get('/metrics', (req, res) => {
    res.json({
      uptimeSec: Math.round(process.uptime()),
      rlsActive: db.isRlsActive(),
      db: db.metrics(),
      rateLimiters: Object.values(limiters).map((l) => l.stats?.()).filter(Boolean),
      config: redactedConfig,
    });
  });
  return router;
}
