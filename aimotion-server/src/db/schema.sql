-- Esquema de base de datos de AIMotion (PostgreSQL).
-- Ejecutar con: npm run migrate  (ver src/db/migrate.js)
-- Es idempotente: puede correrse varias veces sin duplicar nada.

CREATE TABLE IF NOT EXISTS professionals (
  id            TEXT PRIMARY KEY,
  name          TEXT NOT NULL,
  email         TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role          TEXT NOT NULL DEFAULT 'PSICOLOGO' CHECK (role IN ('PSICOLOGO', 'ADMIN')),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS alerts (
  id             TEXT PRIMARY KEY,
  session_id     TEXT NOT NULL,
  user_name      TEXT,
  category       TEXT NOT NULL,
  severity       TEXT NOT NULL CHECK (severity IN ('moderado', 'alto', 'critico')),
  excerpt        TEXT NOT NULL,
  source         TEXT NOT NULL DEFAULT 'chat',
  status         TEXT NOT NULL DEFAULT 'pendiente' CHECK (status IN ('pendiente', 'revisado')),
  email_sent     BOOLEAN NOT NULL DEFAULT false,
  email_reason   TEXT,
  sms_sent       BOOLEAN NOT NULL DEFAULT false,
  sms_reason     TEXT,
  reviewer_note  TEXT,
  reviewed_at    TIMESTAMPTZ,
  reviewed_by_id TEXT REFERENCES professionals(id),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_alerts_status ON alerts(status);
CREATE INDEX IF NOT EXISTS idx_alerts_session ON alerts(session_id);

CREATE TABLE IF NOT EXISTS screenings (
  id          TEXT PRIMARY KEY,
  session_id  TEXT NOT NULL,
  user_name   TEXT,
  type        TEXT NOT NULL CHECK (type IN ('PHQ-9', 'GAD-7')),
  answers     JSONB NOT NULL,
  total_score INTEGER NOT NULL,
  severity    TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_screenings_session ON screenings(session_id);

-- Bitacora de auditoria: quien vio que alerta/tamizaje y cuando (Fase 4 del
-- plan, se deja la tabla lista desde ya para no migrar de nuevo mas adelante).
CREATE TABLE IF NOT EXISTS audit_log (
  id              TEXT PRIMARY KEY,
  professional_id TEXT REFERENCES professionals(id),
  action          TEXT NOT NULL,
  resource_type   TEXT NOT NULL,
  resource_id     TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
