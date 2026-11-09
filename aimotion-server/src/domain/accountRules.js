// Reglas puras (sin base de datos ni Express) sobre perfiles y cuentas, para poder probarlas solas.
//
//   Perfiles (roles):
//     USUARIO       persona que usa el chat, los tamizajes y su plan            (tabla users)
//     FUNCIONARIO   igual que el usuario, y ademas ve el historial de los
//                   pacientes y los pacientes que ha atendido                   (tabla users)
//     PSICOLOGO     profesional clinico: alertas, tamizajes, planes             (tabla professionals)
//     ADMIN         control maestro de cuentas: crear, suspender, cambiar
//                   contrasena y eliminar                                       (tabla professionals)

export const ACCOUNT_KINDS = ['usuario', 'profesional'];
export const USER_ROLES = ['USUARIO', 'FUNCIONARIO'];
export const PROFESSIONAL_ROLES = ['PSICOLOGO', 'ADMIN'];
export const ACCOUNT_STATUSES = ['activo', 'suspendido'];

export const STAFF_ROLE = 'FUNCIONARIO';
export const ADMIN_ROLE = 'ADMIN';

export const rolesFor = (kind) => (kind === 'usuario' ? USER_ROLES : kind === 'profesional' ? PROFESSIONAL_ROLES : []);
export const isRoleValidFor = (kind, role) => rolesFor(kind).includes(role);

/** Largo minimo de contrasena segun el tipo de cuenta (los profesionales y admins, una politica mas estricta). */
export const minPasswordLength = (kind) => (kind === 'profesional' ? 12 : 10);

const VERB = { suspend: 'suspender', delete: 'eliminar' };

/**
 * Protecciones para que el administrador no se deje (ni deje al sistema) sin acceso.
 * @param {{ action: 'suspend'|'delete', actor: {id: string}, target: {kind: string, id: string, role: string, status: string}, activeAdmins: number }} p
 * @returns {string|null} mensaje de error, o null si la accion esta permitida
 */
export function checkDestructiveAction({ action, actor, target, activeAdmins }) {
  const verb = VERB[action];
  if (!verb) return 'Acción no válida';
  if (target.kind === 'profesional' && target.id === actor.id) {
    return `No puedes ${verb} tu propia cuenta`;
  }
  if (target.kind === 'profesional' && target.role === ADMIN_ROLE && target.status === 'activo' && activeAdmins <= 1) {
    return `No puedes ${verb} al único administrador activo. Crea o reactiva otro administrador primero.`;
  }
  return null;
}

/** Una sesion deja de valer si la cuenta se suspendio/borro, o si se emitio antes de sessionsValidAfter. */
export function isSessionAllowed(account, issuedAtSec) {
  if (!account) return false;
  if ((account.status || 'activo') !== 'activo') return false;
  if (account.sessionsValidAfter && issuedAtSec) {
    const cutoff = Math.floor(new Date(account.sessionsValidAfter).getTime() / 1000);
    if (Number.isFinite(cutoff) && issuedAtSec < cutoff) return false;
  }
  return true;
}
