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

-- Cuentas de paciente/usuario (opcionales: el chat tambien funciona de forma
-- anonima por sesion). Crear una cuenta permite que el historial persista
-- entre visitas y que el profesional le de seguimiento real a una persona,
-- no solo a una sesion suelta.
CREATE TABLE IF NOT EXISTS users (
  id            TEXT PRIMARY KEY,
  name          TEXT NOT NULL,
  email         TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Trazabilidad del chat: cada turno (mensaje de la persona + respuesta del
-- bot) queda registrado, asociado a la cuenta si inicio sesion, o solo a la
-- sesion anonima si no. Esto es lo que permite al profesional revisar como
-- ha sido el uso del chatbot con una persona a lo largo del tiempo.
CREATE TABLE IF NOT EXISTS chat_messages (
  id          TEXT PRIMARY KEY,
  session_id  TEXT NOT NULL,
  user_id     TEXT REFERENCES users(id),
  role        TEXT NOT NULL CHECK (role IN ('user', 'bot')),
  content     TEXT NOT NULL,
  topic       TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_chat_messages_session ON chat_messages(session_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_user ON chat_messages(user_id);

-- Planes de tratamiento semanales: SIEMPRE creados/asignados por un
-- profesional (professional_id NOT NULL), nunca generados de forma autonoma
-- por el bot. El bot y el paciente solo pueden leerlos y marcar avance.
CREATE TABLE IF NOT EXISTS treatment_plans (
  id              TEXT PRIMARY KEY,
  user_id         TEXT NOT NULL REFERENCES users(id),
  professional_id TEXT NOT NULL REFERENCES professionals(id),
  condition       TEXT NOT NULL CHECK (condition IN ('depresion', 'ansiedad', 'estres', 'esquizofrenia')),
  title           TEXT NOT NULL,
  weeks           JSONB NOT NULL, -- [{ week_number, title, description, completed }]
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_treatment_plans_user ON treatment_plans(user_id);
