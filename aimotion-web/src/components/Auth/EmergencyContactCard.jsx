import React, { useState } from 'react';
import { PhoneCall } from 'lucide-react';
import { updateEmergencyContact } from '../../lib/api';
import { getPatientSession, savePatientSession } from '../../lib/patientSession';
import EmergencyContactFields, { EMPTY_CONTACT } from './EmergencyContactFields';

/** Muestra y permite agregar/cambiar el contacto de emergencia de la cuenta. */
export default function EmergencyContactCard({ patient, onUpdated }) {
  const current = patient.emergencyContact;
  const [editing, setEditing] = useState(!current);
  const [form, setForm] = useState(
    current ? { name: current.name, phone: current.phone, relation: current.relation, consent: false } : EMPTY_CONTACT
  );
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      const { user } = await updateEmergencyContact({
        contactName: form.name,
        contactPhone: form.phone,
        contactRelation: form.relation,
        contactConsent: form.consent,
      });
      const session = getPatientSession();
      if (session) savePatientSession({ ...session, user });
      onUpdated(user);
      setEditing(false);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-white rounded-3xl shadow p-6 mb-6">
      <div className="flex items-center gap-2 mb-2">
        <PhoneCall className="w-5 h-5 text-purple-600" />
        <h3 className="font-bold text-gray-900">Contacto de emergencia</h3>
      </div>

      {!editing && current ? (
        <div className="text-sm text-gray-600">
          <p>
            <strong>{current.name}</strong> ({current.relation}) — {current.phone}
          </p>
          <p className="text-xs text-gray-400 mt-1">
            Solo recibe un SMS breve si se detecta un riesgo crítico. No ve el contenido de tus conversaciones.
          </p>
          <button onClick={() => setEditing(true)} className="text-purple-600 text-xs hover:underline mt-2">
            Cambiar contacto
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-3">
          {!current && (
            <p className="text-sm text-amber-700 bg-amber-50 rounded-xl p-3">
              Aún no tienes un contacto de emergencia. Agrégalo para que alguien de confianza pueda apoyarte.
            </p>
          )}
          <EmergencyContactFields value={form} onChange={setForm} />
          {error && <p className="text-red-600 text-xs">{error}</p>}
          <div className="flex gap-3">
            <button type="submit" disabled={saving} className="bg-purple-600 text-white px-5 py-2 rounded-full text-sm font-semibold disabled:opacity-50">
              {saving ? 'Guardando...' : 'Guardar contacto'}
            </button>
            {current && (
              <button type="button" onClick={() => setEditing(false)} className="text-gray-500 text-sm hover:underline">
                Cancelar
              </button>
            )}
          </div>
        </form>
      )}
    </div>
  );
}
