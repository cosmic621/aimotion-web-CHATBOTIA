import { Router } from 'express';
import { nanoid } from 'nanoid';
import { v, validate, idSchema } from '../security/validate.js';
import { checkPassword } from '../security/passwordPolicy.js';
import { parsePagination, setPaginationHeaders } from '../security/pagination.js';
import { adminCtx } from '../db/context.js';
import { wrap, paginationQuery } from './helpers.js';
import {
  ACCOUNT_KINDS, ACCOUNT_STATUSES, USER_ROLES, PROFESSIONAL_ROLES,
  isRoleValidFor, minPasswordLength, checkDestructiveAction,
} from '../domain/accountRules.js';

const kindSchema = v.enum(ACCOUNT_KINDS, { label: 'El tipo de cuenta' });
const accountParams = v.object({ kind: kindSchema, id: idSchema('El identificador') });
const passwordField = v.string({ min: 1, max: 128, trim: false, label: 'La contraseña' });

const listQuery = v.object({ kind: kindSchema.optional(), q: v.string({ max: 100, label: 'La búsqueda' }).optional(), ...paginationQuery });
const createSchema = v.object({
  kind: kindSchema,
  name: v.string({ min: 1, max: 100, label: 'El nombre' }),
  email: v.email({ label: 'El correo' }),
  password: passwordField,
  role: v.enum([...USER_ROLES, ...PROFESSIONAL_ROLES], { label: 'El perfil' }),
});
const statusSchema = v.object({ status: v.enum(ACCOUNT_STATUSES, { label: 'El estado' }) });
const passwordSchema = v.object({ password: passwordField });
const roleSchema = v.object({ role: v.enum(USER_ROLES, { label: 'El perfil' }) });

// El guardia de sesiones distingue 'professional' | 'patient'.
const sessionKind = (kind) => (kind === 'profesional' ? 'professional' : 'patient');

/**
 * Administrador (profesional con rol ADMIN).
 *  - /metrics: estado operativo (consultas, limitadores, RLS).
 *  - /accounts: control maestro de cuentas: listar, crear, suspender/reactivar, cambiar contrasena,
 *    cambiar el perfil de un usuario (USUARIO <-> FUNCIONARIO) y eliminar.
 * Estas rutas usan el contexto 'admin' de la base de datos, que NO puede leer contenido clinico
 * (chat, tamizajes): solo administra cuentas. (Como todo ADMIN es tambien profesional, sigue usando
 * las rutas de profesional como siempre.)
 * Cada accion queda en la bitacora; las contrasenas nunca se registran.
 */
export function createAdminRouter({ db, limiters, redactedConfig, repos, audit, hasher, sessionGuard }) {
  const router = Router();

  router.get('/metrics', (req, res) => {
    res.json({
      uptimeSec: Math.round(process.uptime()),
      rlsActive: db.isRlsActive(),
      db: db.metrics(),
      rateLimiters: Object.values(limiters).map((l) => l.stats?.()).filter(Boolean),
      config: redactedConfig,
    });
  });

  const record = (ctx, req, action, resourceId) =>
    audit(ctx, { professionalId: req.professional.id, action, resourceType: 'account', resourceId });

  /** Carga la cuenta objetivo o responde 404. */
  async function loadTarget(ctx, req, res) {
    const { kind, id } = req.valid.params;
    const target = await repos.accounts.get(ctx, kind, id);
    if (!target) {
      res.status(404).json({ error: 'Cuenta no encontrada' });
      return null;
    }
    return target;
  }

  router.get('/accounts', validate({ query: listQuery }), wrap(async (req, res) => {
    const page = parsePagination(req.valid.query);
    if (!page.ok) return res.status(400).json({ error: page.error });
    const { kind, q } = req.valid.query;
    const accounts = await repos.accounts.list(adminCtx(req.professional), { kind, q, ...page });
    setPaginationHeaders(res, { ...page, returned: accounts.length });
    return res.json(accounts);
  }));

  router.post('/accounts', validate({ body: createSchema }), wrap(async (req, res) => {
    const { kind, name, email, password, role } = req.valid.body;
    if (!isRoleValidFor(kind, role)) return res.status(400).json({ error: 'Ese perfil no corresponde al tipo de cuenta' });
    const pw = checkPassword(password, { email, name, minLength: minPasswordLength(kind) });
    if (!pw.ok) return res.status(400).json({ error: pw.reason });

    const ctx = adminCtx(req.professional);
    // El correo no se repite en ninguna de las dos tablas (evita cuentas confusas con el mismo correo).
    const [asUser, asPro] = await Promise.all([repos.users.findByEmail(ctx, email), repos.professionals.findByEmail(ctx, email)]);
    if (asUser || asPro) return res.status(409).json({ error: 'Ya existe una cuenta con ese correo' });

    const passwordHash = await hasher.hash(password);
    const id = nanoid(12);
    const created = kind === 'usuario'
      ? await repos.users.create(ctx, { id, name, email, passwordHash, contact: null, role })
      : await repos.professionals.create(ctx, { id, name, email, passwordHash, role });
    await record(ctx, req, 'admin_create_account', id);
    return res.status(201).json({ id: created.id, kind, name: created.name, email: created.email, role: created.role, status: 'activo', createdAt: created.createdAt });
  }));

  router.patch('/accounts/:kind/:id/status', validate({ params: accountParams, body: statusSchema }), wrap(async (req, res) => {
    const ctx = adminCtx(req.professional);
    const target = await loadTarget(ctx, req, res);
    if (!target) return undefined;
    const { status } = req.valid.body;
    if (status === 'suspendido') {
      const activeAdmins = await repos.accounts.countActiveAdmins(ctx);
      const blocked = checkDestructiveAction({ action: 'suspend', actor: req.professional, target, activeAdmins });
      if (blocked) return res.status(409).json({ error: blocked });
    }
    const updated = await repos.accounts.setStatus(ctx, target.kind, target.id, status);
    sessionGuard.invalidate(sessionKind(target.kind), target.id);
    await record(ctx, req, status === 'suspendido' ? 'admin_suspend_account' : 'admin_activate_account', target.id);
    return res.json(updated);
  }));

  router.patch('/accounts/:kind/:id/password', validate({ params: accountParams, body: passwordSchema }), wrap(async (req, res) => {
    const ctx = adminCtx(req.professional);
    const target = await loadTarget(ctx, req, res);
    if (!target) return undefined;
    const pw = checkPassword(req.valid.body.password, { email: target.email, name: target.name, minLength: minPasswordLength(target.kind) });
    if (!pw.ok) return res.status(400).json({ error: pw.reason });
    const passwordHash = await hasher.hash(req.valid.body.password);
    const updated = await repos.accounts.setPassword(ctx, target.kind, target.id, passwordHash); // tambien cierra sus sesiones abiertas
    sessionGuard.invalidate(sessionKind(target.kind), target.id);
    await record(ctx, req, 'admin_change_password', target.id);
    return res.json({ account: updated, ownSessionClosed: target.kind === 'profesional' && target.id === req.professional.id });
  }));

  router.patch('/accounts/:kind/:id/role', validate({ params: accountParams, body: roleSchema }), wrap(async (req, res) => {
    const ctx = adminCtx(req.professional);
    const target = await loadTarget(ctx, req, res);
    if (!target) return undefined;
    if (target.kind !== 'usuario') return res.status(400).json({ error: 'Solo se puede cambiar el perfil de cuentas de usuario' });
    const updated = await repos.accounts.setUserRole(ctx, target.id, req.valid.body.role);
    sessionGuard.invalidate('patient', target.id);
    await record(ctx, req, 'admin_change_role', target.id);
    return res.json(updated);
  }));

  router.delete('/accounts/:kind/:id', validate({ params: accountParams }), wrap(async (req, res) => {
    const ctx = adminCtx(req.professional);
    const target = await loadTarget(ctx, req, res);
    if (!target) return undefined;
    const activeAdmins = await repos.accounts.countActiveAdmins(ctx);
    const blocked = checkDestructiveAction({ action: 'delete', actor: req.professional, target, activeAdmins });
    if (blocked) return res.status(409).json({ error: blocked });
    const removed = await repos.accounts.remove(ctx, target.kind, target.id);
    if (!removed) return res.status(404).json({ error: 'Cuenta no encontrada' });
    sessionGuard.invalidate(sessionKind(target.kind), target.id);
    await record(ctx, req, 'admin_delete_account', target.id);
    return res.json({ ok: true });
  }));

  return router;
}
