import React, { useCallback, useEffect, useState } from 'react';
import { ArrowLeft, Search, Users, UserCheck, ClipboardList, MessageCircle, LogOut, CheckCircle2, Circle } from 'lucide-react';
import { getStaffPatients, getStaffPatientHistory, getStaffAttended, recordAttention, logoutPatient, AuthError } from '../../lib/api';
import { usePatientSession, clearPatientSession } from '../../lib/patientSession';
import PatientAuth from '../Auth/PatientAuth';

const fmt = (d) => (d ? new Date(d).toLocaleString('es-CO') : 'Sin actividad');

const CONDITION_LABELS = { depresion: 'Depresión', ansiedad: 'Ansiedad', estres: 'Estrés', esquizofrenia: 'Esquizofrenia' };

function PatientHistory({ patientId, onBack, onAttentionSaved, onSessionLost }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const load = useCallback(async () => {
    setError('');
    try {
      setData(await getStaffPatientHistory(patientId));
    } catch (err) {
      if (err instanceof AuthError) onSessionLost();
      else setError(err.message);
    }
  }, [patientId, onSessionLost]);

  useEffect(() => {
    load();
  }, [load]);

  const handleAttend = async (e) => {
    e.preventDefault();
    setSaving(true);
    setSaved(false);
    setError('');
    try {
      await recordAttention(patientId, note.trim());
      setNote('');
      setSaved(true);
      await load();
      onAttentionSaved();
    } catch (err) {
      if (err instanceof AuthError) onSessionLost();
      else setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <button onClick={onBack} className="flex items-center gap-1 text-brand-600 text-sm hover:underline">
        <ArrowLeft className="w-4 h-4" /> Volver
      </button>

      {error && <p className="text-red-600 text-sm">{error}</p>}
      {!data && !error && <p className="text-gray-400 text-center py-10">Cargando historial...</p>}

      {data && (
        <>
          <div className="bg-white rounded-2xl shadow p-6">
            <h3 className="text-2xl font-bold text-gray-900">{data.patient.name}</h3>
            <p className="text-sm text-gray-500">{data.patient.email}</p>
          </div>

          <form onSubmit={handleAttend} className="bg-gold-50 border-l-4 border-gold-400 rounded-2xl p-6 space-y-3">
            <h4 className="font-bold text-gray-900">Registrar que atendiste a este paciente</h4>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              maxLength={1000}
              rows={3}
              placeholder="Nota opcional de la atención (solo la verás tú)"
              className="w-full border-2 border-gold-300 rounded-2xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-600"
            />
            <div className="flex items-center gap-3">
              <button
                type="submit"
                disabled={saving}
                className="bg-brand-600 text-white px-5 py-2 rounded-full text-sm font-semibold hover:bg-brand-700 disabled:opacity-50"
              >
                {saving ? 'Guardando...' : 'Registrar atención'}
              </button>
              {saved && <span className="text-brand-700 text-sm font-semibold">Atención registrada ✓</span>}
            </div>
            {data.attentions.length > 0 && (
              <ul className="text-sm text-gray-700 space-y-1 pt-2">
                {data.attentions.map((a) => (
                  <li key={a.id}>
                    <span className="text-gray-500">{fmt(a.createdAt)}</span>
                    {a.note ? ` · ${a.note}` : ''}
                  </li>
                ))}
              </ul>
            )}
          </form>

          <section className="bg-white rounded-2xl shadow p-6">
            <h4 className="font-bold text-gray-900 flex items-center gap-2 mb-4">
              <MessageCircle className="w-5 h-5 text-brand-600" /> Conversación con el asistente ({data.messages.length})
            </h4>
            {data.messages.length === 0 && <p className="text-gray-500 text-sm">Esta persona aún no tiene mensajes.</p>}
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {data.messages.map((m) => (
                <div key={m.id} className={`text-sm p-3 rounded-xl ${m.role === 'user' ? 'bg-brand-50' : 'bg-gray-50'}`}>
                  <p className="text-xs text-gray-500 mb-1">{m.role === 'user' ? data.patient.name : 'Asistente'} · {fmt(m.createdAt)}</p>
                  <p className="whitespace-pre-line text-gray-800">{m.content}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="bg-white rounded-2xl shadow p-6">
            <h4 className="font-bold text-gray-900 flex items-center gap-2 mb-4">
              <ClipboardList className="w-5 h-5 text-brand-600" /> Tamizajes ({data.screenings.length})
            </h4>
            {data.screenings.length === 0 && <p className="text-gray-500 text-sm">Sin tamizajes registrados.</p>}
            <div className="space-y-2">
              {data.screenings.map((s) => (
                <div key={s.id} className="flex items-center justify-between text-sm border-b border-gray-100 pb-2">
                  <span className="font-semibold text-gray-900">{s.type} · <span className="text-gray-500 font-normal">{fmt(s.timestamp)}</span></span>
                  <span className="text-brand-700 font-bold">{s.totalScore} <span className="text-gray-500 font-normal capitalize">({s.severity})</span></span>
                </div>
              ))}
            </div>
          </section>

          <section className="bg-white rounded-2xl shadow p-6">
            <h4 className="font-bold text-gray-900 mb-4">Planes de tratamiento ({data.plans.length})</h4>
            {data.plans.length === 0 && <p className="text-gray-500 text-sm">Sin planes asignados.</p>}
            <div className="space-y-4">
              {data.plans.map((plan) => (
                <div key={plan.id}>
                  <p className="font-semibold text-gray-900">{plan.title} <span className="text-xs text-gray-500">· {CONDITION_LABELS[plan.condition] || plan.condition}</span></p>
                  <ul className="mt-1 space-y-1">
                    {plan.weeks.map((w) => (
                      <li key={w.week_number} className="flex items-center gap-2 text-sm text-gray-700">
                        {w.completed ? <CheckCircle2 className="w-4 h-4 text-brand-600" /> : <Circle className="w-4 h-4 text-gray-300" />}
                        Semana {w.week_number}: {w.title}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </section>
        </>
      )}
    </div>
  );
}

/**
 * Panel del funcionario. Una cuenta con perfil FUNCIONARIO conserva todo lo del usuario normal
 * (chat, tamizajes, Mi Progreso) y aqui ademas ve el historial de los pacientes y los pacientes
 * que ha atendido. El servidor vuelve a comprobar el perfil en cada peticion.
 */
export default function StaffPanel() {
  const user = usePatientSession();
  const [tab, setTab] = useState('pacientes');
  const [patients, setPatients] = useState([]);
  const [attended, setAttended] = useState([]);
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const isStaff = user?.role === 'FUNCIONARIO';

  const handleSessionLost = useCallback(() => {
    clearPatientSession();
  }, []);

  const loadPatients = useCallback(async (q = '') => {
    setLoading(true);
    setError('');
    try {
      setPatients(await getStaffPatients(q));
    } catch (err) {
      if (err instanceof AuthError) handleSessionLost();
      else setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [handleSessionLost]);

  const loadAttended = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      setAttended(await getStaffAttended());
    } catch (err) {
      if (err instanceof AuthError) handleSessionLost();
      else setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [handleSessionLost]);

  useEffect(() => {
    if (!isStaff || selected) return;
    if (tab === 'pacientes') loadPatients(query);
    else loadAttended();
    // query se aplica al buscar (submit), no en cada tecla
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isStaff, tab, selected]);

  const handleLogout = async () => {
    await logoutPatient();
    clearPatientSession();
    setSelected(null);
  };

  if (!user) {
    return (
      <div className="max-w-md mx-auto">
        <div className="text-center mb-6">
          <UserCheck className="w-10 h-10 text-brand-600 mx-auto mb-3" />
          <h2 className="text-2xl font-bold text-gray-900">Panel Funcionario</h2>
          <p className="text-gray-500 text-sm mt-1">Inicia sesión con tu cuenta de funcionario.</p>
        </div>
        <PatientAuth initialMode="login" onSuccess={() => {}} />
      </div>
    );
  }

  if (!isStaff) {
    return (
      <div className="max-w-md mx-auto bg-white rounded-3xl shadow-xl p-10 text-center">
        <UserCheck className="w-10 h-10 text-gray-300 mx-auto mb-3" />
        <h2 className="text-xl font-bold text-gray-900">Esta cuenta no tiene perfil de funcionario</h2>
        <p className="text-gray-500 text-sm mt-2">
          Si debería tenerlo, pídele al administrador que cambie el perfil de tu cuenta.
        </p>
        <button onClick={handleLogout} className="mt-6 text-sm text-brand-600 hover:underline">Cerrar sesión</button>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h2 className="text-3xl font-bold text-gray-900">Panel Funcionario</h2>
          <p className="text-gray-500 text-sm">{user.name} · Funcionario</p>
        </div>
        <button onClick={handleLogout} className="flex items-center gap-2 text-gray-500 hover:text-red-600 text-sm">
          <LogOut className="w-4 h-4" /> Cerrar sesión
        </button>
      </div>

      {selected ? (
        <PatientHistory
          patientId={selected}
          onBack={() => setSelected(null)}
          onAttentionSaved={loadAttended}
          onSessionLost={handleSessionLost}
        />
      ) : (
        <>
          <div className="flex gap-3 mb-6">
            {[['pacientes', 'Pacientes', Users], ['atendidos', 'Pacientes que he atendido', UserCheck]].map(([id, label, Icon]) => (
              <button
                key={id}
                onClick={() => setTab(id)}
                className={`flex items-center gap-2 px-5 py-2 rounded-full text-sm font-semibold ${tab === id ? 'bg-brand-600 text-white' : 'bg-white text-gray-600'}`}
              >
                <Icon className="w-4 h-4" /> {label}
              </button>
            ))}
          </div>

          {error && <p className="text-red-600 text-sm mb-4">{error}</p>}

          {tab === 'pacientes' && (
            <>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  loadPatients(query.trim());
                }}
                className="flex gap-2 mb-4"
              >
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  maxLength={100}
                  placeholder="Buscar por nombre o correo"
                  className="flex-1 border-2 border-brand-200 rounded-full px-5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-600"
                />
                <button type="submit" className="bg-brand-600 text-white px-5 py-2 rounded-full text-sm font-semibold flex items-center gap-2 hover:bg-brand-700">
                  <Search className="w-4 h-4" /> Buscar
                </button>
              </form>
              {loading && <p className="text-gray-400 text-center py-10">Cargando...</p>}
              {!loading && patients.length === 0 && <p className="text-gray-500 text-center py-10">No hay pacientes para mostrar.</p>}
              <div className="space-y-3">
                {patients.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => setSelected(p.id)}
                    className="w-full text-left bg-white rounded-2xl shadow p-5 hover:shadow-lg border-2 border-transparent hover:border-brand-300 transition flex items-center justify-between gap-4 flex-wrap"
                  >
                    <div>
                      <p className="font-bold text-gray-900">{p.name}</p>
                      <p className="text-sm text-gray-500">{p.email}</p>
                    </div>
                    <p className="text-xs text-gray-500 text-right">
                      {p.messageCount} mensajes · {p.screeningCount} tamizajes<br />
                      Última actividad: {fmt(p.lastActivity)}
                    </p>
                  </button>
                ))}
              </div>
            </>
          )}

          {tab === 'atendidos' && (
            <>
              {loading && <p className="text-gray-400 text-center py-10">Cargando...</p>}
              {!loading && attended.length === 0 && (
                <p className="text-gray-500 text-center py-10">
                  Aún no has registrado atenciones. Abre el historial de un paciente y pulsa «Registrar atención».
                </p>
              )}
              <div className="space-y-3">
                {attended.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => setSelected(p.id)}
                    className="w-full text-left bg-white rounded-2xl shadow p-5 hover:shadow-lg border-2 border-transparent hover:border-brand-300 transition flex items-center justify-between gap-4 flex-wrap"
                  >
                    <div>
                      <p className="font-bold text-gray-900">{p.name}</p>
                      <p className="text-sm text-gray-500">{p.email}</p>
                    </div>
                    <p className="text-xs text-gray-500 text-right">
                      {p.attentionCount} {p.attentionCount === 1 ? 'atención' : 'atenciones'}<br />
                      Última: {fmt(p.lastAttended)}
                    </p>
                  </button>
                ))}
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
