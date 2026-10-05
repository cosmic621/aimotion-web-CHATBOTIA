import React, { useState } from 'react';
import ScaleForm from './ScaleForm';
import { ClipboardList } from 'lucide-react';

export default function ScreeningHub({ sessionId, userName, onCriticalRisk }) {
  const [selected, setSelected] = useState(null);

  if (selected) {
    return (
      <div className="max-w-3xl mx-auto">
        <button onClick={() => setSelected(null)} className="mb-6 text-purple-600 hover:underline text-sm">
          ← Elegir otro cuestionario
        </button>
        <ScaleForm type={selected} sessionId={sessionId} userName={userName} onCriticalRisk={onCriticalRisk} />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="text-center mb-10">
        <ClipboardList className="w-12 h-12 text-purple-600 mx-auto mb-4" />
        <h2 className="text-4xl font-bold text-gray-900 mb-3">Tamizaje clínico estandarizado</h2>
        <p className="text-gray-600 max-w-2xl mx-auto">
          Estos cuestionarios son instrumentos de tamizaje ampliamente usados en psicología clínica. Un
          puntaje elevado no es un diagnóstico: es una señal para que el profesional profundice contigo.
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <button
          onClick={() => setSelected('PHQ-9')}
          className="text-left bg-white rounded-3xl shadow-xl p-8 hover:shadow-2xl transition border-2 border-transparent hover:border-purple-300"
        >
          <h3 className="text-2xl font-bold text-purple-700 mb-2">PHQ-9</h3>
          <p className="text-gray-600">Cuestionario de 9 ítems para tamizaje de síntomas depresivos.</p>
        </button>
        <button
          onClick={() => setSelected('GAD-7')}
          className="text-left bg-white rounded-3xl shadow-xl p-8 hover:shadow-2xl transition border-2 border-transparent hover:border-blue-300"
        >
          <h3 className="text-2xl font-bold text-blue-700 mb-2">GAD-7</h3>
          <p className="text-gray-600">Cuestionario de 7 ítems para tamizaje de ansiedad generalizada.</p>
        </button>
      </div>
    </div>
  );
}
