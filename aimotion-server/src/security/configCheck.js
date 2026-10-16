// Validacion de la configuracion al arrancar (items 1, 3, 6, 19): el servidor
// se NIEGA a iniciar con secretos debiles, claves ausentes o una configuracion
// insegura en produccion. Funcion pura (recibe el entorno) para poder probarla.
import { parseKey } from './crypto.js';

const WEAK_SECRET_RE = /cambia|changeme|secret|password|contrasena|example|ejemplo|123456|test|prueba/i;

function parseDbUser(url) {
  try {
    return decodeURIComponent(new URL(url).username || '');
  } catch {
    return '';
  }
}

export function validateEnv(env) {
  const errors = [];
  const warnings = [];
  const isProd = env.NODE_ENV === 'production';

  if (!env.DATABASE_URL) errors.push('DATABASE_URL no está configurada.');

  const jwt = env.JWT_SECRET || '';
  if (!jwt) errors.push('JWT_SECRET no está configurada.');
  else if (jwt.length < 32) errors.push('JWT_SECRET debe tener al menos 32 caracteres.');
  else if (WEAK_SECRET_RE.test(jwt) || new Set(jwt).size < 12) errors.push('JWT_SECRET es débil o es un valor de ejemplo: genera uno aleatorio (npm run generate-keys).');

  if (!env.DATA_ENCRYPTION_KEY) {
    errors.push('DATA_ENCRYPTION_KEY no está configurada (cifrado de datos sensibles). Genera una con: npm run generate-keys');
  } else {
    try {
      parseKey(env.DATA_ENCRYPTION_KEY);
    } catch (e) {
      errors.push(`DATA_ENCRYPTION_KEY inválida: ${e.message}`);
    }
    if (env.DATA_ENCRYPTION_KEY === jwt) errors.push('DATA_ENCRYPTION_KEY no puede ser igual a JWT_SECRET.');
  }
  if (env.DATA_ENCRYPTION_KEY_OLD) {
    try {
      parseKey(env.DATA_ENCRYPTION_KEY_OLD);
    } catch (e) {
      errors.push(`DATA_ENCRYPTION_KEY_OLD inválida: ${e.message}`);
    }
  }

  const origins = String(env.CORS_ORIGIN || 'http://localhost:5173').split(',').map((s) => s.trim()).filter(Boolean);
  if (origins.includes('*')) errors.push('CORS_ORIGIN no puede ser "*" (se usan cookies de sesión).');
  if (isProd && origins.some((o) => !o.startsWith('https://'))) errors.push('En producción CORS_ORIGIN debe usar https://.');

  if (isProd) {
    if (env.FORCE_HTTPS === 'false') errors.push('En producción FORCE_HTTPS no puede ser "false".');
    if (!env.TRUST_PROXY) warnings.push('TRUST_PROXY no está configurado: si hay un proxy (nginx/Render), define TRUST_PROXY=1 para detectar HTTPS e IP real.');
    if (parseDbUser(env.DATABASE_URL || '') === 'postgres') errors.push('En producción DATABASE_URL no debe usar el superusuario "postgres": usa el rol de mínimo privilegio (db/roles.sql).');
    if (!env.ADMIN_DATABASE_URL) warnings.push('ADMIN_DATABASE_URL no está definida: las migraciones usarían el rol de la aplicación.');
  } else if (parseDbUser(env.DATABASE_URL || '') === 'postgres') {
    warnings.push('DATABASE_URL usa el superusuario "postgres". Para activar RLS y mínimo privilegio usa el rol aimotion_app (db/roles.sql).');
  }

  return { errors, warnings, isProd };
}
