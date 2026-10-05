import React from 'react';
import { Target, Heart, Brain, ShieldAlert } from 'lucide-react';

export default function About() {
  return (
    <div className="max-w-4xl mx-auto space-y-12">
      <section className="bg-white rounded-3xl p-12 shadow-xl">
        <h2 className="text-4xl font-bold text-center text-gray-900 mb-8">¿Quiénes somos?</h2>
        <p className="text-lg text-gray-700 mb-6 leading-relaxed">
          Somos <strong>Dillan Steven Sandoval García</strong> y <strong>Tomás Alejandro Pérez Tovar</strong>,
          estudiantes de Ingeniería de Software de la Universidad de Cundinamarca. Desarrollamos AIMotion
          como una plataforma de soporte a la decisión clínica: un sistema que ayuda a estructurar la
          recolección de información y a detectar factores de riesgo, siempre bajo supervisión profesional.
        </p>

        <div className="grid md:grid-cols-3 gap-8 mt-12">
          <div className="text-center p-6 bg-purple-50 rounded-xl">
            <Target className="w-12 h-12 text-purple-600 mx-auto mb-4" />
            <h3 className="font-bold text-xl mb-2">Propósito</h3>
            <p className="text-gray-600">Brindar una herramienta de tamizaje accesible que facilite el trabajo del profesional, no que lo reemplace.</p>
          </div>
          <div className="text-center p-6 bg-blue-50 rounded-xl">
            <Heart className="w-12 h-12 text-blue-600 mx-auto mb-4" />
            <h3 className="font-bold text-xl mb-2">Misión</h3>
            <p className="text-gray-600">Estructurar la anamnesis y detectar señales de riesgo temprano, apoyando la formulación clínica.</p>
          </div>
          <div className="text-center p-6 bg-pink-50 rounded-xl">
            <Brain className="w-12 h-12 text-pink-600 mx-auto mb-4" />
            <h3 className="font-bold text-xl mb-2">Visión</h3>
            <p className="text-gray-600">Ser un referente académico en soporte tecnológico responsable para psicología clínica.</p>
          </div>
        </div>
      </section>

      <section className="bg-gradient-to-r from-purple-100 to-blue-100 rounded-3xl p-12">
        <h3 className="text-3xl font-bold mb-6 text-gray-900">El problema que abordamos</h3>
        <p className="text-lg text-gray-700 mb-4">
          El <strong>14% de la población mundial</strong> presenta algún problema de salud mental, y buena
          parte no accede a apoyo profesional a tiempo. AIMotion busca reducir esa brecha en la fase de
          <strong> primer contacto</strong>: recolección de información y detección temprana de riesgo,
          conectando a la persona con un profesional cuando más lo necesita.
        </p>
      </section>

      <section className="bg-white rounded-3xl p-12 shadow-xl border-l-4 border-amber-500">
        <div className="flex items-start gap-4">
          <ShieldAlert className="w-10 h-10 text-amber-600 flex-shrink-0 mt-1" />
          <div>
            <h3 className="text-2xl font-bold text-gray-900 mb-3">Alcance y límites del sistema</h3>
            <ul className="text-gray-700 space-y-2 list-disc pl-5">
              <li>El asistente conversacional <strong>no diagnostica, no prescribe ni realiza psicoterapia autónoma</strong>.</li>
              <li>Su rol es aplicar escalas de tamizaje (PHQ-9, GAD-7), registrar un diario de síntomas y capturar información preliminar.</li>
              <li>Todo análisis o alerta generada por el sistema es <strong>validado y supervisado por un profesional</strong> (modelo Human-in-the-Loop).</li>
              <li>Ante un factor de riesgo crítico, el sistema desactiva las respuestas automatizadas estándar y escala el caso de inmediato.</li>
            </ul>
          </div>
        </div>
      </section>
    </div>
  );
}
