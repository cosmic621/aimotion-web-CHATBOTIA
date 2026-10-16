import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import 'dotenv/config';
import pg from 'pg';

// Las migraciones (DDL) usan la conexion de ADMINISTRACION (dueno de las tablas),
// no la de la aplicacion, que no tiene permisos de DDL.
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const file = process.argv.includes('--rls') ? 'rls.sql' : 'schema.sql';
const url = process.env.ADMIN_DATABASE_URL || process.env.DATABASE_URL;

if (!url) {
  console.error('Falta ADMIN_DATABASE_URL (o DATABASE_URL) en .env');
  process.exit(1);
}
if (!process.env.ADMIN_DATABASE_URL) console.warn('⚠ ADMIN_DATABASE_URL no está definida: se usa DATABASE_URL (en producción deben ser distintas).');

const ssl = /sslmode=require/.test(url) ? { rejectUnauthorized: process.env.DB_SSL_REJECT_UNAUTHORIZED !== 'false' } : undefined;
const client = new pg.Client({ connectionString: url, ssl });
try {
  await client.connect();
  await client.query('BEGIN');
  await client.query(fs.readFileSync(path.join(__dirname, file), 'utf-8'));
  await client.query('COMMIT');
  console.log(`Listo: ${file} aplicado (en una transacción).`);
  if (file === 'rls.sql') console.log('RLS activo. Reinicia el servidor para que lo detecte. Verifica con: npm run test-rls');
} catch (err) {
  await client.query('ROLLBACK').catch(() => {});
  console.error(`Error al aplicar ${file}:`, err.message);
  process.exitCode = 1;
} finally {
  await client.end();
}
