import 'dotenv/config';
import { createServer } from 'node:http';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { Server } from 'socket.io';
import { loadConfig } from './src/config.js';
import { createApp } from './src/app.js';
import { createDb } from './src/db/db.js';
import { createRepos } from './src/db/repos.js';
import { createCipherBoxFromEnv } from './src/security/crypto.js';
import { createDbMonitor } from './src/security/dbMonitor.js';
import { createLoginGuard } from './src/security/rateLimit.js';
import { createLimiters } from './src/security/limiters.js';
import { parseCookies } from './src/security/cookies.js';
import { createPasswordHasher } from './src/auth/hash.js';
import { createTokenService } from './src/auth/tokens.js';
import { createEmailService } from './src/services/emailService.js';
import { createProfessionalSmsService } from './src/services/smsService.js';
import { createContactSmsService } from './src/services/contactSmsService.js';
import { setIo, emitToProfessionals } from './src/realtime.js';

// 1. Configuracion: el servidor NO arranca con secretos debiles o configuracion insegura.
const { config, errors, warnings } = loadConfig(process.env);
if (errors.length) {
  console.error('\nConfiguración insegura o incompleta. Corrige lo siguiente y vuelve a iniciar:\n');
  errors.forEach((e) => console.error(`  ✖ ${e}`));
  console.error('\nAyuda: copia .env.example a .env y ejecuta "npm run generate-keys".\n');
  process.exit(1);
}
warnings.forEach((w) => console.warn(`  ⚠ ${w}`));

// 2. Dependencias
const cipher = createCipherBoxFromEnv(process.env);
const monitor = createDbMonitor({ slowMs: config.slowQueryMs });
const db = createDb({ connectionString: config.databaseUrl, ssl: config.dbSsl, monitor });
const rls = await db.detectRls();
const repos = createRepos({ db, cipher });
const tokens = createTokenService({ jwt, secret: config.jwtSecret });
const hasher = createPasswordHasher({ bcrypt, cost: config.bcryptCost });
const services = {
  email: createEmailService({ smtp: config.smtp }),
  proSms: createProfessionalSmsService({ twilioConfig: config.twilio }),
  contactSms: createContactSmsService({ gateway: config.smsGateway }),
};
const limiters = createLimiters();
const loginGuard = createLoginGuard();

const app = createApp({ config, repos, db, tokens, hasher, services, limiters, loginGuard, realtime: { emit: emitToProfessionals } });

// 3. WebSockets: misma sesion (cookie HttpOnly), origen verificado (evita secuestro de WebSocket entre sitios)
const httpServer = createServer(app);
const io = new Server(httpServer, {
  serveClient: false,
  cors: { origin: config.corsOrigins, credentials: true },
  maxHttpBufferSize: 1e4,
});
io.use((socket, next) => {
  const origin = socket.handshake.headers.origin;
  if (origin && !config.corsOrigins.includes(origin)) return next(new Error('unauthorized'));
  const cookies = parseCookies(socket.handshake.headers.cookie);
  const payload = tokens.verify(cookies[config.cookies.names.professional], 'professional');
  if (!payload) return next(new Error('unauthorized'));
  socket.professional = { id: payload.sub, name: payload.name, role: payload.role };
  return next();
});
io.on('connection', (socket) => {
  socket.join('professionals');
  socket.on('disconnect', () => {});
});
setIo(io);

httpServer.listen(config.port, () => {
  console.log(`AIMotion server escuchando en el puerto ${config.port} (${config.env})`);
  console.log(`  HTTPS forzado: ${config.forceHttps ? 'sí' : 'no'} · cookies Secure: ${config.cookies.secure ? 'sí' : 'no'} · RLS en la BD: ${rls ? 'activo' : 'NO activo (npm run migrate:rls)'}`);
  console.log(`  Email: ${services.email.configured() ? 'configurado' : 'no'} · SMS al contacto: ${services.contactSms.configured() ? 'configurado' : 'no'}`);
});

// 4. Cierre ordenado
for (const sig of ['SIGTERM', 'SIGINT']) {
  process.on(sig, () => {
    console.log(`\n${sig} recibido: cerrando...`);
    io.close();
    httpServer.close(async () => {
      await db.close();
      process.exit(0);
    });
    setTimeout(() => process.exit(1), 10_000).unref();
  });
}
process.on('unhandledRejection', (err) => console.error('[unhandledRejection]', err?.message));
