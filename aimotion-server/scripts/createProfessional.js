// Crea una cuenta de profesional. No hay endpoint publico de registro:
// solo quien tiene acceso al servidor/backend puede crear cuentas, lo cual
// es apropiado para un sistema que maneja alertas de riesgo clinico.
//
// Uso:
//   node scripts/createProfessional.js --name="Ana Ríos" --email=ana@ejemplo.com --password=algoSeguro123 --role=ADMIN
//
// role es opcional (PSICOLOGO por defecto).

import 'dotenv/config';
import { nanoid } from 'nanoid';
import { professionalsRepo } from '../src/db/professionalsRepo.js';
import { hashPassword } from '../src/auth/hash.js';
import { pool } from '../src/db/pool.js';

function parseArgs() {
  const args = {};
  for (const arg of process.argv.slice(2)) {
    const match = arg.match(/^--([^=]+)=(.*)$/);
    if (match) args[match[1]] = match[2];
  }
  return args;
}

async function main() {
  const { name, email, password, role } = parseArgs();

  if (!name || !email || !password) {
    console.error('Uso: node scripts/createProfessional.js --name="..." --email=... --password=... [--role=ADMIN|PSICOLOGO]');
    process.exit(1);
  }
  if (password.length < 8) {
    console.error('La contraseña debe tener al menos 8 caracteres.');
    process.exit(1);
  }

  const existing = await professionalsRepo.findByEmail(email);
  if (existing) {
    console.error(`Ya existe una cuenta con el email ${email}.`);
    process.exit(1);
  }

  const passwordHash = await hashPassword(password);
  const professional = await professionalsRepo.create({
    id: nanoid(12),
    name,
    email,
    passwordHash,
    role: role === 'ADMIN' ? 'ADMIN' : 'PSICOLOGO',
  });

  console.log('Cuenta profesional creada:');
  console.log(`  Nombre: ${professional.name}`);
  console.log(`  Email:  ${professional.email}`);
  console.log(`  Rol:    ${professional.role}`);
  await pool.end();
}

main().catch((err) => {
  console.error('Error creando la cuenta:', err.message);
  process.exit(1);
});
