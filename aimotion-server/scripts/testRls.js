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
const FN = { role: 'staff', userId: 'rlstest_fn' };
const ADMIN = { role: 'admin', userId: 'rlstest_pro' };
const ANON = (s) => ({ role: 'anon', sessionId: s });
const NONE = {};

try {
  // ---- datos de prueba (con el dueno, que omite RLS)
  await admin.query("INSERT INTO professionals (id, name, email, password_hash, role) VALUES ('rlstest_pro','Pro','rlstest_pro@x.test','h','PSICOLOGO')");
  await admin.query("INSERT INTO users (id, name, email, password_hash) VALUES ('rlstest_ua','A','rlstest_a@x.test','h'), ('rlstest_ub','B','rlstest_b@x.test','h')");
  await admin.query("INSERT INTO users (id, name, email, password_hash, role) VALUES ('rlstest_fn','F','rlstest_fn@x.test','h','FUNCIONARIO'), ('rlstest_fn2','F2','rlstest_fn2@x.test','h','FUNCIONARIO')");
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
  check('profesional ve todos los usuarios', (await ids("SELECT id FROM users WHERE id LIKE 'rlstest_%'", [], PRO)).length === 4);
  check('paciente no puede leer alertas', (await ids("SELECT id FROM alerts WHERE id LIKE 'rlstest_%'", [], A)).length === 0);
  check('profesional sí lee alertas', (await ids("SELECT id FROM alerts WHERE id LIKE 'rlstest_%'", [], PRO)).length === 1);
  check('paciente no puede cambiar su correo (permiso por columna)', await denied("UPDATE users SET email = 'otro@x.test' WHERE id = 'rlstest_ua'", [], A));
  check('paciente no puede editar el contacto de otro usuario (0 filas)', (await affected("UPDATE users SET emergency_contact_name = 'x' WHERE id = 'rlstest_ub'", [], A)) === 0);
  check('nadie puede cambiar la severidad de una alerta', await denied("UPDATE alerts SET severity = 'moderado' WHERE id = 'rlstest_al'", [], PRO));

  console.log('\nfuncionario (staff) y administrador (admin)');
  check('funcionario ve a los pacientes y a sí mismo, NO a otro funcionario', JSON.stringify(await ids("SELECT id FROM users WHERE id LIKE 'rlstest_%'", [], FN)) === '["rlstest_fn","rlstest_ua","rlstest_ub"]');
  check('funcionario lee el chat de los pacientes con cuenta (no el anónimo)', (await ids(q, [], FN)).length === 2);
  check('funcionario NO lee alertas', (await ids("SELECT id FROM alerts WHERE id LIKE 'rlstest_%'", [], FN)).length === 0);
  check('funcionario lee los planes de los pacientes', (await ids("SELECT id FROM treatment_plans WHERE id LIKE 'rlstest_%'", [], FN)).length === 1);
  check('funcionario no puede crear planes', await denied("INSERT INTO treatment_plans (id, user_id, professional_id, condition, title, weeks) VALUES ('rlstest_p4','rlstest_ua','rlstest_pro','estres','t','[]')", [], FN));
  check('funcionario registra una atención propia', !(await denied("INSERT INTO staff_attentions (id, staff_id, patient_id) VALUES ('rlstest_at1','rlstest_fn','rlstest_ua')", [], FN)));
  check('funcionario NO puede registrar una atención a nombre de otro', await denied("INSERT INTO staff_attentions (id, staff_id, patient_id) VALUES ('rlstest_at2','rlstest_fn2','rlstest_ua')", [], FN));
  check('un paciente no puede ascenderse a funcionario', (await as(A, async () => {
    await app.query("UPDATE users SET role = 'FUNCIONARIO' WHERE id = 'rlstest_ua'");
    return (await app.query("SELECT role FROM users WHERE id = 'rlstest_ua'")).rows[0].role;
  })) === 'USUARIO');
  check('un paciente no puede reactivar ni cambiar su propia contraseña', (await as(A, async () => {
    await app.query("UPDATE users SET password_hash = 'otra', status = 'activo' WHERE id = 'rlstest_ua'");
    return (await app.query("SELECT password_hash FROM users WHERE id = 'rlstest_ua'")).rows[0].password_hash;
  })) === 'h');
  check('el admin sí suspende y cambia contraseñas de cuentas', (await affected("UPDATE users SET status = 'suspendido', password_hash = 'nueva' WHERE id = 'rlstest_ua'", [], ADMIN)) === 1);
  check('el profesional NO puede suspender cuentas (0 filas)', (await affected("UPDATE users SET status = 'suspendido' WHERE id = 'rlstest_ua'", [], PRO)) === 0);
  check('el admin crea cuentas; el profesional no', !(await denied("INSERT INTO users (id, name, email, password_hash, role) VALUES ('rlstest_n9','N','rlstest_n9@x.test','h','FUNCIONARIO')", [], ADMIN))
    && await denied("INSERT INTO users (id, name, email, password_hash, role) VALUES ('rlstest_n8','N','rlstest_n8@x.test','h','FUNCIONARIO')", [], PRO));
  check('el contexto admin (rutas /api/admin) NO lee contenido clínico', (await ids(q, [], ADMIN)).length === 0);

  console.log('\ntreatment_plans');
  check('paciente B no ve el plan de A', (await ids("SELECT id FROM treatment_plans WHERE id LIKE 'rlstest_%'", [], B)).length === 0);
  check('paciente A ve su plan', (await ids("SELECT id FROM treatment_plans WHERE id LIKE 'rlstest_%'", [], A)).length === 1);
  check('paciente no puede crear planes', await denied("INSERT INTO treatment_plans (id, user_id, professional_id, condition, title, weeks) VALUES ('rlstest_p2','rlstest_ua','rlstest_pro','estres','t','[]')", [], A));
  check('profesional no puede crear planes a nombre de otro profesional', await denied("INSERT INTO treatment_plans (id, user_id, professional_id, condition, title, weeks) VALUES ('rlstest_p3','rlstest_ua','otro','estres','t','[]')", [], PRO));

  console.log('\nBorrado y DDL');
  for (const t of ['chat_messages', 'alerts', 'screenings', 'treatment_plans']) {
    check(`nadie puede borrar en ${t}`, await denied(`DELETE FROM ${t} WHERE id LIKE 'rlstest_%'`, [], { role: 'system' }));
  }
  // Cuentas (v9): solo el ADMIN las borra. Para los demas roles la politica deja 0 filas afectadas.
  for (const t of ['users', 'professionals']) {
      check(`solo el admin puede borrar en ${t} (system, paciente y profesional: 0 filas)`,
      (await affected(`DELETE FROM ${t} WHERE id = 'rlstest_zz'`, [], { role: 'system' })) === 0
      && (await affected(`DELETE FROM ${t} WHERE id = 'rlstest_zz'`, [], A)) === 0
      && (await affected(`DELETE FROM ${t} WHERE id = 'rlstest_zz'`, [], PRO)) === 0);
  }
  check('el rol de la aplicación no puede borrar tablas', await denied('DROP TABLE audit_log', [], { role: 'system' }));
} finally {
  for (const sql of [
    "DELETE FROM treatment_plans WHERE id LIKE 'rlstest_%'", "DELETE FROM alerts WHERE id LIKE 'rlstest_%'",
    "DELETE FROM staff_attentions WHERE id LIKE 'rlstest_%'", "DELETE FROM chat_messages WHERE id LIKE 'rlstest_%'", "DELETE FROM users WHERE id LIKE 'rlstest_%'", "DELETE FROM professionals WHERE id LIKE 'rlstest_%'",
  ]) await admin.query(sql).catch(() => {});
  await admin.end();
  await app.end();
}
console.log(`\n${fail === 0 ? '✔ RLS verificado' : '✖ HAY FALLAS'}: ${pass} correctas, ${fail} fallidas.`);
process.exit(fail === 0 ? 0 : 1);
