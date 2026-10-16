// Crea una cuenta de profesional. NO hay registro publico: solo quien tiene acceso al
// servidor puede crearlas. Usa ADMIN_DATABASE_URL (el rol de la app no puede insertar
// profesionales).
//
//   npm run create-professional -- --name="Ana Ríos" --email=ana@correo.com --role=ADMIN
//   (la contrasena se pide de forma oculta; evita --password: queda en el historial de la terminal)
import 'dotenv/config';
import readline from 'node:readline';
import bcrypt from 'bcryptjs';
import pg from 'pg';
import { nanoid } from 'nanoid';
import { checkPassword } from '../src/security/passwordPolicy.js';
import { createPasswordHasher } from '../src/auth/hash.js';

const args = Object.fromEntries(process.argv.slice(2).map((a) => a.match(/^--([^=]+)=(.*)$/)).filter(Boolean).map((m) => [m[1], m[2]]));

function askHidden(prompt) {
  return new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: true });
    rl._writeToOutput = (s) => { if (s.includes(prompt)) process.stdout.write(s); }; // no muestra lo que se escribe
    rl.question(prompt, (answer) => { rl.close(); process.stdout.write('\n'); resolve(answer); });
  });
}

const { name, email, role } = args;
if (!name || !email) {
  console.error('Uso: npm run create-professional -- --name="Nombre" --email=correo@ejemplo.com [--role=ADMIN|PSICOLOGO]');
  process.exit(1);
}
let password = args.password || process.env.NEW_PROFESSIONAL_PASSWORD;
if (args.password) console.warn('⚠ Pasar --password deja la contraseña en el historial de la terminal. Prefiere el modo interactivo.');
if (!password) password = await askHidden('Contraseña (mín. 12 caracteres): ');

const policy = checkPassword(password, { email, name, minLength: 12 }); // profesionales: politica mas estricta
if (!policy.ok) {
  console.error(`✖ ${policy.reason}`);
  process.exit(1);
}

const url = process.env.ADMIN_DATABASE_URL || process.env.DATABASE_URL;
if (!url) {
  console.error('Falta ADMIN_DATABASE_URL en .env');
  process.exit(1);
}
const hasher = createPasswordHasher({ bcrypt, cost: Number(process.env.BCRYPT_COST || 12) });
const client = new pg.Client({ connectionString: url, ssl: /sslmode=require/.test(url) ? { rejectUnauthorized: process.env.DB_SSL_REJECT_UNAUTHORIZED !== 'false' } : undefined });
await client.connect();
try {
  const normalized = email.trim().toLowerCase();
  if ((await client.query('SELECT 1 FROM professionals WHERE email = $1', [normalized])).rowCount) {
    console.error(`✖ Ya existe una cuenta con el correo ${normalized}`);
    process.exitCode = 1;
  } else {
    const finalRole = role === 'ADMIN' ? 'ADMIN' : 'PSICOLOGO';
    await client.query('INSERT INTO professionals (id, name, email, password_hash, role) VALUES ($1, $2, $3, $4, $5)', [nanoid(12), name.trim(), normalized, await hasher.hash(password), finalRole]);
    console.log(`Cuenta profesional creada:\n  Nombre: ${name.trim()}\n  Email:  ${normalized}\n  Rol:    ${finalRole}`);
  }
} finally {
  await client.end();
}
