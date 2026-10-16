import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { scanText, scanFileName, scanFiles, shouldSkip } from '../src/security/secretsScan.js';

// Los "secretos" de prueba se arman por partes para que este archivo no dispare el propio escáner.
const AWS = 'AK' + 'IA' + 'ABCDEFGHIJKLMNOP';
const GH = 'gh' + 'p_' + 'a'.repeat(36);
const SK = 'sk' + '-' + 'A1b2C3d4E5f6G7h8I9j0K1l2';
const TWILIO = 'A' + 'C' + '0123456789abcdef0123456789abcdef';
const JWT = 'ey' + 'JhbGciOiJIUzI1NiJ9' + '.' + 'ey' + 'JzdWIiOiIxMjM0NTY3ODkwIn0' + '.' + 'abcDEF123_-xyz456';
const PEM = '-----BEGIN ' + 'RSA PRIVATE KEY-----';
const rules = (text) => scanText(text, 'f.js').map((f) => f.rule);

describe('secretsScan: detecta secretos', () => {
  it('claves de proveedores y tokens', () => {
    assert.deepEqual(rules(`const k = "${AWS}"`), ['aws-access-key']);
    assert.deepEqual(rules(`token ${GH}`), ['github-token']);
    assert.deepEqual(rules(`x = ${SK}`), ['api-key-sk']);
    assert.deepEqual(rules(`sid ${TWILIO}`), ['twilio-account-sid']);
    assert.deepEqual(rules(`t = ${JWT}`), ['jwt-token']);
    assert.deepEqual(rules(PEM), ['private-key']);
  });
  it('URL de base de datos con contraseña real', () => {
    assert.deepEqual(rules('DATABASE_URL=postgresql://app:Xk29dLq8vN3mZ@db.miempresa.com:5432/aimotion'), ['db-url-with-credentials']); // secrets:ignore (dato de prueba falso)
  });
  it('asignaciones literales de contraseñas/claves', () => {
    assert.deepEqual(rules('const password = "Xk29dLq8vN3mZ7pQ"'), ['secret-assignment']); // secrets:ignore (dato de prueba falso)
    assert.deepEqual(rules("api_key: 'abcdef1234567890zz'"), ['secret-assignment']); // secrets:ignore (dato de prueba falso)
  });
  it('variables de entorno con valores reales', () => {
    assert.deepEqual(rules('JWT_SECRET=9f8e7d6c5b4a39281706f5e4d3c2b1a0'), ['env-secret-value']);
    assert.deepEqual(rules('SMTP_PASS=abcd1234efgh5678'), ['env-secret-value']);
  });
  it('reporta línea y archivo, y enmascara el secreto (nunca lo imprime completo)', () => {
    const f = scanText(`linea1\nconst k = "${AWS}"`, 'src/a.js')[0];
    assert.equal(f.line, 2);
    assert.equal(f.file, 'src/a.js');
    assert.ok(!f.preview.includes(AWS));
    assert.ok(f.preview.length < AWS.length + 20);
  });
});

describe('secretsScan: evita falsos positivos', () => {
  it('placeholders y ejemplos no se marcan', () => {
    for (const line of [
      'JWT_SECRET=cambia-este-valor-por-uno-largo-y-aleatorio',
      'SMTP_PASS=tu_contrasena_de_aplicacion',
      'DATABASE_URL=postgresql://postgres:postgres@localhost:5432/aimotion',
      'DATABASE_URL=postgresql://usuario:clave@localhost:5432/aimotion',
      'const password = process.env.DB_PASSWORD_LARGE_VALUE',
      'password: "<tu-contraseña-aquí>"',
      'const secret = import.meta.env.VITE_SOMETHING_LONG',
      'JWT_SECRET=genera-uno-con-npm-run-generate-keys-ok',
    ]) assert.deepEqual(rules(line), [], line);
  });
  it('código normal no se marca', () => {
    for (const line of ['const hash = await bcrypt.hash(password, 12);', 'password: z.string().min(8),', 'if (!password) return', 'const token = extractToken(req);']) {
      assert.deepEqual(rules(line), [], line);
    }
  });
  it('secrets:ignore omite la línea', () => assert.deepEqual(rules(`const k = "${AWS}" // secrets:ignore`), []));
});

describe('secretsScan: archivos', () => {
  it('marca .env versionados pero no .env.example', () => {
    assert.equal(scanFileName('.env').length, 1);
    assert.equal(scanFileName('aimotion-server/.env').length, 1);
    assert.equal(scanFileName('aimotion-web/.env.production').length, 1);
    assert.equal(scanFileName('aimotion-server/.env.example').length, 0);
    assert.equal(scanFileName('src/env.js').length, 0);
  });
  it('omite node_modules, lockfiles y binarios', () => {
    assert.equal(shouldSkip('node_modules/x/index.js'), true);
    assert.equal(shouldSkip('a/package-lock.json'), true);
    assert.equal(shouldSkip('logo.png'), true);
    assert.equal(shouldSkip('src/app.js'), false);
  });
  it('scanFiles combina nombre y contenido', () => {
    const files = { '.env': 'A=1', 'src/a.js': `x = "${AWS}"`, 'src/b.js': 'ok', 'package-lock.json': `"${AWS}"` };
    const out = scanFiles(Object.keys(files), (f) => files[f]);
    assert.deepEqual(out.map((f) => f.rule).sort(), ['archivo-env-versionado', 'aws-access-key']);
  });
});
