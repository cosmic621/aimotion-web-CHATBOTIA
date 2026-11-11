// Pruebas de integracion de seguridad: levantan la API REAL (Express) con repositorios
// en memoria y la atacan por HTTP. No necesitan base de datos.
// Se omiten solos si las dependencias (express, cors, jsonwebtoken, nanoid) no estan instaladas.
import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';

let lib = null;
try {
  const [{ createApp }, jwtMod, { loadConfig }, { createTokenService }, { createLimiters }, { createLoginGuard }, { generateKey }] = await Promise.all([
    import('../../src/app.js'), import('jsonwebtoken'), import('../../src/config.js'), import('../../src/auth/tokens.js'),
    import('../../src/security/limiters.js'), import('../../src/security/rateLimit.js'), import('../../src/security/crypto.js'),
  ]);
  lib = { createApp, jwt: jwtMod.default ?? jwtMod, loadConfig, createTokenService, createLimiters, createLoginGuard, generateKey };
} catch {
  lib = null;
}

const ORIGIN = 'http://localhost:5173';
const PRO_PASSWORD = 'Clave-De-Profesional-2026'; // secrets:ignore (dato de prueba falso)
const PATIENT_PASSWORD = 'Una clave bastante larga 2026';

function makeRepos() {
  const users = new Map();
  const pros = new Map([['p1', { id: 'p1', name: 'Ana Ríos', email: 'ana@clinica.test', passwordHash: `h:${PRO_PASSWORD}`, role: 'ADMIN' }]]);
  const alerts = [];
  const plans = [];
  const messages = [];
  const attentions = [];
  const store = { users, pros, alerts, plans, messages, attentions, audit: [] };
  const tableOf = (kind) => (kind === 'usuario' ? users : pros);
  const accountOf = (kind, r) => ({ id: r.id, kind, name: r.name, email: r.email, role: r.role || 'USUARIO', status: r.status || 'activo', createdAt: r.createdAt });
  const repos = {
    professionals: {
      findByEmail: async (_c, e) => [...pros.values()].find((p) => p.email === e) || null,
      findById: async (_c, id) => pros.get(id) || null,
      create: async (_c, p) => { const r = { ...p, status: 'activo', createdAt: new Date() }; pros.set(p.id, r); return r; },
    },
    users: {
      findByEmail: async (_c, e) => [...users.values()].find((u) => u.email === e) || null,
      findById: async (_c, id) => users.get(id) || null,
      create: async (_c, { id, name, email, passwordHash, contact, role }) => {
        const u = { id, name, email, passwordHash, role: role || 'USUARIO', status: 'activo', createdAt: new Date(), emergencyContact: contact ? { ...contact, consentAt: new Date() } : null };
        users.set(id, u);
        return u;
      },
      updateContact: async (_c, id, contact) => Object.assign(users.get(id), { emergencyContact: { ...contact, consentAt: new Date() } }),
    },
    alerts: {
      create: async (_c, a) => {
        const al = { ...a, status: 'pendiente', timestamp: new Date().toISOString(), notifications: { email: { sent: false }, sms: { sent: false }, contactSms: { sent: false } } };
        alerts.push(al);
        return al;
      },
      setNotificationResults: async (_c, id, r) => {
        const a = alerts.find((x) => x.id === id);
        a.notifications.email = { sent: !!r.emailResult?.sent };
        a.notifications.sms = { sent: !!r.smsResult?.sent };
        return a;
      },
      setContactResult: async (_c, id, r) => {
        const a = alerts.find((x) => x.id === id);
        a.notifications.contactSms = { sent: !!r.sent };
        if (r.sent) a.contactNotifiedAt = Date.now();
        return a;
      },
      lastContactNotification: async (_c, uid) => {
        const t = alerts.filter((x) => x.userId === uid && x.contactNotifiedAt).map((x) => x.contactNotifiedAt).sort().pop();
        return t ? new Date(t) : null;
      },
      findById: async (_c, id) => alerts.find((a) => a.id === id) || null,
      list: async (_c, p) => alerts.slice(p.offset, p.offset + p.limit),
      markReviewed: async (_c, id) => Object.assign(alerts.find((a) => a.id === id), { status: 'revisado' }),
    },
    screenings: { create: async (_c, s) => ({ ...s, timestamp: new Date().toISOString() }), list: async () => [] },
    chat: {
      addMessage: async (_c, m) => { messages.push(m); return { id: m.id }; },
      listBySession: async (_c, s) => messages.filter((m) => m.sessionId === s && !m.userId),
      listByUser: async (_c, u) => messages.filter((m) => m.userId === u),
      listActiveUsers: async () => [],
    },
    plans: {
      create: async (_c, p) => { const plan = { ...p, createdAt: new Date() }; plans.push(plan); return plan; },
      listByUser: async (_c, u) => plans.filter((p) => p.userId === u),
      findById: async (_c, id) => plans.find((p) => p.id === id) || null,
      updateWeeks: async (_c, id, weeks) => Object.assign(plans.find((p) => p.id === id), { weeks }),
    },
    staff: {
      listPatients: async () => [...users.values()].filter((u) => (u.role || 'USUARIO') === 'USUARIO').map((u) => ({ id: u.id, name: u.name, email: u.email, status: u.status || 'activo', messageCount: 0, screeningCount: 0, lastActivity: null })),
      findPatient: async (_c, id) => {
        const u = users.get(id);
        return u && (u.role || 'USUARIO') === 'USUARIO' ? { id: u.id, name: u.name, email: u.email, status: u.status || 'activo' } : null;
      },
      screeningsByUser: async () => [],
      recordAttention: async (_c, a) => { attentions.push(a); return { ...a, createdAt: new Date().toISOString() }; },
      attentionsFor: async (_c, staffId, patientId) => attentions.filter((a) => a.staffId === staffId && a.patientId === patientId).map((a) => ({ id: a.id, note: a.note, createdAt: 'x' })),
      listAttended: async (_c, staffId) => {
        const ids = [...new Set(attentions.filter((a) => a.staffId === staffId).map((a) => a.patientId))];
        return ids.map((id) => ({ id, name: users.get(id)?.name, email: users.get(id)?.email, attentionCount: attentions.filter((a) => a.staffId === staffId && a.patientId === id).length, lastAttended: 'x' }));
      },
    },
    accounts: {
      list: async (_c, { kind, q } = {}) => [
        ...[...users.values()].map((r) => accountOf('usuario', r)),
        ...[...pros.values()].map((r) => accountOf('profesional', r)),
      ].filter((a) => (!kind || a.kind === kind) && (!q || `${a.name} ${a.email}`.toLowerCase().includes(String(q).toLowerCase()))),
      get: async (_c, kind, id) => { const r = tableOf(kind).get(id); return r ? accountOf(kind, r) : null; },
      setStatus: async (_c, kind, id, status) => {
        const r = tableOf(kind).get(id);
        if (!r) return null;
        r.status = status;
        if (status === 'suspendido') r.sessionsValidAfter = new Date();
        return accountOf(kind, r);
      },
      setPassword: async (_c, kind, id, hash) => {
        const r = tableOf(kind).get(id);
        if (!r) return null;
        Object.assign(r, { passwordHash: hash, sessionsValidAfter: new Date() });
        return accountOf(kind, r);
      },
      setUserRole: async (_c, id, role) => { const r = users.get(id); if (!r) return null; r.role = role; return accountOf('usuario', r); },
      remove: async (_c, kind, id) => tableOf(kind).delete(id),
      countActiveAdmins: async () => [...pros.values()].filter((p) => p.role === 'ADMIN' && (p.status || 'activo') === 'activo').length,
    },
    audit: { log: async (_c, e) => { store.audit.push(e); } },
  };
  return { repos, store };
}

function request(base, method, path, { body, cookie, csrf, origin = ORIGIN, headers = {}, raw } = {}) {
  return new Promise((resolve, reject) => {
    const payload = raw !== undefined ? raw : body !== undefined ? JSON.stringify(body) : undefined;
    const h = { ...headers };
    if (origin) h.Origin = origin;
    if (cookie) h.Cookie = cookie;
    if (csrf) h['X-CSRF-Token'] = csrf;
    if (payload !== undefined) {
      h['Content-Type'] = h['Content-Type'] || 'application/json';
      h['Content-Length'] = Buffer.byteLength(payload);
    }
    const req = http.request(`${base}${path}`, { method, headers: h }, (res) => {
      let data = '';
      res.on('data', (c) => (data += c));
      res.on('end', () => {
        let json = null;
        try { json = JSON.parse(data); } catch { /* respuesta no JSON */ }
        resolve({ status: res.statusCode, headers: res.headers, json, text: data });
      });
    });
    req.on('error', reject);
    if (payload !== undefined) req.write(payload);
    req.end();
  });
}
const cookieOf = (res) => (res.headers['set-cookie'] || []).map((c) => c.split(';')[0]).join('; ');
const humanForm = () => ({ website: '', formStartedAt: Date.now() - 5000 });

describe('API (integración de seguridad)', { skip: !lib && 'dependencias no instaladas (npm install)' }, () => {
  let server; let base; let store; let contactSent; let contactLocations; let limiters;

  before(async () => {
    const { config } = lib.loadConfig({
      DATABASE_URL: 'postgresql://app:Xk29dLq8@db.interno:5432/aimotion', JWT_SECRET: 'q7Zr3Lm9Xv2Kp8Tn4Hw6Yb1Jc5Gd0FsR8', // secrets:ignore (dato de prueba falso)
      DATA_ENCRYPTION_KEY: lib.generateKey(), CORS_ORIGIN: ORIGIN,
    });
    const made = makeRepos();
    store = made.store;
    contactSent = [];
    contactLocations = [];
    limiters = lib.createLimiters();
    const app = lib.createApp({
      config, repos: made.repos,
      db: { health: async () => ({}), isRlsActive: () => false, metrics: () => ({}) },
      tokens: lib.createTokenService({ jwt: lib.jwt, secret: config.jwtSecret }),
      hasher: { hash: async (p) => `h:${p}`, verify: async (p, h) => Boolean(h) && h === `h:${p}`, needsRehash: () => false },
      services: {
        email: { sendAlert: async () => ({ sent: false }) }, proSms: { sendAlert: async () => ({ sent: false }) },
        contactSms: { send: async (user, opts) => { contactSent.push(user.id); contactLocations.push(opts?.location ?? null); return { sent: true }; } },
      },
      limiters, loginGuard: lib.createLoginGuard(), realtime: { emit: () => {} }, logger: { error: () => {} },
    });
    await new Promise((r) => { server = app.listen(0, '127.0.0.1', r); });
    base = `http://127.0.0.1:${server.address().port}`;
  });
  after(() => { server?.close(); Object.values(limiters || {}).forEach((l) => l.stop()); });

  const loginPro = async (password = PRO_PASSWORD) => request(base, 'POST', '/api/auth/login', { body: { email: 'ana@clinica.test', password, ...humanForm() } });
  const registerPatient = (email, extra = {}) => request(base, 'POST', '/api/patient-auth/register', {
    body: { name: 'Luis Gómez', email, password: PATIENT_PASSWORD, contactName: 'Rosa', contactPhone: '3001234567', contactRelation: 'mamá', contactConsent: true, ...humanForm(), ...extra },
  });

  it('cabeceras de seguridad en cada respuesta y sin X-Powered-By', async () => {
    const r = await request(base, 'GET', '/api/health');
    assert.equal(r.status, 200);
    assert.equal(r.headers['x-content-type-options'], 'nosniff');
    assert.equal(r.headers['x-frame-options'], 'DENY');
    assert.match(r.headers['content-security-policy'], /default-src 'none'/);
    assert.match(r.headers['cache-control'], /no-store/);
    assert.equal(r.headers['x-powered-by'], undefined);
    assert.deepEqual(Object.keys(r.json).sort(), ['dbConnected', 'status']); // sin datos de infraestructura
  });

  it('deny-by-default: ruta desconocida → 403; ruta protegida sin sesión → 401', async () => {
    assert.equal((await request(base, 'GET', '/api/oculta')).status, 403);
    assert.equal((await request(base, 'GET', '/api/alerts')).status, 401);
    assert.equal((await request(base, 'GET', '/api/chat/users')).status, 401);
    assert.equal((await request(base, 'GET', '/api/admin/metrics')).status, 401);
  });

  it('login: cookie HttpOnly + SameSite=Strict; el token NO viaja en el cuerpo', async () => {
    const r = await loginPro();
    assert.equal(r.status, 200);
    const setCookie = r.headers['set-cookie'].join(' ');
    assert.match(setCookie, /aimotion_pro=/);
    assert.match(setCookie, /HttpOnly/);
    assert.match(setCookie, /SameSite=Strict/);
    assert.equal(r.json.token, undefined);
    assert.ok(r.json.csrfToken);
    assert.equal((await request(base, 'GET', '/api/auth/me', { cookie: cookieOf(r) })).status, 200);
  });

  it('CSRF: con cookie pero sin token → 403; con token → pasa; con origen ajeno → 403', async () => {
    const login = await loginPro();
    const cookie = cookieOf(login);
    assert.equal((await request(base, 'PATCH', '/api/alerts/abc/review', { cookie, body: {} })).status, 403);
    assert.notEqual((await request(base, 'PATCH', '/api/alerts/abc/review', { cookie, csrf: login.json.csrfToken, body: {} })).status, 403);
    assert.equal((await request(base, 'PATCH', '/api/alerts/abc/review', { cookie, csrf: login.json.csrfToken, origin: 'https://evil.example', body: {} })).status, 403);
  });

  it('CORS: un origen no autorizado no recibe cabeceras de acceso', async () => {
    const r = await request(base, 'GET', '/api/health', { origin: 'https://evil.example' });
    assert.equal(r.headers['access-control-allow-origin'], undefined);
    const ok = await request(base, 'GET', '/api/health', { origin: ORIGIN });
    assert.equal(ok.headers['access-control-allow-origin'], ORIGIN);
    assert.equal(ok.headers['access-control-allow-credentials'], 'true');
  });

  it('credenciales incorrectas → mensaje genérico (no revela si el correo existe)', async () => {
    const wrongPass = await request(base, 'POST', '/api/auth/login', { body: { email: 'ana@clinica.test', password: 'incorrecta-1234', ...humanForm() } }); // secrets:ignore (dato de prueba falso)
    const noUser = await request(base, 'POST', '/api/auth/login', { body: { email: 'nadie@clinica.test', password: 'incorrecta-1234', ...humanForm() } }); // secrets:ignore (dato de prueba falso)
    assert.equal(wrongPass.status, 401);
    assert.equal(noUser.status, 401);
    assert.equal(wrongPass.json.error, noUser.json.error);
  });

  it('fuerza bruta: tras 5 fallos la cuenta se bloquea (429) incluso con la contraseña correcta', async () => {
    const attempt = (pw) => request(base, 'POST', '/api/auth/login', { body: { email: 'brute@clinica.test', password: pw, ...humanForm() } });
    store.pros.set('p2', { id: 'p2', name: 'B', email: 'brute@clinica.test', passwordHash: `h:${PRO_PASSWORD}`, role: 'PSICOLOGO' });
    for (let i = 0; i < 5; i++) assert.equal((await attempt('mala-contrasena-1')).status, 401);
    const blocked = await attempt(PRO_PASSWORD);
    assert.equal(blocked.status, 429);
    assert.ok(Number(blocked.headers['retry-after']) > 0);
  });

  it('anti-bots: honeypot lleno, sin marca de tiempo o envío instantáneo → 400', async () => {
    const base0 = { email: 'ana@clinica.test', password: PRO_PASSWORD };
    assert.equal((await request(base, 'POST', '/api/auth/login', { body: { ...base0, website: 'http://spam', formStartedAt: Date.now() - 5000 } })).status, 400);
    assert.equal((await request(base, 'POST', '/api/auth/login', { body: base0 })).status, 400);
    assert.equal((await request(base, 'POST', '/api/auth/login', { body: { ...base0, formStartedAt: Date.now() } })).status, 400);
  });

  it('manipulación de campos: no se aceptan role/professionalId/status extra', async () => {
    assert.equal((await registerPatient('mass@x.test', { role: 'ADMIN' })).status, 400);
    const login = await loginPro();
    const cookie = cookieOf(login);
    const plan = { userId: 'u1', condition: 'estres', title: 'Plan', weeks: [{ week_number: 1, title: 'a', description: 'b' }] };
    const r = await request(base, 'POST', '/api/treatment-plans', { cookie, csrf: login.json.csrfToken, body: { ...plan, professionalId: 'otro' } });
    assert.equal(r.status, 400);
    assert.match(r.json.error, /professionalId/);
  });

  it('registro: contraseña débil y consentimiento obligatorio', async () => {
    assert.equal((await registerPatient('weak@x.test', { password: 'password123' })).status, 400);
    assert.equal((await registerPatient('nocons@x.test', { contactConsent: false })).status, 400);
    assert.equal((await registerPatient('badphone@x.test', { contactPhone: '123' })).status, 400);
  });

  it('separación de sesiones: paciente no entra a rutas de profesional, ni viceversa', async () => {
    const reg = await registerPatient('sep@x.test');
    assert.equal(reg.status, 201);
    assert.equal(reg.json.user.passwordHash, undefined);
    const patientCookie = cookieOf(reg);
    assert.equal((await request(base, 'GET', '/api/alerts', { cookie: patientCookie })).status, 401);
    assert.equal((await request(base, 'GET', '/api/patient-auth/me', { cookie: patientCookie })).status, 200);
    const pro = await loginPro();
    assert.equal((await request(base, 'GET', '/api/treatment-plans/mine', { cookie: cookieOf(pro) })).status, 401);
  });

  it('el puntaje del tamizaje lo calcula el servidor (no se puede falsear)', async () => {
    const r = await request(base, 'POST', '/api/screenings', { body: { sessionId: 'sess-12345678', type: 'PHQ-9', answers: Array(9).fill(3), totalScore: 0, severity: 'mínima' } });
    assert.equal(r.status, 201);
    assert.equal(r.json.totalScore, 27);
    assert.equal(r.json.severity, 'severa');
    assert.equal((await request(base, 'POST', '/api/screenings', { body: { sessionId: 'sess-12345678', type: 'PHQ-9', answers: [1, 2, 3] } })).status, 400);
  });

  it('archivos, cuerpos enormes y JSON roto se rechazan', async () => {
    assert.equal((await request(base, 'POST', '/api/chat/messages', { headers: { 'Content-Type': 'multipart/form-data; boundary=x' }, raw: '--x--' })).status, 415);
    assert.equal((await request(base, 'POST', '/api/chat/messages', { headers: { 'Content-Type': 'text/plain' }, raw: 'hola' })).status, 415);
    assert.equal((await request(base, 'POST', '/api/chat/messages', { raw: JSON.stringify({ sessionId: 'sess-12345678', role: 'user', content: 'x'.repeat(40000) }) })).status, 413);
    assert.equal((await request(base, 'POST', '/api/chat/messages', { raw: '{rota' })).status, 400);
  });

  it('prototype pollution y campos prohibidos en el cuerpo → 400', async () => {
    const r = await request(base, 'POST', '/api/chat/messages', { raw: '{"sessionId":"sess-12345678","role":"user","content":"hola","__proto__":{"admin":true}}' });
    assert.equal(r.status, 400);
    assert.equal({}.admin, undefined);
  });

  it('paginación: limit se acota a 100 y valores inválidos → 400', async () => {
    const login = await loginPro();
    const cookie = cookieOf(login);
    const ok = await request(base, 'GET', '/api/alerts?limit=100000', { cookie });
    assert.equal(ok.status, 200);
    assert.equal(ok.headers['x-limit'], '100');
    assert.equal((await request(base, 'GET', '/api/alerts?limit=-1', { cookie })).status, 400);
    assert.equal((await request(base, 'GET', '/api/alerts?evil=1', { cookie })).status, 400);
  });

  it('contacto de emergencia: solo con cuenta, solo riesgo crítico y con enfriamiento de 6 h', async () => {
    const alert = (cookie, csrf, severity) => request(base, 'POST', '/api/alerts', { cookie, csrf, body: { sessionId: 'sess-abcdefgh', category: 'ideacion_suicida', severity, excerpt: 'texto' } });
    const reg = await registerPatient('contacto@x.test');
    const cookie = cookieOf(reg);
    const csrf = reg.json.csrfToken;

    contactSent.length = 0;
    assert.equal((await alert(undefined, undefined, 'critico')).status, 201); // anónimo
    assert.equal(contactSent.length, 0);
    await alert(cookie, csrf, 'alto'); // con cuenta pero no crítico
    assert.equal(contactSent.length, 0);
    const first = await alert(cookie, csrf, 'critico');
    assert.equal(first.status, 201);
    assert.equal(first.json.notifications.contactSms.sent, true);
    assert.equal(contactSent.length, 1);
    const second = await alert(cookie, csrf, 'critico'); // dentro de las 6 h
    assert.equal(contactSent.length, 1);
    assert.equal(second.json.notifications.contactSms.alreadyNotified, true);
  });

  it('ubicación: llega al SMS del contacto, pero no se guarda con la alerta', async () => {
    const reg = await registerPatient('ubicacion@x.test');
    const cookie = cookieOf(reg);
    const csrf = reg.json.csrfToken;
    const location = { lat: 4.711, lng: -74.0721, accuracy: 25 };
    const r = await request(base, 'POST', '/api/alerts', { cookie, csrf, body: { sessionId: 'sess-ubicacion1', category: 'ideacion_suicida', severity: 'critico', excerpt: 'texto', location } });
    assert.equal(r.status, 201);
    assert.deepEqual(contactLocations.at(-1), location);
    assert.ok(!JSON.stringify(store.alerts).includes('-74.0721'), 'la ubicación no se persiste');
    assert.ok(!r.text.includes('-74.0721'), 'ni se devuelve');
  });

  it('ubicación: valida rangos y no acepta campos de más', async () => {
    const reg = await registerPatient('ubicacion2@x.test');
    const call = (location) => request(base, 'POST', '/api/alerts', { cookie: cookieOf(reg), csrf: reg.json.csrfToken, body: { sessionId: 'sess-ubicacion2', category: 'ideacion_suicida', severity: 'alto', excerpt: 'x', location } });
    assert.equal((await call({ lat: 91, lng: 0 })).status, 400);
    assert.equal((await call({ lat: 0, lng: -181 })).status, 400);
    assert.equal((await call({ lat: '4.7', lng: -74 })).status, 400);
    assert.equal((await call({ lat: 4.7 })).status, 400);
    assert.equal((await call({ lat: 4.7, lng: -74, url: 'http://evil.example' })).status, 400);
    assert.equal((await call(null)).status, 201, 'sin ubicación la alerta funciona igual');
  });

  it('una alerta con un mensaje MUY largo nunca se rechaza (se recorta)', async () => {
    const r = await request(base, 'POST', '/api/alerts', { body: { sessionId: 'sess-largo123', category: 'ideacion_suicida', severity: 'critico', excerpt: 'x'.repeat(4000) } });
    assert.equal(r.status, 201);
    assert.equal(store.alerts.at(-1).excerpt.length, 500);
  });

  it('la respuesta de una alerta no filtra motivos técnicos internos', async () => {
    const r = await request(base, 'POST', '/api/alerts', { body: { sessionId: 'sess-zzzzzzzz', category: 'autolesion', severity: 'alto', excerpt: 'x' } });
    assert.equal(r.status, 201);
    assert.ok(!JSON.stringify(r.json).includes('reason'));
    assert.deepEqual(Object.keys(r.json).sort(), ['id', 'notifications']);
  });

  it('chat: una sesión ligada a una cuenta no se puede leer de forma anónima', async () => {
    const reg = await registerPatient('chat@x.test');
    const cookie = cookieOf(reg);
    await request(base, 'POST', '/api/chat/messages', { cookie, csrf: reg.json.csrfToken, body: { sessionId: 'sess-privada1', role: 'user', content: 'mensaje privado' } });
    const anon = await request(base, 'GET', '/api/chat/messages?sessionId=sess-privada1');
    assert.equal(anon.status, 200);
    assert.deepEqual(anon.json, []);
    const own = await request(base, 'GET', '/api/chat/messages', { cookie });
    assert.equal(own.json.length >= 1, true);
  });


  // ------------------------------------------------------------------
  // Perfiles nuevos: FUNCIONARIO y ADMIN (control de cuentas)
  // ------------------------------------------------------------------
  const seedUser = (id, role = 'USUARIO') => {
    store.users.set(id, { id, name: `Nombre ${id}`, email: `${id}@x.test`, passwordHash: `h:${PATIENT_PASSWORD}`, role, status: 'activo', createdAt: new Date(), emergencyContact: null });
  };
  const loginUser = (id, password = PATIENT_PASSWORD) => request(base, 'POST', '/api/patient-auth/login', { body: { email: `${id}@x.test`, password, ...humanForm() } });
  const withSession = (login) => (method, path, body) => request(base, method, path, { cookie: cookieOf(login), csrf: login.json.csrfToken, body });
  const asAdmin = async () => withSession(await loginPro());

  it('funcionario: ve la lista y el historial de los pacientes, y la consulta queda en la bitácora', async () => {
    seedUser('fun1', 'FUNCIONARIO');
    seedUser('pac1');
    store.messages.push({ id: 'mf1', sessionId: 'sess-fun-0001', userId: 'pac1', role: 'user', content: 'hola' });
    const call = withSession(await loginUser('fun1'));

    const list = await call('GET', '/api/staff/patients');
    assert.equal(list.status, 200);
    assert.ok(list.json.some((p) => p.id === 'pac1'));
    assert.ok(!list.json.some((p) => p.id === 'fun1'), 'el funcionario no aparece como paciente');

    const history = await call('GET', '/api/staff/patients/pac1/history');
    assert.equal(history.status, 200);
    assert.equal(history.json.patient.id, 'pac1');
    assert.equal(history.json.messages.length, 1);
    assert.equal(history.json.patient.emergencyContact, undefined, 'no se expone el contacto de emergencia');
    assert.ok(store.audit.some((a) => a.action === 'staff_view_patient_history' && a.actorUserId === 'fun1' && a.resourceId === 'pac1'));

    seedUser('fun2', 'FUNCIONARIO');
    assert.equal((await call('GET', '/api/staff/patients/fun2/history')).status, 404, 'no se lee el historial de otro funcionario');
    assert.equal((await call('GET', '/api/staff/patients/no-existe/history')).status, 404);
  });

  it('funcionario: registra una atención y la ve en "pacientes atendidos" (solo las suyas)', async () => {
    seedUser('fun3', 'FUNCIONARIO');
    seedUser('fun4', 'FUNCIONARIO');
    seedUser('pac2');
    const mine = withSession(await loginUser('fun3'));
    const other = withSession(await loginUser('fun4'));

    assert.equal((await mine('POST', '/api/staff/patients/pac2/attentions', { note: 'Primera consulta' })).status, 201);
    assert.equal((await mine('POST', '/api/staff/patients/pac2/attentions', { staffId: 'fun4' })).status, 400, 'el funcionario sale del token, no del cuerpo');
    const attended = await mine('GET', '/api/staff/attended');
    assert.deepEqual(attended.json.map((p) => p.id), ['pac2']);
    assert.deepEqual((await other('GET', '/api/staff/attended')).json, []);
    const history = await mine('GET', '/api/staff/patients/pac2/history');
    assert.equal(history.json.attentions[0].note, 'Primera consulta');
    assert.equal((await mine('POST', '/api/staff/patients/fun4/attentions', {})).status, 404, 'solo se atiende a pacientes');
  });

  it('funcionario conserva todo lo de un usuario normal (perfil, chat y planes)', async () => {
    seedUser('fun5', 'FUNCIONARIO');
    const login = await loginUser('fun5');
    assert.equal(login.json.user.role, 'FUNCIONARIO');
    const call = withSession(login);
    assert.equal((await call('GET', '/api/patient-auth/me')).json.user.role, 'FUNCIONARIO');
    assert.equal((await call('POST', '/api/chat/messages', { sessionId: 'sess-fun-0005', role: 'user', content: 'hola' })).status, 201);
    assert.equal((await call('GET', '/api/treatment-plans/mine')).status, 200);
  });

  it('usuario normal y visitante NO acceden a las rutas del funcionario', async () => {
    seedUser('norm1');
    const call = withSession(await loginUser('norm1'));
    assert.equal((await call('GET', '/api/staff/patients')).status, 403);
    assert.equal((await call('GET', '/api/staff/attended')).status, 403);
    assert.equal((await request(base, 'GET', '/api/staff/patients')).status, 401);
    const pro = await loginPro();
    assert.equal((await request(base, 'GET', '/api/staff/patients', { cookie: cookieOf(pro) })).status, 401, 'un profesional tampoco entra por ahí');
  });

  it('admin: crea cuentas con su perfil (funcionario, psicólogo, administrador) y valida los datos', async () => {
    const call = await asAdmin();
    const body = { kind: 'usuario', name: 'Marta Pérez', email: 'nueva.funcionaria@clinica.test', password: 'Clave-Segura-Larga-2026', role: 'FUNCIONARIO' };
    const created = await call('POST', '/api/admin/accounts', body);
    assert.equal(created.status, 201);
    assert.equal(created.json.role, 'FUNCIONARIO');
    assert.equal(created.json.passwordHash, undefined);
    const login = await request(base, 'POST', '/api/patient-auth/login', { body: { email: body.email, password: body.password, ...humanForm() } });
    assert.equal(login.status, 200);
    assert.equal(login.json.user.role, 'FUNCIONARIO');

    assert.equal((await call('POST', '/api/admin/accounts', body)).status, 409, 'correo repetido');
    assert.equal((await call('POST', '/api/admin/accounts', { ...body, email: 'otra@clinica.test', role: 'ADMIN' })).status, 400, 'un usuario no puede nacer ADMIN');
    assert.equal((await call('POST', '/api/admin/accounts', { ...body, email: 'debil@clinica.test', password: 'password123' })).status, 400);
    assert.equal((await call('POST', '/api/admin/accounts', { ...body, email: 'pro@clinica.test', kind: 'profesional', role: 'PSICOLOGO', password: 'Corta-2026-x' })).status, 201, '12 caracteres bastan para un profesional');
    assert.equal((await call('POST', '/api/admin/accounts', { ...body, email: 'pro2@clinica.test', kind: 'profesional', role: 'PSICOLOGO', password: 'Corta-2026' })).status, 400, 'un profesional exige 12 o más');
    assert.equal((await call('POST', '/api/admin/accounts', { ...body, email: 'x@clinica.test', extra: 1 })).status, 400, 'no acepta campos de más');
    assert.ok(store.audit.some((a) => a.action === 'admin_create_account'));
    assert.ok(!JSON.stringify(store.audit).includes('Clave-Segura-Larga-2026'), 'las contraseñas nunca van a la bitácora');
  });

  it('admin: suspender cierra la sesión abierta y bloquea el ingreso; reactivar lo restablece', async () => {
    seedUser('sus1');
    const user = withSession(await loginUser('sus1'));
    assert.equal((await user('GET', '/api/patient-auth/me')).status, 200);
    const call = await asAdmin();
    assert.equal((await call('PATCH', '/api/admin/accounts/usuario/sus1/status', { status: 'suspendido' })).status, 200);
    assert.equal((await user('GET', '/api/patient-auth/me')).status, 401, 'la sesión que ya estaba abierta deja de valer');
    const blocked = await loginUser('sus1');
    assert.equal(blocked.status, 403);
    assert.match(blocked.json.error, /suspendida/);
    assert.equal((await call('PATCH', '/api/admin/accounts/usuario/sus1/status', { status: 'activo' })).status, 200);
    assert.equal((await loginUser('sus1')).status, 200);
  });

  it('admin: una cuenta suspendida con credenciales incorrectas NO revela que existe', async () => {
    seedUser('sus2');
    const call = await asAdmin();
    await call('PATCH', '/api/admin/accounts/usuario/sus2/status', { status: 'suspendido' });
    const wrong = await loginUser('sus2', 'contraseña-incorrecta-1');
    assert.equal(wrong.status, 401);
    assert.equal(wrong.json.error, 'Credenciales inválidas');
  });

  it('admin: cambiar la contraseña cierra las sesiones abiertas y la clave anterior deja de servir', async () => {
    seedUser('pw1');
    const old = withSession(await loginUser('pw1'));
    assert.equal((await old('GET', '/api/patient-auth/me')).status, 200);
    await new Promise((r) => setTimeout(r, 1100)); // el token guarda su fecha en segundos
    const call = await asAdmin();
    assert.equal((await call('PATCH', '/api/admin/accounts/usuario/pw1/password', { password: 'password123' })).status, 400, 'aplica la política de contraseñas');
    assert.equal((await call('PATCH', '/api/admin/accounts/usuario/pw1/password', { password: 'Otra-Clave-Larga-2026' })).status, 200);
    assert.equal((await old('GET', '/api/patient-auth/me')).status, 401);
    assert.equal((await loginUser('pw1')).status, 401, 'la contraseña anterior ya no sirve');
    assert.equal((await loginUser('pw1', 'Otra-Clave-Larga-2026')).status, 200);
  });

  it('admin: cambia el perfil de un usuario y se aplica al instante (sin volver a iniciar sesión)', async () => {
    seedUser('prom1');
    const user = withSession(await loginUser('prom1'));
    assert.equal((await user('GET', '/api/staff/patients')).status, 403);
    const call = await asAdmin();
    assert.equal((await call('PATCH', '/api/admin/accounts/usuario/prom1/role', { role: 'FUNCIONARIO' })).status, 200);
    assert.equal((await user('GET', '/api/staff/patients')).status, 200);
    assert.equal((await call('PATCH', '/api/admin/accounts/usuario/prom1/role', { role: 'USUARIO' })).status, 200);
    assert.equal((await user('GET', '/api/staff/patients')).status, 403);
    assert.equal((await call('PATCH', '/api/admin/accounts/usuario/prom1/role', { role: 'ADMIN' })).status, 400, 'no se asciende a administrador por aquí');
    assert.equal((await call('PATCH', '/api/admin/accounts/profesional/p1/role', { role: 'FUNCIONARIO' })).status, 400, 'solo cuentas de usuario');
  });

  it('admin: elimina una cuenta; ya no puede entrar y volver a eliminarla da 404', async () => {
    seedUser('del1');
    const user = withSession(await loginUser('del1'));
    const call = await asAdmin();
    assert.equal((await call('DELETE', '/api/admin/accounts/usuario/del1')).status, 200);
    assert.equal((await user('GET', '/api/patient-auth/me')).status, 401);
    assert.equal((await loginUser('del1')).status, 401);
    assert.equal((await call('DELETE', '/api/admin/accounts/usuario/del1')).status, 404);
    assert.ok(store.audit.some((a) => a.action === 'admin_delete_account' && a.resourceId === 'del1'));
  });

  it('admin: no puede suspenderse ni eliminarse a sí mismo, ni quitar al único administrador', async () => {
    const call = await asAdmin();
    assert.equal((await call('PATCH', '/api/admin/accounts/profesional/p1/status', { status: 'suspendido' })).status, 409);
    assert.equal((await call('DELETE', '/api/admin/accounts/profesional/p1')).status, 409);
    assert.ok(store.pros.has('p1'));
  });

  it('listar cuentas: filtra por tipo y búsqueda, y nunca muestra contraseñas', async () => {
    seedUser('lista1', 'FUNCIONARIO');
    const call = await asAdmin();
    const all = await call('GET', '/api/admin/accounts');
    assert.equal(all.status, 200);
    assert.ok(all.json.some((a) => a.id === 'lista1' && a.kind === 'usuario' && a.role === 'FUNCIONARIO'));
    assert.ok(!all.text.includes('passwordHash') && !all.text.includes('h:'));
    const onlyPros = await call('GET', '/api/admin/accounts?kind=profesional');
    assert.ok(onlyPros.json.every((a) => a.kind === 'profesional'));
    assert.ok((await call('GET', '/api/admin/accounts?q=lista1')).json.some((a) => a.id === 'lista1'));
    assert.equal((await call('GET', '/api/admin/accounts?kind=otro')).status, 400);
  });

  it('solo el ADMIN gestiona cuentas: psicólogo, funcionario, usuario y visitante reciben 403/401', async () => {
    store.pros.set('p3', { id: 'p3', name: 'Psi', email: 'psi@clinica.test', passwordHash: `h:${PRO_PASSWORD}`, role: 'PSICOLOGO', status: 'activo' });
    seedUser('fun9', 'FUNCIONARIO');
    const psi = await request(base, 'POST', '/api/auth/login', { body: { email: 'psi@clinica.test', password: PRO_PASSWORD, ...humanForm() } });
    assert.equal(psi.status, 200);
    const asPsi = withSession(psi);
    assert.equal((await asPsi('GET', '/api/admin/accounts')).status, 403);
    assert.equal((await asPsi('DELETE', '/api/admin/accounts/usuario/fun9')).status, 403);
    const asFun = withSession(await loginUser('fun9'));
    assert.equal((await asFun('GET', '/api/admin/accounts')).status, 401);
    assert.equal((await asFun('DELETE', '/api/admin/accounts/usuario/fun9')).status, 401);
    assert.equal((await request(base, 'GET', '/api/admin/accounts')).status, 401);
    assert.ok(store.users.has('fun9'));
  });

  it('un profesional suspendido no puede iniciar sesión', async () => {
    store.pros.set('p4', { id: 'p4', name: 'Susp', email: 'susp@clinica.test', passwordHash: `h:${PRO_PASSWORD}`, role: 'PSICOLOGO', status: 'suspendido' });
    const r = await request(base, 'POST', '/api/auth/login', { body: { email: 'susp@clinica.test', password: PRO_PASSWORD, ...humanForm() } });
    assert.equal(r.status, 403);
  });

  it('logout borra la cookie de sesión', async () => {
    const login = await loginPro();
    const r = await request(base, 'POST', '/api/auth/logout', { cookie: cookieOf(login), csrf: login.json.csrfToken });
    assert.equal(r.status, 200);
    assert.match(r.headers['set-cookie'].join(' '), /Max-Age=0/);
  });
});
