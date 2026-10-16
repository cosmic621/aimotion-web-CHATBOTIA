// Crea (o actualiza) el rol de la aplicacion con MINIMO PRIVILEGIO y aplica sus
// permisos (src/db/roles.sql). Usa ADMIN_DATABASE_URL.
//   npm run setup-roles              crea el rol y muestra la DATABASE_URL a usar
//   npm run setup-roles -- --reset   genera una contrasena nueva para el rol existente
import 'dotenv/config';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const adminUrl = process.env.ADMIN_DATABASE_URL;
if (!adminUrl) {
  console.error('Define ADMIN_DATABASE_URL en .env (conexión del dueño de la base de datos, p. ej. postgres).');
  process.exit(1);
}
const url = new URL(adminUrl);
const dbName = decodeURIComponent(url.pathname.slice(1));
if (!/^[A-Za-z0-9_]+$/.test(dbName)) {
  console.error('El nombre de la base de datos debe contener solo letras, números y guion bajo.');
  process.exit(1);
}

const client = new pg.Client({ connectionString: adminUrl });
await client.connect();
try {
  const exists = (await client.query("SELECT 1 FROM pg_roles WHERE rolname = 'aimotion_app'")).rowCount > 0;
  let password = null;
  if (!exists || process.argv.includes('--reset')) {
    password = crypto.randomBytes(24).toString('hex'); // hex: seguro para incrustar en el DDL
    const verb = exists ? 'ALTER' : 'CREATE';
    await client.query(`${verb} ROLE aimotion_app WITH LOGIN PASSWORD '${password}' NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION CONNECTION LIMIT 20`);
  }
  await client.query(`GRANT CONNECT ON DATABASE ${dbName} TO aimotion_app`);
  await client.query(fs.readFileSync(path.join(__dirname, '../src/db/roles.sql'), 'utf-8'));
  console.log('Rol aimotion_app listo (sin DDL, sin DELETE, sin superusuario).');
  if (password) {
    const appUrl = new URL(adminUrl);
    appUrl.username = 'aimotion_app';
    appUrl.password = password;
    console.log('\nPon esto en tu .env (se muestra UNA sola vez; no lo compartas ni lo subas a git):\n');
    console.log(`  DATABASE_URL=${appUrl.toString()}\n`);
  }
} finally {
  await client.end();
}
