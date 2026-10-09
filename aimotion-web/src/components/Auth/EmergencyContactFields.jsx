import React from 'react';

const inputClass =
  'w-full border-2 border-purple-200 rounded-full px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-600';

/**
 * Campos del contacto de emergencia + consentimiento explicito. Se usa al
 * crear la cuenta y al editar el contacto despues. "value" es un objeto
 * { name, phone, relation, consent }.
 */
export default function EmergencyContactFields({ value, onChange }) {
  const set = (field) => (e) => onChange({ ...value, [field]: e.target.value });

  return (
    <fieldset className="space-y-3 border-2 border-dashed border-purple-200 rounded-2xl p-4">
      <legend className="px-2 text-xs font-bold text-purple-700">Contacto de emergencia</legend>
      <p className="text-xs text-gray-500">
        Una persona de confianza (papá, mamá, acudiente, pareja, amistad). Si el sistema detecta una
        situación de riesgo crítico, le enviaremos un SMS breve para que pueda comunicarse contigo.
      </p>
      <input value={value.name} onChange={set('name')} placeholder="Nombre de esa persona" required className={inputClass} />
      <input
        value={value.phone}
        onChange={set('phone')}
        placeholder="Celular (ej. 3001234567)"
        required
        inputMode="tel"
        className={inputClass}
      />
      <input
        value={value.relation}
        onChange={set('relation')}
        placeholder="Parentesco o relación (ej. mamá, papá, acudiente)"
        required
        className={inputClass}
      />
      <label className="flex items-start gap-2 text-xs text-gray-700 cursor-pointer">
        <input
          type="checkbox"
          checked={value.consent}
          onChange={(e) => onChange({ ...value, consent: e.target.checked })}
          required
          className="mt-0.5 accent-purple-600"
        />
        <span>
          Autorizo que AIMotion envíe un SMS breve a este contacto si detecta una situación de riesgo
          crítico para mí. El mensaje <strong>no incluye detalles de mi conversación</strong>.
        </span>
      </label>
    </fieldset>
  );
}

export const EMPTY_CONTACT = { name: '', phone: '', relation: '', consent: false };
