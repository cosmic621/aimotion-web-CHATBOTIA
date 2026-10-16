// Verifica EN VIVO que las politicas RLS funcionan, usando las dos conexiones reales:
//   ADMIN_DATABASE_URL (dueno, omite RLS) para preparar datos de prueba
//   DATABASE_URL       (rol aimotion_app, sujeto a RLS) para comprobar lo que puede ver/hacer
// Uso: npm run test-rls   (tras `npm run migrate`, `setup-roles` y `migrate:rls`)
import 'dotenv/config';
import pg from 'pg';

const adminUrl = process.env.ADMIN_DATABASE_URL;
const appUrl = process.env.DATABASE_URL;
if (!adminUrl || !appUrl || adminUrl === appUrl) {
  console.error('Necesitas ADMIN_DATABASE_URL y DATABASE_URL (rol aimotion_app) DISTINTAS en .env.');
  process.exit(1);
}
const admin = new pg.Client({ connectionString: adminUrl });
const app = new pg.Client({ connectionString: appUrl });
await admin.connect();
await app.connect();

let pass = 0;
let fail = 0;
const check = (name, ok) => { (ok ? pass++ : fail++); console.log(`${ok ? '  ✔' : '  ✖'} ${name}`); };

/** Ejecuta fn con el contexto indicado, dentro de una transaccion que SIEMPRE se revierte. */
async function as(ctx, fn) {
  await app.query('BEGIN');
  try {
    await app.query("SELECT set_config('app.role', $1, true), set_config('app.user_id', $2, true), set_config('app.session_id', $3, true)", [ctx.role || 'none', ctx.userId || '', ctx.sessionId || '']);
    return await fn();
  } finally {
    await app.query('ROLLBACK');
  }
}
const ids = async (sql, params, ctx) => (await as(ctx, () => app.query(sql, params))).rows.map((r) => r.id).sort();
const denied = async (sql, params, ctx) => { try { await as(ctx, () => app.query(sql, params)); return false; } catch { return true; } };
const affected = async (sql, params, ctx) => (await as(ctx, () => app.query(sql, params))).rowCount;

const A = { role: 'patient', userId: 'rlstest_ua' };
const B = { role: 'patient', userId: 'rlstest_ub' };
const PRO = { role: 'professional', userId: 'rlstest_pro' };
const ANON = (s) => ({ role: 'anon', sessionId: s });
const NONE = {};

try {
  // ---- datos de prueba (con el dueno, que omite RLS)
  await admin.query("INSERT INTO professionals (id, name, email, password_hash, role) VALUES ('rlstest_pro','Pro','rlstest_pro@x.test','h','PSICOLOGO')");
  await admin.query("INSERT INTO users (id, name, email, password_hash) VALUES ('rlstest_ua','A','rlstest_a@x.test','h'), ('rlstest_ub','B','rlstest_b@x.test','h')");
  await admin.query(`INSERT INTO chat_messages (id, session_id, user_id, role, content) VALUES
    ('rlstest_ma','rlstest_sa','rlstest_ua','user','a'), ('rlstest_mb','rlstest_sb','rlstest_ub','user','b'), ('rlstest_mx','rlstest_sx',NULL,'user','x')`);
  await admin.query("INSERT INTO alerts (id, session_id, user_id, category, severity, excerpt) VALUES ('rlstest_al','rlstest_sa','rlstest_ua','autolesion','alto','e')");
  await admin.query("INSERT INTO treatment_plans (id, user_id, professional_id, condition, title, weeks) VALUES ('rlstest_pl','rlstest_ua','rlstest_pro','estres','t','[]')");

  console.log('\nRol de la aplicación');
  const role = (await app.query("SELECT rolsuper, rolbypassrls FROM pg_roles WHERE rolname = current_user")).rows[0];
  check('no es superusuario', role.rolsuper === false);
  check('no puede saltarse RLS (BYPASSRLS)', role.rolbypassrls === false);

  console.log('\nchat_messages');
  const q = "SELECT id FROM chat_messages WHERE id LIKE 'rlstest_%'";
  check('paciente A ve solo SU mensaje', JSON.stringify(await ids(q, [], A)) === '["rlstest_ma"]');
  check('paciente A no ve el mensaje de B ni pidiéndolo por id', (await ids("SELECT id FROM chat_messages WHERE id = 'rlstest_mb'", [], A)).length === 0);
  check('visitante anónimo ve solo su sesión sin cuenta', JSON.stringify(await ids(q, [], ANON('rlstest_sx'))) === '["rlstest_mx"]');
  check('visitante anónimo NO ve mensajes de una sesión ligada a una cuenta', (await ids(q, [], ANON('rlstest_sa'))).length === 0);
  check('profesional ve todos', (await ids(q, [], PRO)).length === 3);
  check('sin contexto no ve nada', (await ids(q, [], NONE)).length === 0);
  check('paciente A no puede escribir como B', await denied("INSERT INTO chat_messages (id, session_id, user_id, role, content) VALUES ('rlstest_n1','s','rlstest_ub','user','x')", [], A));
  check('paciente A sí puede escribir como A', !(await denied("INSERT INTO chat_messages (id, session_id, user_id, role, content) VALUES ('rlstest_n2','s','rlstest_ua','user','x')", [], A)));
  check('anónimo no puede escribir en otra sesión', await denied("INSERT INTO chat_messages (id, session_id, user_id, role, content) VALUES ('rlstest_n3','otra',NULL,'user','x')", [], ANON('rlstest_sx')));

  console.log('\nusers / alerts / screenings');
  check('anónimo no puede leer usuarios', (await ids("SELECT id FROM users WHERE id LIKE 'rlstest_%'", [], ANON('s'))).length === 0);
  check('paciente A ve solo su fila de usuario', JSON.stringify(await ids("SELECT id FROM users WHERE id LIKE 'rlstest_%'", [], A)) === '["rlstest_ua"]');
  check('profesional ve ambos usuarios', (await ids("SELECT id FROM users WHERE id LIKE 'rlstest_%'", [], PRO)).length === 2);
  check('paciente no puede leer alertas', (await ids("SELECT id FROM alerts WHERE id LIKE 'rlstest_%'", [], A)).length === 0);
  check('profesional sí lee alertas', (await ids("SELECT id FROM alerts WHERE id LIKE 'rlstest_%'", [], PRO)).length === 1);
  check('paciente no puede cambiar su correo (permiso por columna)', await denied("UPDATE users SET email = 'otro@x.test' WHERE id = 'rlstest_ua'", [], A));
  check('paciente no puede editar el contacto de otro usuario (0 filas)', (await affected("UPDATE users SET emergency_contact_name = 'x' WHERE id = 'rlstest_ub'", [], A)) === 0);
  check('nadie puede cambiar la severidad de una alerta', await denied("UPDATE alerts SET severity = 'moderado' WHERE id = 'rlstest_al'", [], PRO));

  console.log('\ntreatment_plans');
  check('paciente B no ve el plan de A', (await ids("SELECT id FROM treatment_plans WHERE id LIKE 'rlstest_%'", [], B)).length === 0);
  check('paciente A ve su plan', (await ids("SELECT id FROM treatment_plans WHERE id LIKE 'rlstest_%'", [], A)).length === 1);
  check('paciente no puede crear planes', await denied("INSERT INTO treatment_plans (id, user_id, professional_id, condition, title, weeks) VALUES ('rlstest_p2','rlstest_ua','rlstest_pro','estres','t','[]')", [], A));
  check('profesional no puede crear planes a nombre de otro profesional', await denied("INSERT INTO treatment_plans (id, user_id, professional_id, condition, title, weeks) VALUES ('rlstest_p3','rlstest_ua','otro','estres','t','[]')", [], PRO));

  console.log('\nBorrado y DDL');
  for (const t of ['chat_messages', 'alerts', 'users', 'screenings', 'treatment_plans', 'professionals']) {
    check(`nadie puede borrar en ${t}`, await denied(`DELETE FROM ${t} WHERE id LIKE 'rlstest_%'`, [], { role: 'system' }));
  }
  check('el rol de la aplicación no puede borrar tablas', await denied('DROP TABLE audit_log', [], { role: 'system' }));
} finally {
  for (const sql of [
    "DELETE FROM treatment_plans WHERE id LIKE 'rlstest_%'", "DELETE FROM alerts WHERE id LIKE 'rlstest_%'",
    "DELETE FROM chat_messages WHERE id LIKE 'rlstest_%'", "DELETE FROM users WHERE id LIKE 'rlstest_%'", "DELETE FROM professionals WHERE id LIKE 'rlstest_%'",
  ]) await admin.query(sql).catch(() => {});
  await admin.end();
  await app.end();
}
console.log(`\n${fail === 0 ? '✔ RLS verificado' : '✖ HAY FALLAS'}: ${pass} correctas, ${fail} fallidas.`);
process.exit(fail === 0 ? 0 : 1);
