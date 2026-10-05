import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, 'data');
const ALERTS_FILE = path.join(DATA_DIR, 'alerts.json');
const SCREENINGS_FILE = path.join(DATA_DIR, 'screenings.json');

function ensureFile(filePath) {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(filePath)) fs.writeFileSync(filePath, '[]', 'utf-8');
}

function readAll(filePath) {
  ensureFile(filePath);
  const raw = fs.readFileSync(filePath, 'utf-8');
  try {
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

function writeAll(filePath, records) {
  ensureFile(filePath);
  fs.writeFileSync(filePath, JSON.stringify(records, null, 2), 'utf-8');
}

/**
 * Almacenamiento simple basado en archivos JSON.
 * Suficiente para un prototipo academico. En un despliegue real
 * esto deberia reemplazarse por una base de datos (Postgres/Mongo)
 * con cifrado en reposo, dado que se maneja informacion clinica sensible.
 */
export const alertsStore = {
  list: () => readAll(ALERTS_FILE),
  add: (record) => {
    const records = readAll(ALERTS_FILE);
    records.unshift(record);
    writeAll(ALERTS_FILE, records);
    return record;
  },
  update: (id, patch) => {
    const records = readAll(ALERTS_FILE);
    const idx = records.findIndex((r) => r.id === id);
    if (idx === -1) return null;
    records[idx] = { ...records[idx], ...patch };
    writeAll(ALERTS_FILE, records);
    return records[idx];
  },
};

export const screeningsStore = {
  list: () => readAll(SCREENINGS_FILE),
  add: (record) => {
    const records = readAll(SCREENINGS_FILE);
    records.unshift(record);
    writeAll(SCREENINGS_FILE, records);
    return record;
  },
};
