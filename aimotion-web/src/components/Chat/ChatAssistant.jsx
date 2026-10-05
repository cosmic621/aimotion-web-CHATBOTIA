import React, { useState, useRef, useEffect } from 'react';
import { Heart, Send, Shield } from 'lucide-react';
import { getBotResponse, INTRO_MESSAGE } from '../../lib/botResponses';
import { analyzeTextRisk, RISK_CATEGORY_LABELS } from '../../lib/riskEngine';
import { postAlert } from '../../lib/api';
import { getSessionId } from '../../lib/session';
import RiskBanner from './RiskBanner';

export default function ChatAssistant() {
  const [messages, setMessages] = useState([{ type: 'bot', text: INTRO_MESSAGE }]);
  const [inputMessage, setInputMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [userName, setUserName] = useState('');
  const [criticalRisk, setCriticalRisk] = useState(null); // { category, notificationStatus }
  const messagesEndRef = useRef(null);
  const sessionId = useRef(getSessionId()).current;

  useEffect(() => {
    // block: 'nearest' evita que el navegador desplace toda la pagina;
    // solo hace scroll dentro del contenedor de mensajes.
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [messages, criticalRisk]);

  const escalate = async (risk, excerpt) => {
    try {
      const alert = await postAlert({
        sessionId,
        userName,
        category: risk.category,
        severity: risk.severity,
        excerpt,
        source: 'chat',
      });
      return alert.notifications;
    } catch (err) {
      console.error('No se pudo registrar la alerta:', err.message);
      return { email: { sent: false }, sms: { sent: false } };
    }
  };

  const handleSendMessage = async () => {
    const text = inputMessage.trim();
    if (text === '' || criticalRisk) return;

    const userMsg = { type: 'user', text };
    setMessages((prev) => [...prev, userMsg]);
    setInputMessage('');

    const risk = analyzeTextRisk(text);

    if (risk && risk.severity === 'critico') {
      // Protocolo de escalamiento: se desactivan las respuestas automatizadas
      // estandar y se notifica de inmediato al profesional.
      setIsTyping(false);
      const notificationStatus = await escalate(risk, text);
      setCriticalRisk({ category: risk.category, notificationStatus });
      return;
    }

    setIsTyping(true);

    if (risk && risk.severity === 'alto') {
      // No se bloquea la conversacion, pero se registra y notifica igual.
      escalate(risk, text);
    }

    setTimeout(() => {
      const { text: botText, detectedName } = getBotResponse(text, userName);
      if (detectedName) setUserName(detectedName);

      const extra =
        risk && risk.severity === 'alto'
          ? `\n\n(He compartido esto con el profesional a cargo para que pueda darte seguimiento: ${RISK_CATEGORY_LABELS[risk.category]}.)`
          : '';

      setMessages((prev) => [...prev, { type: 'bot', text: botText + extra }]);
      setIsTyping(false);
    }, 1200);
  };

  const handleContinueAfterRisk = () => {
    setCriticalRisk(null);
    setMessages((prev) => [
      ...prev,
      { type: 'bot', text: 'Sigo aquí contigo. Cuando quieras, cuéntame cómo estás en este momento.' },
    ]);
  };

  return (
    <div className="max-w-6xl mx-auto">
      {criticalRisk ? (
        <RiskBanner
          category={criticalRisk.category}
          notificationStatus={criticalRisk.notificationStatus}
          onContinue={handleContinueAfterRisk}
        />
      ) : (
        <div
          className="bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col animate-fade-in-up"
          style={{ height: 'calc(100vh - 180px)', minHeight: '480px' }}
        >
          <div className="flex-shrink-0 bg-gradient-to-r from-purple-600 via-blue-600 to-purple-600 text-white p-6">
            <div className="flex items-center space-x-4">
              <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center flex-shrink-0">
                <Heart className="w-8 h-8 text-purple-600" />
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="text-2xl font-bold">Asistente de Apoyo y Tamizaje</h2>
                <p className="text-purple-100 flex items-center gap-2 text-sm">
                  <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
                  No diagnostica · Supervisado por un profesional
                </p>
              </div>
              <div className="hidden md:flex items-center gap-4 text-sm">
                <div className="flex items-center gap-2 bg-white/20 px-4 py-2 rounded-full">
                  <Shield className="w-4 h-4" />
                  <span>Confidencial</span>
                </div>
              </div>
            </div>
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto p-8 space-y-6 bg-gradient-to-b from-purple-50/30 to-blue-50/30">
            {messages.map((msg, idx) => (
              <div
                key={idx}
                className={`flex animate-message-in ${msg.type === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {msg.type === 'bot' && (
                  <div className="w-10 h-10 rounded-full bg-gradient-to-r from-purple-600 to-blue-600 flex items-center justify-center mr-3 flex-shrink-0">
                    <Heart className="w-5 h-5 text-white" />
                  </div>
                )}
                <div
                  className={`max-w-2xl p-5 rounded-3xl shadow-lg ${
                    msg.type === 'user'
                      ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-br-none'
                      : 'bg-white text-gray-800 rounded-bl-none border-l-4 border-purple-600'
                  }`}
                >
                  <p className="text-base leading-relaxed whitespace-pre-line">{msg.text}</p>
                </div>
                {msg.type === 'user' && (
                  <div className="w-10 h-10 rounded-full bg-gradient-to-r from-pink-500 to-purple-500 flex items-center justify-center ml-3 flex-shrink-0">
                    <span className="text-white font-bold">{userName.charAt(0) || '💜'}</span>
                  </div>
                )}
              </div>
            ))}

            {isTyping && (
              <div className="flex justify-start animate-message-in">
                <div className="w-10 h-10 rounded-full bg-gradient-to-r from-purple-600 to-blue-600 flex items-center justify-center mr-3">
                  <Heart className="w-5 h-5 text-white" />
                </div>
                <div className="bg-white p-5 rounded-3xl rounded-bl-none shadow-lg">
                  <div className="flex space-x-2">
                    <div className="w-3 h-3 bg-purple-400 rounded-full animate-bounce"></div>
                    <div className="w-3 h-3 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                    <div className="w-3 h-3 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className="flex-shrink-0 p-6 bg-white border-t-2 border-purple-100">
            <div className="flex space-x-3">
              <input
                type="text"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                placeholder="Escribe lo que sientes... no hay respuestas incorrectas 💜"
                className="flex-1 border-2 border-purple-200 rounded-full px-6 py-4 focus:outline-none focus:ring-2 focus:ring-purple-600 focus:border-transparent text-lg"
              />
              <button
                onClick={handleSendMessage}
                className="bg-gradient-to-r from-purple-600 to-blue-600 text-white px-8 py-4 rounded-full hover:shadow-xl transition transform hover:scale-105 flex items-center gap-2 font-semibold"
              >
                <Send className="w-5 h-5" />
                <span className="hidden sm:inline">Enviar</span>
              </button>
            </div>
            <p className="text-sm text-gray-500 mt-3 text-center">
              Este espacio es confidencial y puede ser revisado por el equipo profesional a cargo 🔒
            </p>
          </div>
        </div>
      )}
    </div>
  );
}