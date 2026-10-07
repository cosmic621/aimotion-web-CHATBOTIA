import express from 'express';
import cors from 'cors';
import { createServer } from 'node:http';
import { Server } from 'socket.io';
import { config, isEmailConfigured, isSmsConfigured } from './src/config.js';
import { authRouter } from './src/routes/auth.js';
import { patientAuthRouter } from './src/routes/patientAuth.js';
import { alertsRouter } from './src/routes/alerts.js';
import { screeningsRouter } from './src/routes/screenings.js';
import { chatRouter } from './src/routes/chat.js';
import { treatmentPlansRouter } from './src/routes/treatmentPlans.js';
import { pool } from './src/db/pool.js';
import { verifyToken } from './src/auth/jwt.js';
import { setIo } from './src/realtime.js';

if (!config.databaseUrl) {
  console.error('DATABASE_URL no esta configurada. Copia .env.example a .env y completa tu conexion a PostgreSQL.');
  process.exit(1);
}
if (!config.jwtSecret) {
  console.error('JWT_SECRET no esta configurada. Define un secreto largo y aleatorio en .env.');
  process.exit(1);
}

const app = express();

app.use(cors({ origin: config.corsOrigin }));
app.use(express.json());

app.get('/api/health', async (_req, res) => {
  let dbConnected = false;
  try {
    await pool.query('SELECT 1');
    dbConnected = true;
  } catch {
    dbConnected = false;
  }
  res.json({
    status: 'ok',
    dbConnected,
    emailConfigured: isEmailConfigured(),
    smsConfigured: isSmsConfigured(),
  });
});

app.use('/api/auth', authRouter);
app.use('/api/patient-auth', patientAuthRouter);
app.use('/api/alerts', alertsRouter);
app.use('/api/screenings', screeningsRouter);
app.use('/api/chat', chatRouter);
app.use('/api/treatment-plans', treatmentPlansRouter);

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: 'Error interno del servidor' });
});

// --- Servidor HTTP + WebSockets (Socket.IO) ---
// El panel profesional se conecta por socket para recibir alertas nuevas
// (y revisiones de otros profesionales) en tiempo real, sin recargar.
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: { origin: config.corsOrigin },
});

// Autenticacion del socket: exige el mismo JWT que usan las rutas HTTP.
// Sin esto, cualquiera podria conectarse y escuchar alertas de riesgo clinico.
io.use((socket, next) => {
  try {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error('unauthorized'));
    const payload = verifyToken(token);
    if (payload.type !== 'professional') return next(new Error('unauthorized'));
    socket.professional = { id: payload.sub, name: payload.name, role: payload.role };
    next();
  } catch {
    next(new Error('unauthorized'));
  }
});

io.on('connection', (socket) => {
  socket.join('professionals');
  console.log(`Panel profesional conectado en vivo: ${socket.professional.name}`);

  socket.on('disconnect', () => {
    console.log(`Panel profesional desconectado: ${socket.professional.name}`);
  });
});

setIo(io);

httpServer.listen(config.port, () => {
  console.log(`AIMotion server escuchando en http://localhost:${config.port}`);
  console.log(`Email configurado: ${isEmailConfigured() ? 'si' : 'no (ver .env.example)'}`);
  console.log(`SMS configurado:   ${isSmsConfigured() ? 'si' : 'no (ver .env.example)'}`);
});
