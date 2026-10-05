import React from 'react';
import { Shield, Clock, ClipboardList, Users } from 'lucide-react';

export default function Home({ onNavigate }) {
  return (
    <div className="space-y-20">
      <section className="text-center max-w-4xl mx-auto py-12">
        <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6">
          Tamizaje y apoyo emocional,
          <span className="bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent"> con un profesional al otro lado</span>
        </h1>
        <p className="text-xl text-gray-600 mb-8">
          AIMotion es una plataforma de apoyo asistido: recoge información preliminar, aplica escalas
          clínicas estandarizadas y, ante una señal de riesgo relevante, notifica de inmediato a un
          profesional. No reemplaza una consulta clínica.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <button
            onClick={() => onNavigate('chat')}
            className="bg-gradient-to-r from-purple-600 to-blue-600 text-white px-8 py-4 rounded-full text-lg font-semibold hover:shadow-lg transform hover:scale-105 transition"
          >
            Habla con el asistente 💜
          </button>
          <button
            onClick={() => onNavigate('tamizaje')}
            className="bg-white border-2 border-purple-600 text-purple-700 px-8 py-4 rounded-full text-lg font-semibold hover:bg-purple-50 transition"
          >
            Completar un tamizaje (PHQ-9 / GAD-7)
          </button>
        </div>
      </section>

      <section className="bg-white rounded-3xl p-12 shadow-xl">
        <h2 className="text-4xl font-bold text-center text-gray-900 mb-12">¿Cómo funciona AIMotion?</h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
          <div className="text-center p-6">
            <ClipboardList className="w-10 h-10 text-purple-600 mx-auto mb-4" />
            <h3 className="font-bold text-xl mb-2">Recolección estructurada</h3>
            <p className="text-gray-600">Organiza síntomas, desencadenantes y antecedentes para apoyar la formulación clínica.</p>
          </div>
          <div className="text-center p-6">
            <Shield className="w-10 h-10 text-purple-600 mx-auto mb-4" />
            <h3 className="font-bold text-xl mb-2">Alertas de riesgo</h3>
            <p className="text-gray-600">Un motor de reglas detecta señales críticas y activa un protocolo de escalamiento inmediato.</p>
          </div>
          <div className="text-center p-6">
            <Clock className="w-10 h-10 text-purple-600 mx-auto mb-4" />
            <h3 className="font-bold text-xl mb-2">Disponible 24/7</h3>
            <p className="text-gray-600">El espacio de tamizaje y registro está siempre disponible, aunque el profesional revise después.</p>
          </div>
          <div className="text-center p-6">
            <Users className="w-10 h-10 text-purple-600 mx-auto mb-4" />
            <h3 className="font-bold text-xl mb-2">Human-in-the-Loop</h3>
            <p className="text-gray-600">Ningún resultado se queda sin revisión: el profesional valida y decide siempre.</p>
          </div>
        </div>
      </section>
    </div>
  );
}
