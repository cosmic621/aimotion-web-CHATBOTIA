import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  rolesFor, isRoleValidFor, minPasswordLength, checkDestructiveAction, isSessionAllowed,
  USER_ROLES, PROFESSIONAL_ROLES,
} from '../src/domain/accountRules.js';

describe('accountRules: perfiles', () => {
  it('cada tipo de cuenta solo admite sus perfiles', () => {
    assert.deepEqual(rolesFor('usuario'), ['USUARIO', 'FUNCIONARIO']);
    assert.deepEqual(rolesFor('profesional'), ['PSICOLOGO', 'ADMIN']);
    assert.deepEqual(rolesFor('otro'), []);
    assert.ok(isRoleValidFor('usuario', 'FUNCIONARIO'));
    assert.ok(!isRoleValidFor('usuario', 'ADMIN'), 'un usuario no puede nacer administrador');
    assert.ok(!isRoleValidFor('profesional', 'FUNCIONARIO'));
    assert.ok(!isRoleValidFor('inventado', 'ADMIN'));
    assert.equal(USER_ROLES.length + PROFESSIONAL_ROLES.length, 4);
  });
  it('profesionales y administradores exigen una contraseña más larga', () => {
    assert.equal(minPasswordLength('usuario'), 10);
    assert.equal(minPasswordLength('profesional'), 12);
  });
});

describe('accountRules: protecciones del administrador', () => {
  const actor = { id: 'a1' };
  const admin = (o = {}) => ({ kind: 'profesional', id: 'a2', role: 'ADMIN', status: 'activo', ...o });
  it('no puede suspender ni eliminar su propia cuenta', () => {
    for (const action of ['suspend', 'delete']) {
      assert.match(checkDestructiveAction({ action, actor, target: admin({ id: 'a1' }), activeAdmins: 3 }), /tu propia cuenta/);
    }
  });
  it('no puede quitar al único administrador activo', () => {
    assert.match(checkDestructiveAction({ action: 'delete', actor, target: admin(), activeAdmins: 1 }), /único administrador/);
    assert.match(checkDestructiveAction({ action: 'suspend', actor, target: admin(), activeAdmins: 1 }), /único administrador/);
  });
  it('con otro administrador activo sí puede', () => {
    assert.equal(checkDestructiveAction({ action: 'delete', actor, target: admin(), activeAdmins: 2 }), null);
  });
  it('un administrador ya suspendido no cuenta como "el único activo"', () => {
    assert.equal(checkDestructiveAction({ action: 'delete', actor, target: admin({ status: 'suspendido' }), activeAdmins: 1 }), null);
  });
  it('usuarios, funcionarios y psicólogos se pueden suspender o eliminar', () => {
    for (const target of [
      { kind: 'usuario', id: 'u1', role: 'USUARIO', status: 'activo' },
      { kind: 'usuario', id: 'u2', role: 'FUNCIONARIO', status: 'activo' },
      { kind: 'profesional', id: 'p9', role: 'PSICOLOGO', status: 'activo' },
    ]) {
      assert.equal(checkDestructiveAction({ action: 'suspend', actor, target, activeAdmins: 1 }), null);
      assert.equal(checkDestructiveAction({ action: 'delete', actor, target, activeAdmins: 1 }), null);
    }
  });
  it('un id de usuario igual al del admin NO se confunde con él (son tablas distintas)', () => {
    assert.equal(checkDestructiveAction({ action: 'delete', actor, target: { kind: 'usuario', id: 'a1', role: 'USUARIO', status: 'activo' }, activeAdmins: 1 }), null);
  });
  it('rechaza acciones desconocidas', () => {
    assert.equal(checkDestructiveAction({ action: 'explotar', actor, target: admin(), activeAdmins: 5 }), 'Acción no válida');
  });
});

describe('accountRules: ¿sigue valiendo la sesión?', () => {
  const at = (iso) => Math.floor(new Date(iso).getTime() / 1000);
  it('cuenta inexistente (eliminada) → no', () => assert.equal(isSessionAllowed(null, 100), false));
  it('cuenta suspendida → no', () => assert.equal(isSessionAllowed({ status: 'suspendido' }, 100), false));
  it('cuenta activa sin fecha de corte → sí (también cuentas antiguas sin columna status)', () => {
    assert.equal(isSessionAllowed({ status: 'activo' }, 100), true);
    assert.equal(isSessionAllowed({}, 100), true);
  });
  it('sesión emitida ANTES de un cambio de contraseña → no; después → sí', () => {
    const acc = { status: 'activo', sessionsValidAfter: '2026-11-08T10:00:00Z' };
    assert.equal(isSessionAllowed(acc, at('2026-11-08T09:59:59Z')), false);
    assert.equal(isSessionAllowed(acc, at('2026-11-08T10:00:00Z')), true);
    assert.equal(isSessionAllowed(acc, at('2026-11-08T10:05:00Z')), true);
  });
});
