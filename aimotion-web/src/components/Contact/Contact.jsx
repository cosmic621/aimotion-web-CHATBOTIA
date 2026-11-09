import React from 'react';

export default function Contact() {
  return (
    <div className="max-w-4xl mx-auto">
      <section className="bg-white rounded-3xl p-12 shadow-xl">
        <h2 className="text-4xl font-bold text-center text-gray-900 mb-12">Contacto</h2>

        <div className="grid md:grid-cols-2 gap-8 mb-12">
          <div className="bg-gradient-to-br from-brand-50 to-celeste-50 p-8 rounded-2xl">
            <h3 className="font-bold text-2xl mb-4 text-brand-900">Dillan Steven Sandoval García</h3>
            <div className="space-y-3 text-gray-700">
              <p className="flex items-center gap-2">
                <span className="text-xl">📧</span>
                <a href="mailto:dssandoval@ucundinamarca.edu.co" className="hover:text-brand-600">
                  dssandoval@ucundinamarca.edu.co
                </a>
              </p>
              <p className="flex items-center gap-2">
                <span className="text-xl">📱</span>
                <a href="tel:3174534107" className="hover:text-brand-600">3174534107</a>
              </p>
            </div>
          </div>

          <div className="bg-gradient-to-br from-celeste-50 to-brand-50 p-8 rounded-2xl">
            <h3 className="font-bold text-2xl mb-4 text-celeste-900">Tomás Alejandro Pérez Tovar</h3>
            <div className="space-y-3 text-gray-700">
              <p className="flex items-center gap-2">
                <span className="text-xl">📧</span>
                <a href="mailto:taperez@ucundinamarca.edu.co" className="hover:text-celeste-600">
                  taperez@ucundinamarca.edu.co
                </a>
              </p>
              <p className="flex items-center gap-2">
                <span className="text-xl">📱</span>
                <a href="tel:3102673780" className="hover:text-celeste-600">3102673780</a>
              </p>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-r from-brand-100 to-gold-100 p-8 rounded-2xl">
          <h3 className="font-bold text-2xl mb-4 text-center">Recursos de Ayuda Inmediata 🆘</h3>
          <div className="grid md:grid-cols-2 gap-4 text-gray-700">
            <div>
              <p className="font-semibold mb-2">Línea 106</p>
              <p className="text-sm">Orientación en salud mental (24/7, gratuita)</p>
            </div>
            <div>
              <p className="font-semibold mb-2">Línea de la Vida: 01 8000 113 113</p>
              <p className="text-sm">Prevención de suicidio y crisis</p>
            </div>
            <div>
              <p className="font-semibold mb-2">Emergencias: 123</p>
              <p className="text-sm">Atención inmediata en crisis</p>
            </div>
            <div>
              <p className="font-semibold mb-2">Cruz Roja: 132</p>
              <p className="text-sm">Orientación y apoyo emocional</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
