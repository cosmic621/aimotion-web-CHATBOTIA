import React from 'react';
import { Brain } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="bg-gray-900 text-white py-8 mt-20">
      <div className="container mx-auto px-6 text-center">
        <div className="flex items-center justify-center gap-2 mb-4">
          <Brain className="w-6 h-6 text-purple-400" />
          <span className="text-xl font-bold">AIMotion</span>
        </div>
        <p className="text-gray-400">Universidad de Cundinamarca - Extensión Soacha</p>
        <p className="text-sm text-gray-500 mt-2 max-w-2xl mx-auto">
          AIMotion es una herramienta de tamizaje y apoyo asistido. No diagnostica, no prescribe
          ni sustituye una consulta con un profesional de salud mental.
        </p>
        <p className="text-xs text-gray-600 mt-4">
          Si estás en crisis, contacta la Línea 106 o el 123 (Colombia) inmediatamente.
        </p>
      </div>
    </footer>
  );
}
