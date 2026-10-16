-- Row Level Security (item 4). Se aplica con `npm run migrate:rls`. Idempotente.
--
-- Cada consulta de la API corre dentro de una transaccion con estas variables
-- (las fija src/db/db.js con set_config):
--   app.role        system | anon | patient | professional
--   app.user_id     id de la cuenta (paciente o profesional)
--   app.session_id  id de la sesion anonima del chat
-- Las politicas restringen que FILAS puede ver/modificar cada rol, aunque el
-- codigo de la API tuviera un error (defensa en profundidad contra IDOR).
-- Aplican al rol de la aplicacion; el dueno de las tablas (ADMIN_DATABASE_URL) las omite.
-- Sin politica para una operacion = operacion DENEGADA (p. ej. DELETE).

CREATE OR REPLACE FUNCTION app_role() RETURNS text LANGUAGE sql STABLE AS
$$ SELECT COALESCE(NULLIF(current_setting('app.role', true), ''), 'none') $$;
CREATE OR REPLACE FUNCTION app_uid() RETURNS text LANGUAGE sql STABLE AS
$$ SELECT NULLIF(current_setting('app.user_id', true), '') $$;
CREATE OR REPLACE FUNCTION app_session() RETURNS text LANGUAGE sql STABLE AS
$$ SELECT NULLIF(current_setting('app.session_id', true), '') $$;

ALTER TABLE professionals   ENABLE ROW LEVEL SECURITY;
ALTER TABLE users           ENABLE ROW LEVEL SECURITY;
ALTER TABLE alerts          ENABLE ROW LEVEL SECURITY;
ALTER TABLE screenings      ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages   ENABLE ROW LEVEL SECURITY;
ALTER TABLE treatment_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log       ENABLE ROW LEVEL SECURITY;

-- ---- professionals: solo lectura (login por system; consulta por profesionales)
DROP POLICY IF EXISTS professionals_select ON professionals;
CREATE POLICY professionals_select ON professionals FOR SELECT
  USING (app_role() IN ('system', 'professional'));

-- ---- users
DROP POLICY IF EXISTS users_select ON users;
CREATE POLICY users_select ON users FOR SELECT
  USING (app_role() IN ('system', 'professional') OR (app_role() = 'patient' AND id = app_uid()));
DROP POLICY IF EXISTS users_insert ON users;
CREATE POLICY users_insert ON users FOR INSERT
  WITH CHECK (app_role() = 'system');
DROP POLICY IF EXISTS users_update ON users;
CREATE POLICY users_update ON users FOR UPDATE
  USING (app_role() = 'system' OR (app_role() = 'patient' AND id = app_uid()))
  WITH CHECK (app_role() = 'system' OR (app_role() = 'patient' AND id = app_uid()));

-- ---- alerts: cualquiera puede ENVIAR una; solo profesionales/sistema las LEEN
DROP POLICY IF EXISTS alerts_insert ON alerts;
CREATE POLICY alerts_insert ON alerts FOR INSERT
  WITH CHECK (app_role() = 'system'
           OR (app_role() = 'patient' AND user_id = app_uid())
           OR (app_role() = 'anon' AND user_id IS NULL));
DROP POLICY IF EXISTS alerts_select ON alerts;
CREATE POLICY alerts_select ON alerts FOR SELECT
  USING (app_role() IN ('system', 'professional'));
DROP POLICY IF EXISTS alerts_update ON alerts;
CREATE POLICY alerts_update ON alerts FOR UPDATE
  USING (app_role() IN ('system', 'professional'))
  WITH CHECK (app_role() IN ('system', 'professional'));

-- ---- screenings
DROP POLICY IF EXISTS screenings_insert ON screenings;
CREATE POLICY screenings_insert ON screenings FOR INSERT
  WITH CHECK (app_role() = 'system'
           OR (app_role() = 'patient' AND user_id = app_uid())
           OR (app_role() = 'anon' AND user_id IS NULL));
DROP POLICY IF EXISTS screenings_select ON screenings;
CREATE POLICY screenings_select ON screenings FOR SELECT
  USING (app_role() IN ('system', 'professional'));

-- ---- chat_messages: cada persona solo ve lo suyo; el visitante anonimo, solo su sesion sin cuenta
DROP POLICY IF EXISTS chat_insert ON chat_messages;
CREATE POLICY chat_insert ON chat_messages FOR INSERT
  WITH CHECK (app_role() = 'system'
           OR (app_role() = 'patient' AND user_id = app_uid())
           OR (app_role() = 'anon' AND user_id IS NULL AND session_id = app_session()));
DROP POLICY IF EXISTS chat_select ON chat_messages;
CREATE POLICY chat_select ON chat_messages FOR SELECT
  USING (app_role() IN ('system', 'professional')
      OR (app_role() = 'patient' AND user_id = app_uid())
      OR (app_role() = 'anon' AND user_id IS NULL AND session_id = app_session()));

-- ---- treatment_plans: los crea un profesional (como autor); el paciente solo ve y marca los suyos
DROP POLICY IF EXISTS plans_select ON treatment_plans;
CREATE POLICY plans_select ON treatment_plans FOR SELECT
  USING (app_role() IN ('system', 'professional') OR (app_role() = 'patient' AND user_id = app_uid()));
DROP POLICY IF EXISTS plans_insert ON treatment_plans;
CREATE POLICY plans_insert ON treatment_plans FOR INSERT
  WITH CHECK (app_role() = 'system' OR (app_role() = 'professional' AND professional_id = app_uid()));
DROP POLICY IF EXISTS plans_update ON treatment_plans;
CREATE POLICY plans_update ON treatment_plans FOR UPDATE
  USING (app_role() IN ('system', 'professional') OR (app_role() = 'patient' AND user_id = app_uid()))
  WITH CHECK (app_role() IN ('system', 'professional') OR (app_role() = 'patient' AND user_id = app_uid()));

-- ---- audit_log: cualquiera con contexto valido escribe; solo el sistema lee
DROP POLICY IF EXISTS audit_insert ON audit_log;
CREATE POLICY audit_insert ON audit_log FOR INSERT
  WITH CHECK (app_role() <> 'none');
DROP POLICY IF EXISTS audit_select ON audit_log;
CREATE POLICY audit_select ON audit_log FOR SELECT
  USING (app_role() = 'system');
