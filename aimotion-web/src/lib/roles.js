// Perfiles de cuenta. Deben coincidir con aimotion-server/src/domain/accountRules.js.
export const ROLE_LABELS = {
  USUARIO: 'Usuario',
  FUNCIONARIO: 'Funcionario',
  PSICOLOGO: 'Psicólogo/a',
  ADMIN: 'Administrador',
};

export const USER_ROLES = ['USUARIO', 'FUNCIONARIO'];
export const PROFESSIONAL_ROLES = ['PSICOLOGO', 'ADMIN'];

export const KIND_LABELS = { usuario: 'Usuario / funcionario', profesional: 'Profesional / administrador' };
export const rolesForKind = (kind) => (kind === 'profesional' ? PROFESSIONAL_ROLES : USER_ROLES);
export const minPasswordLength = (kind) => (kind === 'profesional' ? 12 : 10);
