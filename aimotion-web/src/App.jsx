import React, { useState } from 'react';
import Header from './components/Layout/Header';
import Footer from './components/Layout/Footer';
import Home from './components/Home/Home';
import About from './components/About/About';
import ScreeningHub from './components/Screening/ScreeningHub';
import ChatAssistant from './components/Chat/ChatAssistant';
import Dashboard from './components/Professional/Dashboard';
import MyPlans from './components/TreatmentPlan/MyPlans';
import Contact from './components/Contact/Contact';
import { getSessionId } from './lib/session';

const AIMOTIONWebsite = () => {
  const [activeSection, setActiveSection] = useState('inicio');
  const sessionId = getSessionId();

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50">
      <Header activeSection={activeSection} onNavigate={setActiveSection} />

      <div className="container mx-auto px-6 py-8">
        {activeSection === 'inicio' && <Home onNavigate={setActiveSection} />}
        {activeSection === 'nosotros' && <About />}
        {activeSection === 'tamizaje' && <ScreeningHub sessionId={sessionId} userName="" />}
        {activeSection === 'chat' && <ChatAssistant />}
        {activeSection === 'mi-progreso' && <MyPlans />}
        {activeSection === 'profesional' && <Dashboard />}
        {activeSection === 'contacto' && <Contact />}
      </div>

      <Footer />
    </div>
  );
};

export default AIMOTIONWebsite;
