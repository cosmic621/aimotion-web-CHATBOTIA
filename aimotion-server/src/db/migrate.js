import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { pool } from './pool.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function migrate() {
  const sql = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf-8');
  console.log('Aplicando esquema a la base de datos...');
  await pool.query(sql);
  console.log('Listo. Tablas creadas/verificadas: professionals, alerts, screenings, audit_log.');
  await pool.end();
}

migrate().catch((err) => {
  console.error('Error al migrar la base de datos:', err.message);
  process.exit(1);
});
