import React, { useEffect, useState } from 'react';
import { Users, MessageSquare, CalendarPlus, ArrowLeft, Plus, Trash2 } from 'lucide-react';
import { getChatUsers, getUserChatHistory, getUserTreatmentPlans, createTreatmentPlan } from '../../lib/api';
import { TREATMENT_TEMPLATES } from '../../lib/treatmentTemplates';

const CONDITION_LABELS = {
  depresion: 'Depresión',
  ansiedad: 'Ansiedad',
  estres: 'Estrés',
  esquizofrenia: 'Esquizofrenia',
};

function NewPlanForm({ userId, onCreated, onCancel }) {
  const [condition, setCondition] = useState('depresion');
  const [title, setTitle] = useState(TREATMENT_TEMPLATES.depresion.title);
  const [weeks, setWeeks] = useState(TREATMENT_TEMPLATES.depresion.weeks.map((w) => ({ ...w, completed: false })));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const applyTemplate = (cond) => {
    setCondition(cond);
    setTitle(TREATMENT_TEMPLATES[cond].title);
    setWeeks(TREATMENT_TEMPLATES[cond].weeks.map((w) => ({ ...w, completed: false })));
  };

  const updateWeek = (idx, field, value) => {
    setWeeks((prev) => prev.map((w, i) => (i === idx ? { ...w, [field]: value } : w)));
  };

  const addWeek = () => {
    setWeeks((prev) => [...prev, { week_number: prev.length + 1, title: '', description: '', completed: false }]);
  };

  const removeWeek = (idx) => {
    setWeeks((prev) => prev.filter((_, i) => i !== idx).map((w, i) => ({ ...w, week_number: i + 1 })));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (weeks.some((w) => !w.title.trim() || !w.description.trim())) {
      setError('Completa el título y la descripción de todas las semanas antes de guardar.');
      return;
    }
    setSaving(true);
    try {
      await createTreatmentPlan({ userId, condition, title, weeks });
      onCreated();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow p-6 space-y-4">
      <h4 className="font-bold text-gray-900">Nuevo plan de tratamiento</h4>
      <p className="text-xs text-gray-500">
        Parte de una plantilla general de referencia — revísala y ajústala antes de guardar. El plan
        queda asociado a tu cuenta como su autor/a.
      </p>

      <div>
        <label className="text-xs font-semibold text-gray-600 block mb-1">Trastorno</label>
        <select
          value={condition}
          onChange={(e) => applyTemplate(e.target.value)}
          className="w-full border-2 border-gray-200 rounded-xl px-3 py-2 text-sm"
        >
          {Object.keys(CONDITION_LABELS).map((key) => (
            <option key={key} value={key}>
              {CONDITION_LABELS[key]}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="text-xs font-semibold text-gray-600 block mb-1">Título del plan</label>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full border-2 border-gray-200 rounded-xl px-3 py-2 text-sm"
        />
      </div>

      <div className="space-y-3">
        {weeks.map((week, idx) => (
          <div key={idx} className="border border-gray-200 rounded-xl p-3 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-purple-700">Semana {week.week_number}</span>
              <button type="button" onClick={() => removeWeek(idx)} className="text-gray-400 hover:text-red-600">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
            <input
              value={week.title}
              onChange={(e) => updateWeek(idx, 'title', e.target.value)}
              placeholder="Título de la semana"
              className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm"
            />
            <textarea
              value={week.description}
              onChange={(e) => updateWeek(idx, 'description', e.target.value)}
              placeholder="Descripción"
              rows={2}
              className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm"
            />
          </div>
        ))}
        <button type="button" onClick={addWeek} className="flex items-center gap-1 text-purple-600 text-sm hover:underline">
          <Plus className="w-4 h-4" /> Agregar semana
        </button>
      </div>

      {error && <p className="text-red-600 text-xs">{error}</p>}

      <div className="flex gap-3">
        <button type="submit" disabled={saving} className="bg-purple-600 text-white px-5 py-2 rounded-full text-sm font-semibold hover:bg-purple-700 disabled:opacity-50">
          {saving ? 'Guardando...' : 'Asignar plan'}
        </button>
        <button type="button" onClick={onCancel} className="text-gray-500 text-sm hover:underline">
          Cancelar
        </button>
      </div>
    </form>
  );
}

export default function UsersPanel() {
  const [users, setUsers] = useState([]);
  const [selected, setSelected] = useState(null);
  const [history, setHistory] = useState([]);
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showNewPlan, setShowNewPlan] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    getChatUsers()
      .then(setUsers)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const openUser = async (user) => {
    setSelected(user);
    setShowNewPlan(false);
    try {
      const [h, p] = await Promise.all([getUserChatHistory(user.id), getUserTreatmentPlans(user.id)]);
      setHistory(h);
      setPlans(p);
    } catch (err) {
      setError(err.message);
    }
  };

  const refreshPlans = () => {
    setShowNewPlan(false);
    getUserTreatmentPlans(selected.id).then(setPlans).catch((err) => setError(err.message));
  };

  if (loading) return <p className="text-gray-400 text-center py-10">Cargando...</p>;
  if (error) return <p className="text-red-600 text-sm text-center py-10">{error}</p>;

  if (selected) {
    return (
      <div className="max-w-3xl mx-auto">
        <button onClick={() => setSelected(null)} className="flex items-center gap-1 text-purple-600 text-sm hover:underline mb-4">
          <ArrowLeft className="w-4 h-4" /> Volver a usuarios
        </button>

        <h3 className="text-2xl font-bold text-gray-900 mb-1">{selected.name}</h3>
        <p className="text-sm text-gray-500 mb-6">{selected.email}</p>

        <div className="grid md:grid-cols-2 gap-6">
          <div className="bg-white rounded-2xl shadow p-5 max-h-96 overflow-y-auto">
            <h4 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
              <MessageSquare className="w-4 h-4" /> Historial de chat
            </h4>
            <div className="space-y-2">
              {history.map((m) => (
                <div key={m.id} className={`text-sm p-2 rounded-lg ${m.role === 'user' ? 'bg-purple-50' : 'bg-gray-50'}`}>
                  <span className="text-xs font-semibold text-gray-500">{m.role === 'user' ? selected.name : 'Bot'}</span>
                  <p className="text-gray-800 whitespace-pre-line">{m.content}</p>
                </div>
              ))}
              {history.length === 0 && <p className="text-gray-400 text-sm">Sin mensajes todavía.</p>}
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-bold text-gray-900 flex items-center gap-2">
                <CalendarPlus className="w-4 h-4" /> Planes de tratamiento
              </h4>
              {!showNewPlan && (
                <button onClick={() => setShowNewPlan(true)} className="text-purple-600 text-sm hover:underline">
                  + Nuevo plan
                </button>
              )}
            </div>

            {showNewPlan ? (
              <NewPlanForm userId={selected.id} onCreated={refreshPlans} onCancel={() => setShowNewPlan(false)} />
            ) : (
              <div className="space-y-3">
                {plans.map((plan) => (
                  <div key={plan.id} className="bg-white rounded-2xl shadow p-4">
                    <p className="font-semibold text-gray-900 text-sm">{plan.title}</p>
                    <p className="text-xs text-gray-500 mb-2">{CONDITION_LABELS[plan.condition]}</p>
                    <p className="text-xs text-gray-400">
                      {plan.weeks.filter((w) => w.completed).length}/{plan.weeks.length} semanas completadas
                    </p>
                  </div>
                ))}
                {plans.length === 0 && <p className="text-gray-400 text-sm">Sin planes asignados todavía.</p>}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-center gap-2 mb-6">
        <Users className="w-5 h-5 text-purple-600" />
        <h3 className="text-xl font-bold text-gray-900">Usuarios con actividad</h3>
      </div>
      <div className="space-y-3">
        {users.map((u) => (
          <button
            key={u.id}
            onClick={() => openUser(u)}
            className="w-full text-left bg-white rounded-2xl shadow p-5 flex items-center justify-between hover:shadow-md transition"
          >
            <div>
              <p className="font-semibold text-gray-900">{u.name}</p>
              <p className="text-xs text-gray-500">{u.email}</p>
            </div>
            <div className="text-right text-xs text-gray-400">
              <p>{u.messageCount} mensajes</p>
              <p>{new Date(u.lastActivity).toLocaleDateString('es-CO')}</p>
            </div>
          </button>
        ))}
        {users.length === 0 && <p className="text-gray-400 text-center py-10">Todavía no hay usuarios con cuentas activas.</p>}
      </div>
    </div>
  );
}
