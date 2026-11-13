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

-- ---------------------------------------------------------------------
-- Contacto de emergencia (padre/madre/acudiente/persona de confianza).
-- Solo se usa si la persona dio su consentimiento explicito al registrarse.
-- ---------------------------------------------------------------------
ALTER TABLE users ADD COLUMN IF NOT EXISTS emergency_contact_name TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS emergency_contact_phone TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS emergency_contact_relation TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS contact_consent_at TIMESTAMPTZ;

-- Trazabilidad de a quien se aviso: la alerta queda ligada a la cuenta (si
-- la hay) y al resultado del SMS enviado al contacto de emergencia.
ALTER TABLE alerts ADD COLUMN IF NOT EXISTS user_id TEXT REFERENCES users(id);
ALTER TABLE alerts ADD COLUMN IF NOT EXISTS contact_sms_sent BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE alerts ADD COLUMN IF NOT EXISTS contact_sms_reason TEXT;
ALTER TABLE alerts ADD COLUMN IF NOT EXISTS contact_notified_at TIMESTAMPTZ;
CREATE INDEX IF NOT EXISTS idx_alerts_user ON alerts(user_id);

-- ---------------------------------------------------------------------
-- Seguridad (v8): el tamizaje queda ligado a la cuenta (si la hay) para que
-- las politicas RLS puedan decidir quien lo ve.
-- ---------------------------------------------------------------------
ALTER TABLE screenings ADD COLUMN IF NOT EXISTS user_id TEXT REFERENCES users(id);
CREATE INDEX IF NOT EXISTS idx_screenings_user ON screenings(user_id);

-- ---------------------------------------------------------------------
-- Perfiles y control de cuentas (v9).
--   users.role          USUARIO (persona que usa el chat) | FUNCIONARIO (igual que el usuario,
--                       y ademas consulta el historial de los pacientes que atiende)
--   professionals.role  PSICOLOGO | ADMIN (control maestro de cuentas)
--   status              activo | suspendido (una cuenta suspendida no puede iniciar sesion)
--   sessions_valid_after  las sesiones emitidas ANTES de esta fecha dejan de valer
--                       (se actualiza al suspender o cambiar la contrasena de una cuenta)
-- ---------------------------------------------------------------------
ALTER TABLE users ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'USUARIO';
ALTER TABLE users ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'activo';
ALTER TABLE users ADD COLUMN IF NOT EXISTS sessions_valid_after TIMESTAMPTZ;
ALTER TABLE professionals ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'activo';
ALTER TABLE professionals ADD COLUMN IF NOT EXISTS sessions_valid_after TIMESTAMPTZ;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'users_role_check') THEN
    ALTER TABLE users ADD CONSTRAINT users_role_check CHECK (role IN ('USUARIO', 'FUNCIONARIO'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'users_status_check') THEN
    ALTER TABLE users ADD CONSTRAINT users_status_check CHECK (status IN ('activo', 'suspendido'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'professionals_status_check') THEN
    ALTER TABLE professionals ADD CONSTRAINT professionals_status_check CHECK (status IN ('activo', 'suspendido'));
  END IF;
END $$;

-- Atenciones: cada vez que un funcionario registra que atendio a un paciente.
-- De aqui sale la lista de "pacientes que ha atendido". La nota se guarda cifrada.
CREATE TABLE IF NOT EXISTS staff_attentions (
  id         TEXT PRIMARY KEY,
  staff_id   TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  patient_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  note       TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_staff_attentions_staff ON staff_attentions(staff_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_staff_attentions_patient ON staff_attentions(patient_id);

-- La bitacora tambien registra a los funcionarios (que son cuentas de la tabla users).
ALTER TABLE audit_log ADD COLUMN IF NOT EXISTS actor_user_id TEXT;

-- Eliminar una cuenta: que pasa con lo que depende de ella.
--   CASCADE   = se borra con la cuenta (chat, tamizajes, planes y atenciones de ese usuario)
--   SET NULL  = se conserva sin vinculo (las alertas de riesgo quedan como registro de seguridad)
-- Las acciones de las claves foraneas las ejecuta Postgres con los permisos del dueno de la tabla.
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN SELECT * FROM (VALUES
    ('chat_messages', 'user_id', 'users', 'c'),
    ('screenings', 'user_id', 'users', 'c'),
    ('treatment_plans', 'user_id', 'users', 'c'),
    ('alerts', 'user_id', 'users', 'n'),
    ('alerts', 'reviewed_by_id', 'professionals', 'n'),
    ('audit_log', 'professional_id', 'professionals', 'n')
  ) AS t(tbl, col, ref, act)
  LOOP
    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint c
      WHERE c.contype = 'f'
        AND c.conrelid = ('public.' || r.tbl)::regclass
        AND c.confrelid = ('public.' || r.ref)::regclass
        AND c.confdeltype = r.act::"char"
        AND c.conkey = ARRAY[(SELECT a.attnum FROM pg_attribute a WHERE a.attrelid = ('public.' || r.tbl)::regclass AND a.attname = r.col)]
    ) THEN
      EXECUTE format('ALTER TABLE %I DROP CONSTRAINT IF EXISTS %I', r.tbl, r.tbl || '_' || r.col || '_fkey');
      EXECUTE format(
        'ALTER TABLE %I ADD CONSTRAINT %I FOREIGN KEY (%I) REFERENCES %I(id) ON DELETE %s',
        r.tbl, r.tbl || '_' || r.col || '_fkey', r.col, r.ref,
        CASE r.act WHEN 'c' THEN 'CASCADE' ELSE 'SET NULL' END
      );
    END IF;
  END LOOP;
END $$;

-- Al eliminar una cuenta, sus alertas de riesgo conservan el registro pero pierden el nombre.
CREATE OR REPLACE FUNCTION anonymize_alerts_of_deleted_user() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS
$$
BEGIN
  UPDATE alerts SET user_name = NULL WHERE user_id = OLD.id;
  RETURN OLD;
END
$$;
DROP TRIGGER IF EXISTS trg_users_anonymize_alerts ON users;
CREATE TRIGGER trg_users_anonymize_alerts BEFORE DELETE ON users
  FOR EACH ROW EXECUTE FUNCTION anonymize_alerts_of_deleted_user();

-- Correo del contacto de emergencia (opcional, cifrado como el resto del contacto): permite avisarle
-- por correo ademas de (o en lugar de) SMS.
ALTER TABLE users ADD COLUMN IF NOT EXISTS emergency_contact_email TEXT;
