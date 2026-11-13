-- Privilegios de MINIMO PRIVILEGIO para el rol de la aplicacion (item 3).
-- Se aplica con `npm run setup-roles` (usa ADMIN_DATABASE_URL). Idempotente.
--
-- El navegador NUNCA habla con la base de datos (solo con la API), asi que no
-- existe una "clave publica de BD" que exponer. El equivalente correcto es que
-- la API use un rol sin DDL, sin DELETE y sin superusuario: aunque alguien
-- lograra ejecutar SQL, no podria borrar tablas, ni leer secretos del sistema,
-- ni cambiar correos/contrasenas/severidades.
GRANT USAGE ON SCHEMA public TO aimotion_app;

-- Control de cuentas del ADMIN (las politicas RLS limitan estas operaciones al rol 'admin').
GRANT SELECT, INSERT, DELETE ON professionals TO aimotion_app;
GRANT UPDATE (password_hash, status, sessions_valid_after) ON professionals TO aimotion_app;

GRANT SELECT, INSERT, DELETE ON users TO aimotion_app;
GRANT UPDATE (role, status, password_hash, sessions_valid_after) ON users TO aimotion_app;
GRANT UPDATE (emergency_contact_name, emergency_contact_phone, emergency_contact_relation, emergency_contact_email, contact_consent_at) ON users TO aimotion_app;

GRANT SELECT, INSERT ON alerts TO aimotion_app;
GRANT UPDATE (email_sent, email_reason, sms_sent, sms_reason, contact_sms_sent, contact_sms_reason, contact_notified_at,
              status, reviewed_at, reviewed_by_id, reviewer_note) ON alerts TO aimotion_app;

GRANT SELECT, INSERT ON screenings TO aimotion_app;
GRANT SELECT, INSERT ON chat_messages TO aimotion_app;

GRANT SELECT, INSERT ON treatment_plans TO aimotion_app;
GRANT UPDATE (weeks, updated_at) ON treatment_plans TO aimotion_app;

GRANT SELECT, INSERT ON staff_attentions TO aimotion_app;

GRANT INSERT ON audit_log TO aimotion_app;
