import React, { useEffect, useState } from 'react';
import Header from './components/Layout/Header';
import Footer from './components/Layout/Footer';
import Home from './components/Home/Home';
import About from './components/About/About';
import ScreeningHub from './components/Screening/ScreeningHub';
import ChatAssistant from './components/Chat/ChatAssistant';
import Dashboard from './components/Professional/Dashboard';
import MyPlans from './components/TreatmentPlan/MyPlans';
import Contact from './components/Contact/Contact';
import StaffPanel from './components/Staff/StaffPanel';
import { getPatientMe, AuthError } from './lib/api';
import { getPatientSession, savePatientSession, clearPatientSession } from './lib/patientSession';
import { getSessionId } from './lib/session';

const AIMOTIONWebsite = () => {
  const [activeSection, setActiveSection] = useState('inicio');
  const sessionId = getSessionId();

  // El perfil guardado en el navegador puede estar desactualizado (p. ej. el administrador cambio el
  // perfil o suspendio la cuenta): se confirma con el servidor al abrir la aplicacion.
  useEffect(() => {
    if (!getPatientSession()?.user) return;
    getPatientMe()
      .then(({ user }) => savePatientSession({ user }))
      .catch((err) => {
        if (err instanceof AuthError) clearPatientSession();
      });
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-50 via-white to-celeste-50">
      <Header activeSection={activeSection} onNavigate={setActiveSection} />

      <div className="container mx-auto px-6 py-8">
        {activeSection === 'inicio' && <Home onNavigate={setActiveSection} />}
        {activeSection === 'nosotros' && <About />}
        {activeSection === 'tamizaje' && <ScreeningHub sessionId={sessionId} userName="" />}
        {activeSection === 'chat' && <ChatAssistant />}
        {activeSection === 'mi-progreso' && <MyPlans />}
        {activeSection === 'funcionario' && <StaffPanel />}
        {activeSection === 'profesional' && <Dashboard />}
        {activeSection === 'contacto' && <Contact />}
      </div>

      <Footer />
    </div>
  );
};

export default AIMOTIONWebsite;
