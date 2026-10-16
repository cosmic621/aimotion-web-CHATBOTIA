// Construccion de la aplicacion Express con TODAS las defensas, en este orden:
//   HTTPS -> cabeceras -> CORS -> limite global -> solo JSON/sin archivos ->
//   cuerpo acotado -> identificar sesion (cookie) -> CSRF -> politica de acceso
//   (deny-by-default) -> rutas (validacion estricta) -> 404 -> errores sin detalles.
import express from 'express';
import cors from 'cors';
import { forceHttps, securityHeaders } from './security/headers.js';
import { rejectUploads, requireJson } from './security/uploads.js';
import { csrfProtection } from './security/cookies.js';
import { createAuthenticator, enforceAccess } from './security/accessPolicy.js';
import { createBotGuard } from './security/botGuard.js';
import { sanitizeForLog } from './security/sanitize.js';
import { redactConfig } from './config.js';
import { createAuditor, createSessionManager } from './routes/helpers.js';
import { createAuthRouter } from './routes/auth.js';
import { createPatientAuthRouter } from './routes/patientAuth.js';
import { createAlertsRouter } from './routes/alerts.js';
import { createScreeningsRouter } from './routes/screenings.js';
import { createChatRouter } from './routes/chat.js';
import { createTreatmentPlansRouter } from './routes/treatmentPlans.js';
import { createAdminRouter } from './routes/admin.js';

// Login/registro/logout: se verifica el ORIGEN pero no se exige el token CSRF
// (aun no hay sesion, o se esta cerrando).
const TOKEN_EXEMPT = new Set([
  'POST /api/auth/login', 'POST /api/auth/logout',
  'POST /api/patient-auth/login', 'POST /api/patient-auth/register', 'POST /api/patient-auth/logout',
]);

export function createApp({ config, repos, db, tokens, hasher, services, limiters, loginGuard, realtime, logger = console }) {
  const app = express();
  app.disable('x-powered-by');
  if (config.trustProxy !== false) app.set('trust proxy', config.trustProxy);

  app.use(forceHttps({ enabled: config.forceHttps, publicHost: config.publicHost }));
  app.use(securityHeaders({ hsts: config.forceHttps }));

  const allowed = new Set(config.corsOrigins);
  app.use(cors({
    origin: (origin, cb) => cb(null, !origin || allowed.has(origin)),
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'X-CSRF-Token'],
    exposedHeaders: ['X-Limit', 'X-Offset', 'X-Has-More', 'Retry-After'],
    maxAge: 600,
  }));

  app.use(limiters.global);
  app.use(rejectUploads);
  app.use(requireJson);
  app.use(express.json({ limit: '32kb', strict: true }));

  const sessions = createSessionManager({ config });
  app.use(createAuthenticator({ verify: tokens.verify, names: sessions.names }));
  app.use(csrfProtection({
    secret: config.csrfSecret,
    names: sessions.names,
    allowedOrigins: config.corsOrigins,
    tokenExempt: (req) => TOKEN_EXEMPT.has(`${req.method} ${String(req.originalUrl).split('?')[0]}`),
  }));
  app.use(enforceAccess());

  const audit = createAuditor({ repos, logger });
  const botGuard = createBotGuard({ turnstileSecret: config.turnstileSecret });

  app.get('/api/health', async (_req, res) => {
    let dbConnected = false;
    try {
      await db.health();
      dbConnected = true;
    } catch {
      dbConnected = false;
    }
    res.json({ status: 'ok', dbConnected }); // sin detalles de infraestructura
  });

  app.use('/api/auth', createAuthRouter({ repos, tokens, hasher, loginGuard, botGuard, loginLimiter: limiters.login, sessions, audit }));
  app.use('/api/patient-auth', createPatientAuthRouter({ repos, tokens, hasher, loginGuard, botGuard, registerLimiter: limiters.register, loginLimiter: limiters.login, sessions }));
  app.use('/api/alerts', createAlertsRouter({ repos, services, realtime, alertLimiter: limiters.alerts, audit }));
  app.use('/api/screenings', createScreeningsRouter({ repos, screeningLimiter: limiters.screenings, audit }));
  app.use('/api/chat', createChatRouter({ repos, chatLimiter: limiters.chat, audit }));
  app.use('/api/treatment-plans', createTreatmentPlansRouter({ repos, audit }));
  app.use('/api/admin', createAdminRouter({ db, limiters, redactedConfig: redactConfig(config) }));

  app.use((_req, res) => res.status(404).json({ error: 'No encontrado' }));

  // Manejo de errores: nunca se devuelven detalles internos (stack, SQL, rutas).
  // eslint-disable-next-line no-unused-vars
  app.use((err, _req, res, _next) => {
    if (res.headersSent) return;
    if (err.type === 'entity.too.large') return res.status(413).json({ error: 'La petición es demasiado grande' });
    if (err.type === 'entity.parse.failed' || err instanceof SyntaxError) return res.status(400).json({ error: 'JSON inválido' });
    if (err.code === '23505') return res.status(409).json({ error: 'Ese registro ya existe' });
    if (err.status && err.status < 500) return res.status(err.status).json({ error: 'Petición inválida' });
    logger.error('[error]', sanitizeForLog(err.message));
    return res.status(500).json({ error: 'Error interno del servidor' });
  });

  return app;
}
