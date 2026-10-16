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
  const store = { users, pros, alerts, plans, messages, audit: [] };
  const repos = {
    professionals: {
      findByEmail: async (_c, e) => [...pros.values()].find((p) => p.email === e) || null,
      findById: async (_c, id) => pros.get(id) || null,
    },
    users: {
      findByEmail: async (_c, e) => [...users.values()].find((u) => u.email === e) || null,
      findById: async (_c, id) => users.get(id) || null,
      create: async (_c, { id, name, email, passwordHash, contact }) => {
        const u = { id, name, email, passwordHash, createdAt: new Date(), emergencyContact: { ...contact, consentAt: new Date() } };
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
  let server; let base; let store; let contactSent; let limiters;

  before(async () => {
    const { config } = lib.loadConfig({
      DATABASE_URL: 'postgresql://app:Xk29dLq8@db.interno:5432/aimotion', JWT_SECRET: 'q7Zr3Lm9Xv2Kp8Tn4Hw6Yb1Jc5Gd0FsR8', // secrets:ignore (dato de prueba falso)
      DATA_ENCRYPTION_KEY: lib.generateKey(), CORS_ORIGIN: ORIGIN,
    });
    const made = makeRepos();
    store = made.store;
    contactSent = [];
    limiters = lib.createLimiters();
    const app = lib.createApp({
      config, repos: made.repos,
      db: { health: async () => ({}), isRlsActive: () => false, metrics: () => ({}) },
      tokens: lib.createTokenService({ jwt: lib.jwt, secret: config.jwtSecret }),
      hasher: { hash: async (p) => `h:${p}`, verify: async (p, h) => Boolean(h) && h === `h:${p}`, needsRehash: () => false },
      services: {
        email: { sendAlert: async () => ({ sent: false }) }, proSms: { sendAlert: async () => ({ sent: false }) },
        contactSms: { send: async (user) => { contactSent.push(user.id); return { sent: true }; } },
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

  it('logout borra la cookie de sesión', async () => {
    const login = await loginPro();
    const r = await request(base, 'POST', '/api/auth/logout', { cookie: cookieOf(login), csrf: login.json.csrfToken });
    assert.equal(r.status, 200);
    assert.match(r.headers['set-cookie'].join(' '), /Max-Age=0/);
  });
});
