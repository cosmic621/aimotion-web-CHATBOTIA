import React, { useState } from 'react';
import { Brain, Menu, X } from 'lucide-react';

const NAV_ITEMS = [
  { id: 'inicio', label: 'Inicio' },
  { id: 'nosotros', label: 'Nosotros' },
  { id: 'tamizaje', label: 'Tamizaje' },
  { id: 'chat', label: '💚 Asistente de Apoyo' },
  { id: 'mi-progreso', label: 'Mi Progreso' },
  { id: 'profesional', label: 'Panel Profesional' },
  { id: 'contacto', label: 'Contacto' },
];

export default function Header({ activeSection, onNavigate }) {
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleNavigate = (id) => {
    onNavigate(id);
    setMobileOpen(false);
  };

  return (
    <header className="bg-white/90 backdrop-blur-md shadow-sm border-b-4 border-gold-400 sticky top-0 z-40">
      <nav className="container mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Brain className="w-8 h-8 text-brand-600" />
            <span className="text-2xl font-bold bg-gradient-to-r from-brand-600 to-brand-500 bg-clip-text text-transparent">
              AIMotion
            </span>
          </div>

          <div className="hidden md:flex space-x-6">
            {NAV_ITEMS.map((item) => (
              <button
                key={item.id}
                onClick={() => handleNavigate(item.id)}
                className={`text-gray-700 hover:text-brand-600 transition text-sm lg:text-base ${
                  activeSection === item.id ? 'font-semibold text-brand-700' : ''
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>

          <button
            className="md:hidden"
            onClick={() => setMobileOpen((open) => !open)}
            aria-label={mobileOpen ? 'Cerrar menú' : 'Abrir menú'}
          >
            {mobileOpen ? <X className="w-6 h-6 text-gray-700" /> : <Menu className="w-6 h-6 text-gray-700" />}
          </button>
        </div>

        {mobileOpen && (
          <div className="md:hidden mt-4 flex flex-col space-y-3 pb-2">
            {NAV_ITEMS.map((item) => (
              <button
                key={item.id}
                onClick={() => handleNavigate(item.id)}
                className={`text-left text-gray-700 hover:text-brand-600 transition py-2 ${
                  activeSection === item.id ? 'font-semibold text-brand-700' : ''
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        )}
      </nav>
    </header>
  );
}
