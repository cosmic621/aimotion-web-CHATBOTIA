import pg from 'pg';
import { config } from '../config.js';

export const pool = new pg.Pool({
  connectionString: config.databaseUrl,
  // Habilita SSL automaticamente si la URL lo requiere (Supabase/Neon lo exigen).
  ssl: config.databaseUrl?.includes('sslmode=require') ? { rejectUnauthorized: false } : undefined,
});

pool.on('error', (err) => {
  console.error('Error inesperado en el pool de PostgreSQL:', err);
});

export async function query(text, params) {
  return pool.query(text, params);
}
