import React, { useCallback, useEffect, useState } from 'react';
import { Search, UserPlus, Ban, CheckCircle2, KeyRound, Trash2, UserCog } from 'lucide-react';
import {
  getAccounts, createAccount, setAccountStatus, setAccountPassword, setAccountRole, deleteAccount, AuthError,
} from '../../lib/api';
import { ROLE_LABELS, KIND_LABELS, USER_ROLES, rolesForKind, minPasswordLength } from '../../lib/roles';

const inputClass = 'w-full border-2 border-brand-200 rounded-full px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-600';
const smallBtn = 'flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-full border transition disabled:opacity-40';

function CreateAccountForm({ onCreated, onSessionLost }) {
  const [kind, setKind] = useState('usuario');
  const [role, setRole] = useState('FUNCIONARIO');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const changeKind = (value) => {
    setKind(value);
    setRole(rolesForKind(value)[0]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      await createAccount({ kind, role, name: name.trim(), email: email.trim(), password });
      setName('');
      setEmail('');
      setPassword('');
      onCreated();
    } catch (err) {
      if (err instanceof AuthError) onSessionLost();
      else setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow p-6 mb-6 space-y-3">
      <h3 className="font-bold text-gray-900 flex items-center gap-2">
        <UserPlus className="w-5 h-5 text-brand-600" /> Añadir cuenta
      </h3>
      <div className="grid md:grid-cols-2 gap-3">
        <select value={kind} onChange={(e) => changeKind(e.target.value)} className={inputClass} aria-label="Tipo de cuenta">
          {Object.entries(KIND_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select>
        <select value={role} onChange={(e) => setRole(e.target.value)} className={inputClass} aria-label="Perfil">
          {rolesForKind(kind).map((r) => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
        </select>
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nombre completo" required maxLength={100} className={inputClass} />
        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Correo electrónico" required maxLength={254} className={inputClass} />
      </div>
      <input
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder={`Contraseña (mínimo ${minPasswordLength(kind)} caracteres)`}
        required
        autoComplete="new-password"
        className={inputClass}
      />
      {error && <p className="text-red-600 text-xs">{error}</p>}
      <button type="submit" disabled={saving} className="bg-brand-600 text-white px-5 py-2 rounded-full text-sm font-semibold hover:bg-brand-700 disabled:opacity-50">
        {saving ? 'Creando...' : 'Crear cuenta'}
      </button>
    </form>
  );
}

function AccountRow({ account, isSelf, onChanged, onSessionLost, onSelfPasswordChanged }) {
  const [mode, setMode] = useState(null); // null | 'password' | 'delete'
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const suspended = account.status === 'suspendido';

  const run = async (fn) => {
    setBusy(true);
    setError('');
    try {
      await fn();
      return true;
    } catch (err) {
      if (err instanceof AuthError) onSessionLost();
      else setError(err.message);
      return false;
    } finally {
      setBusy(false);
    }
  };

  const toggleStatus = () =>
    run(async () => {
      await setAccountStatus(account.kind, account.id, suspended ? 'activo' : 'suspendido');
      onChanged();
    });

  const savePassword = async (e) => {
    e.preventDefault();
    const ok = await run(async () => {
      const result = await setAccountPassword(account.kind, account.id, password);
      if (result.ownSessionClosed) onSelfPasswordChanged();
    });
    if (ok) {
      setPassword('');
      setMode(null);
    }
  };

  const changeRole = (role) =>
    run(async () => {
      await setAccountRole(account.kind, account.id, role);
      onChanged();
    });

  const confirmDelete = async () => {
    const ok = await run(async () => {
      await deleteAccount(account.kind, account.id);
      onChanged();
    });
    if (ok) setMode(null);
  };

  return (
    <div className={`bg-white rounded-2xl shadow p-5 border-l-4 ${suspended ? 'border-red-400' : 'border-brand-600'}`}>
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <p className="font-bold text-gray-900">
            {account.name} {isSelf && <span className="text-xs font-normal text-gray-500">(tú)</span>}
          </p>
          <p className="text-sm text-gray-500">{account.email}</p>
          <div className="flex items-center gap-2 mt-2">
            <span className="text-xs px-2 py-1 rounded-full bg-celeste-100 text-celeste-800 font-semibold">{ROLE_LABELS[account.role] || account.role}</span>
            <span className={`text-xs px-2 py-1 rounded-full font-semibold ${suspended ? 'bg-red-100 text-red-700' : 'bg-brand-100 text-brand-700'}`}>
              {suspended ? 'Suspendida' : 'Activa'}
            </span>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 items-center">
          {account.kind === 'usuario' && (
            <label className="flex items-center gap-1 text-xs text-gray-600">
              <UserCog className="w-4 h-4" />
              <select
                value={account.role}
                disabled={busy}
                onChange={(e) => changeRole(e.target.value)}
                className="border border-brand-200 rounded-full px-2 py-1 text-xs"
                aria-label={`Perfil de ${account.name}`}
              >
                {USER_ROLES.map((r) => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
              </select>
            </label>
          )}
          <button
            onClick={toggleStatus}
            disabled={busy || (isSelf && !suspended)}
            title={isSelf ? 'No puedes suspender tu propia cuenta' : undefined}
            className={`${smallBtn} ${suspended ? 'border-brand-600 text-brand-700 hover:bg-brand-50' : 'border-gold-500 text-gold-800 hover:bg-gold-50'}`}
          >
            {suspended ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Ban className="w-3.5 h-3.5" />}
            {suspended ? 'Reactivar' : 'Suspender'}
          </button>
          <button
            onClick={() => setMode(mode === 'password' ? null : 'password')}
            disabled={busy}
            className={`${smallBtn} border-celeste-600 text-celeste-800 hover:bg-celeste-50`}
          >
            <KeyRound className="w-3.5 h-3.5" /> Contraseña
          </button>
          <button
            onClick={() => setMode(mode === 'delete' ? null : 'delete')}
            disabled={busy || isSelf}
            title={isSelf ? 'No puedes eliminar tu propia cuenta' : undefined}
            className={`${smallBtn} border-red-400 text-red-700 hover:bg-red-50`}
          >
            <Trash2 className="w-3.5 h-3.5" /> Eliminar
          </button>
        </div>
      </div>

      {mode === 'password' && (
        <form onSubmit={savePassword} className="mt-4 flex gap-2 flex-wrap">
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={`Nueva contraseña (mínimo ${minPasswordLength(account.kind)} caracteres)`}
            required
            autoComplete="new-password"
            className={`${inputClass} flex-1 min-w-[220px]`}
          />
          <button type="submit" disabled={busy} className="bg-brand-600 text-white px-5 py-2 rounded-full text-sm font-semibold hover:bg-brand-700 disabled:opacity-50">
            Guardar
          </button>
          <p className="w-full text-xs text-gray-500">Al cambiarla se cierran las sesiones abiertas de esta cuenta.</p>
        </form>
      )}

      {mode === 'delete' && (
        <div className="mt-4 bg-red-50 rounded-xl p-4 text-sm">
          <p className="text-red-700 font-semibold">¿Eliminar esta cuenta definitivamente?</p>
          <p className="text-gray-700 mt-1">
            {account.kind === 'usuario'
              ? 'Se borran su chat, tamizajes y planes. Sus alertas de riesgo se conservan sin su nombre. No se puede deshacer.'
              : 'No se puede deshacer. Si tiene planes de tratamiento creados, el sistema no la dejará eliminar: suspéndela en su lugar.'}
          </p>
          <div className="flex gap-2 mt-3">
            <button onClick={confirmDelete} disabled={busy} className="bg-red-600 text-white px-4 py-1.5 rounded-full text-xs font-semibold hover:bg-red-700 disabled:opacity-50">
              Sí, eliminar
            </button>
            <button onClick={() => setMode(null)} className="text-xs text-gray-600 hover:underline">Cancelar</button>
          </div>
        </div>
      )}

      {error && <p className="text-red-600 text-xs mt-3">{error}</p>}
    </div>
  );
}

/** Control maestro de cuentas (solo para el rol ADMIN; el servidor lo vuelve a comprobar en cada acción). */
export default function AccountsAdmin({ currentId, onSessionLost }) {
  const [accounts, setAccounts] = useState([]);
  const [kind, setKind] = useState('');
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async (q = '', k = '') => {
    setLoading(true);
    setError('');
    try {
      setAccounts(await getAccounts({ kind: k || undefined, q: q || undefined }));
    } catch (err) {
      if (err instanceof AuthError) onSessionLost();
      else setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [onSessionLost]);

  useEffect(() => {
    load(query.trim(), kind);
    // la búsqueda por texto se aplica al enviar el formulario
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kind]);

  const reload = () => load(query.trim(), kind);

  return (
    <div>
      <CreateAccountForm onCreated={reload} onSessionLost={onSessionLost} />

      <form
        onSubmit={(e) => {
          e.preventDefault();
          reload();
        }}
        className="flex gap-2 mb-4 flex-wrap"
      >
        <select value={kind} onChange={(e) => setKind(e.target.value)} className="border-2 border-brand-200 rounded-full px-4 py-2 text-sm" aria-label="Filtrar por tipo">
          <option value="">Todas las cuentas</option>
          {Object.entries(KIND_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          maxLength={100}
          placeholder="Buscar por nombre o correo"
          className="flex-1 min-w-[200px] border-2 border-brand-200 rounded-full px-5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-600"
        />
        <button type="submit" className="bg-brand-600 text-white px-5 py-2 rounded-full text-sm font-semibold flex items-center gap-2 hover:bg-brand-700">
          <Search className="w-4 h-4" /> Buscar
        </button>
      </form>

      {error && <p className="text-red-600 text-sm mb-4">{error}</p>}
      {loading && <p className="text-gray-400 text-center py-10">Cargando...</p>}
      {!loading && accounts.length === 0 && <p className="text-gray-500 text-center py-10">No hay cuentas para mostrar.</p>}

      <div className="space-y-3">
        {accounts.map((account) => (
          <AccountRow
            key={`${account.kind}:${account.id}`}
            account={account}
            isSelf={account.kind === 'profesional' && account.id === currentId}
            onChanged={reload}
            onSessionLost={onSessionLost}
            onSelfPasswordChanged={onSessionLost}
          />
        ))}
      </div>
    </div>
  );
}
