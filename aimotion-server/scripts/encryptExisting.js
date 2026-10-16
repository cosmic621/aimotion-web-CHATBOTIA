// Cifra los datos que se guardaron en texto plano ANTES de activar el cifrado.
// Seguro de repetir: solo toca filas aun sin cifrar. Usa ADMIN_DATABASE_URL.
//   npm run encrypt-existing -- --dry-run     solo cuenta cuantas filas faltan
//   npm run encrypt-existing                  las cifra
import 'dotenv/config';
import pg from 'pg';
import { createCipherBoxFromEnv } from '../src/security/crypto.js';

const dry = process.argv.includes('--dry-run');
const cipher = createCipherBoxFromEnv(process.env);
const url = process.env.ADMIN_DATABASE_URL || process.env.DATABASE_URL;
if (!url) {
  console.error('Falta ADMIN_DATABASE_URL en .env');
  process.exit(1);
}

const TARGETS = [
  { table: 'chat_messages', col: 'content', kind: 'text' },
  { table: 'alerts', col: 'excerpt', kind: 'text' },
  { table: 'alerts', col: 'reviewer_note', kind: 'text' },
  { table: 'users', col: 'emergency_contact_name', kind: 'text' },
  { table: 'users', col: 'emergency_contact_phone', kind: 'text' },
  { table: 'users', col: 'emergency_contact_relation', kind: 'text' },
  { table: 'screenings', col: 'answers', kind: 'json' },
  { table: 'treatment_plans', col: 'weeks', kind: 'json' },
];

const client = new pg.Client({ connectionString: url });
await client.connect();
try {
  for (const { table, col, kind } of TARGETS) {
    const where = kind === 'text' ? `${col} IS NOT NULL AND ${col} NOT LIKE 'enc:%'` : `${col} IS NOT NULL AND NOT (jsonb_typeof(${col}) = 'object' AND ${col} ? 'enc')`;
    let done = 0;
    for (;;) {
      const { rows } = await client.query(`SELECT id, ${col} AS value FROM ${table} WHERE ${where} LIMIT 500`);
      if (!rows.length) break;
      if (dry) { done += rows.length; const c = (await client.query(`SELECT COUNT(*)::int AS n FROM ${table} WHERE ${where}`)).rows[0].n; done = c; break; }
      for (const r of rows) {
        const aad = `${table}.${col}:${r.id}`;
        const enc = kind === 'text' ? cipher.encrypt(r.value, aad) : JSON.stringify(cipher.encryptJson(r.value, aad));
        await client.query(`UPDATE ${table} SET ${col} = $2${kind === 'json' ? '::jsonb' : ''} WHERE id = $1`, [r.id, enc]);
        done += 1;
      }
    }
    console.log(`${dry ? 'Pendientes' : 'Cifradas'}: ${String(done).padStart(5)}  ${table}.${col}`);
  }
} finally {
  await client.end();
}
