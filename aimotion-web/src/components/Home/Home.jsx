import React from 'react';
import { Shield, Clock, ClipboardList, Users, Brain, Wind, Zap, Sparkles, Heart } from 'lucide-react';

const CONDITIONS = [
  {
    key: 'depresion',
    icon: Brain,
    title: 'Depresión',
    text: 'Ánimo bajo o pérdida de interés casi a diario por dos semanas o más, con cambios en sueño, apetito o energía.',
  },
  {
    key: 'ansiedad',
    icon: Wind,
    title: 'Ansiedad',
    text: 'Miedo o preocupación excesivos y persistentes que afectan el día a día, con o sin episodios de pánico.',
  },
  {
    key: 'estres',
    icon: Zap,
    title: 'Estrés',
    text: 'Carga sostenida que agota el cuerpo y la mente cuando no hay espacio de recuperación suficiente.',
  },
  {
    key: 'esquizofrenia',
    icon: Sparkles,
    title: 'Esquizofrenia',
    text: 'Un trastorno serio pero tratable: con acompañamiento adecuado, la recuperación funcional es posible.',
  },
];

export default function Home({ onNavigate }) {
  return (
    <div className="space-y-20">
      <section className="text-center max-w-4xl mx-auto py-12">
        <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6">
          Tamizaje y apoyo emocional,
          <span className="bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent"> con un profesional al otro lado</span>
        </h1>
        <p className="text-xl text-gray-600 mb-4">
          AIMotion es una plataforma especializada en <strong>depresión, ansiedad, estrés y esquizofrenia</strong>:
          recoge información preliminar, aplica escalas clínicas estandarizadas y, ante una señal de riesgo
          relevante, notifica de inmediato a un profesional.
        </p>
        <p className="text-base text-gray-500 mb-8">No diagnostica ni reemplaza una consulta clínica.</p>
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

      <section>
        <div className="text-center mb-10">
          <h2 className="text-4xl font-bold text-gray-900 mb-3">Trastornos que acompañamos</h2>
          <p className="text-gray-600 max-w-2xl mx-auto">
            Nos enfocamos en estas cuatro condiciones para ofrecer información y tamizaje de verdad útil,
            en vez de intentar cubrir todo superficialmente. Contenido alineado con los criterios de la OMS (CIE-11).
          </p>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {CONDITIONS.map(({ key, icon: Icon, title, text }) => (
            <div key={key} className="bg-white rounded-3xl p-6 shadow-lg hover:shadow-xl transition">
              <Icon className="w-9 h-9 text-purple-600 mb-3" />
              <h3 className="font-bold text-lg mb-2 text-gray-900">{title}</h3>
              <p className="text-sm text-gray-600">{text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-gradient-to-r from-purple-100 to-blue-100 rounded-3xl p-10 md:p-12">
        <div className="grid md:grid-cols-[auto,1fr] gap-6 items-start">
          <Heart className="w-12 h-12 text-purple-600 flex-shrink-0" />
          <div>
            <h2 className="text-3xl font-bold text-gray-900 mb-3">¿Eres padre, madre o familiar?</h2>
            <p className="text-gray-700 mb-3">
              AIMotion también es un espacio de primer contacto e información para familias que notan
              señales en un hijo, hija o ser querido y no saben por dónde empezar. Aquí puedes entender
              mejor qué son estos trastornos, qué NO son, y qué camino seguir para buscar ayuda profesional,
              antes de dar el paso de una consulta.
            </p>
            <p className="text-gray-700 mb-5">
              Si ya hay una persona en tratamiento, el profesional a cargo puede crear un plan de
              seguimiento semanal que tanto ustedes como el paciente pueden ver y acompañar desde aquí.
            </p>
            <button
              onClick={() => onNavigate('nosotros')}
              className="bg-purple-600 text-white px-6 py-3 rounded-full font-semibold hover:bg-purple-700 transition"
            >
              Entender más sobre estos trastornos
            </button>
          </div>
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
            <p className="text-gray-600">Ningún resultado se queda sin revisión: el profesional valida y decide siempre, incluyendo los planes de seguimiento semanal.</p>
          </div>
        </div>
      </section>
    </div>
  );
}
