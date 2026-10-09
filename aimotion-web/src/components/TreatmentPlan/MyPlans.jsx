import React, { useEffect, useState } from 'react';
import { CalendarCheck, CheckCircle2, Circle, Lock } from 'lucide-react';
import { getMyTreatmentPlans, updateTreatmentPlanProgress } from '../../lib/api';
import { getPatientSession } from '../../lib/patientSession';
import PatientAuth from '../Auth/PatientAuth';
import EmergencyContactCard from '../Auth/EmergencyContactCard';

const CONDITION_LABELS = {
  depresion: 'Depresión',
  ansiedad: 'Ansiedad',
  estres: 'Estrés',
  esquizofrenia: 'Esquizofrenia',
};

export default function MyPlans() {
  const [patient, setPatient] = useState(() => getPatientSession()?.user || null);
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const loadPlans = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await getMyTreatmentPlans();
      setPlans(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (patient) loadPlans();
  }, [patient]);

  const toggleWeek = async (plan, week) => {
    try {
      const updated = await updateTreatmentPlanProgress(plan.id, week.week_number, !week.completed);
      setPlans((prev) => prev.map((p) => (p.id === plan.id ? updated : p)));
    } catch (err) {
      setError(err.message);
    }
  };

  if (!patient) {
    return (
      <div className="max-w-md mx-auto">
        <div className="text-center mb-6">
          <Lock className="w-10 h-10 text-purple-600 mx-auto mb-3" />
          <h2 className="text-2xl font-bold text-gray-900">Mi Progreso</h2>
          <p className="text-gray-500 text-sm mt-1">
            Aquí verás el plan semanal que tu profesional te asigne. Necesitas una cuenta para esto.
          </p>
        </div>
        <PatientAuth onSuccess={setPatient} />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto">
      <div className="text-center mb-8">
        <CalendarCheck className="w-10 h-10 text-purple-600 mx-auto mb-3" />
        <h2 className="text-3xl font-bold text-gray-900">Mi Progreso</h2>
        <p className="text-gray-500 text-sm mt-1">Hola {patient.name} — aquí está tu plan de seguimiento.</p>
      </div>

      <EmergencyContactCard patient={patient} onUpdated={setPatient} />

      {loading && <p className="text-center text-gray-400">Cargando...</p>}
      {error && <p className="text-center text-red-600 text-sm mb-4">{error}</p>}

      {!loading && plans.length === 0 && (
        <div className="bg-white rounded-3xl shadow p-10 text-center text-gray-500">
          Todavía no tienes un plan asignado. Cuando tu profesional cree uno para ti, aparecerá aquí.
        </div>
      )}

      <div className="space-y-6">
        {plans.map((plan) => (
          <div key={plan.id} className="bg-white rounded-3xl shadow-xl p-8">
            <div className="flex items-center justify-between mb-1">
              <h3 className="text-xl font-bold text-gray-900">{plan.title}</h3>
              <span className="text-xs px-3 py-1 rounded-full bg-purple-100 text-purple-700 font-semibold">
                {CONDITION_LABELS[plan.condition] || plan.condition}
              </span>
            </div>
            <p className="text-xs text-gray-400 mb-6">
              Asignado el {new Date(plan.createdAt).toLocaleDateString('es-CO')}
            </p>

            <div className="space-y-3">
              {plan.weeks.map((week) => (
                <button
                  key={week.week_number}
                  onClick={() => toggleWeek(plan, week)}
                  className={`w-full text-left flex items-start gap-3 p-4 rounded-2xl border-2 transition ${
                    week.completed ? 'border-green-200 bg-green-50' : 'border-gray-100 hover:border-purple-200'
                  }`}
                >
                  {week.completed ? (
                    <CheckCircle2 className="w-6 h-6 text-green-600 flex-shrink-0 mt-0.5" />
                  ) : (
                    <Circle className="w-6 h-6 text-gray-300 flex-shrink-0 mt-0.5" />
                  )}
                  <div>
                    <p className={`font-semibold ${week.completed ? 'text-green-800' : 'text-gray-900'}`}>
                      Semana {week.week_number}: {week.title}
                    </p>
                    <p className="text-sm text-gray-600 mt-1">{week.description}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      <p className="text-xs text-gray-400 text-center mt-6">
        Este plan lo creó tu profesional y puede ajustarlo en cualquier momento. Marcar una semana aquí
        no reemplaza tu consulta, es solo para que ambos lleven seguimiento del avance.
      </p>
    </div>
  );
}
