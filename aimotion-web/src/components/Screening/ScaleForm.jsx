import React, { useState, useRef } from 'react';
import { RESPONSE_OPTIONS, PHQ9_QUESTIONS, GAD7_QUESTIONS, scorePHQ9, scoreGAD7 } from '../../lib/scales';
import { checkPHQ9Item9 } from '../../lib/riskEngine';
import { postScreening, postAlert } from '../../lib/api';
import { CheckCircle2, AlertTriangle } from 'lucide-react';
import RiskBanner from '../Chat/RiskBanner';

const SCALE_CONFIG = {
  'PHQ-9': { questions: PHQ9_QUESTIONS, score: scorePHQ9, title: 'PHQ-9 · Cuestionario de salud del paciente' },
  'GAD-7': { questions: GAD7_QUESTIONS, score: scoreGAD7, title: 'GAD-7 · Escala de ansiedad generalizada' },
};

export default function ScaleForm({ type, sessionId, userName }) {
  const config = SCALE_CONFIG[type];
  const [answers, setAnswers] = useState(Array(config.questions.length).fill(null));
  const [result, setResult] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [showMissing, setShowMissing] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [criticalAlert, setCriticalAlert] = useState(null);
  const questionRefs = useRef([]);

  const answeredCount = answers.filter((a) => a !== null).length;

  const handleSelect = (qIndex, value) => {
    setAnswers((prev) => prev.map((a, i) => (i === qIndex ? value : a)));
  };

  const saveToServer = async (finalAnswers, total, severity) => {
    setSaveError('');
    try {
      await postScreening({ sessionId, userName: userName || null, type, answers: finalAnswers, totalScore: total, severity });
      return true;
    } catch (err) {
      setSaveError(err.message || 'No se pudo conectar con el servidor');
      return false;
    }
  };

  const handleSubmit = async () => {
    const firstMissing = answers.findIndex((a) => a === null);
    if (firstMissing !== -1) {
      setShowMissing(true);
      questionRefs.current[firstMissing]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }

    setSubmitting(true);
    const { total, severity } = config.score(answers);

    // El riesgo se evalua LOCALMENTE primero: si el servidor falla, la
    // persona igual debe ver las lineas de emergencia.
    const risk = type === 'PHQ-9' ? checkPHQ9Item9(answers) : null;

    await saveToServer(answers, total, severity);

    if (risk) {
      let notificationStatus = { email: { sent: false }, sms: { sent: false } };
      try {
        const alert = await postAlert({
          sessionId,
          userName: userName || null,
          category: risk.category,
          severity: risk.severity,
          excerpt: `Ítem 9 del PHQ-9 positivo (respuesta: "${RESPONSE_OPTIONS[answers[8]].label}")`,
          source: 'phq9',
        });
        notificationStatus = alert.notifications;
      } catch (err) {
        console.error('No se pudo registrar la alerta:', err.message);
      }
      setCriticalAlert({ category: risk.category, notificationStatus });
    }

    setResult({ total, severity });
    setSubmitting(false);
  };

  const retrySave = async () => {
    setSubmitting(true);
    await saveToServer(answers, result.total, result.severity);
    setSubmitting(false);
  };

  if (criticalAlert) {
    return (
      <RiskBanner
        category={criticalAlert.category}
        notificationStatus={criticalAlert.notificationStatus}
        onContinue={() => setCriticalAlert(null)}
      />
    );
  }

  if (result) {
    return (
      <div className="bg-white rounded-3xl shadow-xl p-10 text-center">
        <CheckCircle2 className="w-14 h-14 text-green-600 mx-auto mb-4" />
        <h3 className="text-2xl font-bold text-gray-900 mb-2">Tamizaje completado</h3>
        <p className="text-gray-600 mb-6">
          Puntaje total: <strong>{result.total}</strong> — Nivel: <strong className="capitalize">{result.severity}</strong>
        </p>

        {saveError ? (
          <div className="bg-amber-50 text-amber-800 rounded-2xl p-4 max-w-lg mx-auto mb-4 text-sm">
            <AlertTriangle className="w-5 h-5 inline mr-2" />
            No pudimos enviar tu resultado al profesional ({saveError}).
            <button onClick={retrySave} disabled={submitting} className="block mx-auto mt-2 font-semibold underline">
              {submitting ? 'Reintentando...' : 'Reintentar envío'}
            </button>
          </div>
        ) : (
          <p className="text-sm text-gray-500 max-w-lg mx-auto">
            Este resultado es preliminar y no constituye un diagnóstico. Quedó registrado para que el
            profesional a cargo lo revise y lo contextualice contigo en una consulta.
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="bg-white rounded-3xl shadow-xl p-8 md:p-10">
      <h3 className="text-2xl font-bold text-gray-900 mb-1">{config.title}</h3>
      <p className="text-gray-500 mb-4 text-sm">
        Durante las últimas 2 semanas, ¿con qué frecuencia te ha molestado alguno de los siguientes problemas?
      </p>
      <p className="text-sm font-semibold text-purple-700 mb-8">
        Respondidas: {answeredCount} de {config.questions.length}
      </p>

      <div className="space-y-8">
        {config.questions.map((question, qIndex) => {
          const unanswered = showMissing && answers[qIndex] === null;
          return (
            <div
              key={qIndex}
              ref={(el) => (questionRefs.current[qIndex] = el)}
              className={`pb-6 border-b border-gray-100 last:border-0 rounded-xl ${unanswered ? 'bg-red-50 p-3 -m-3 mb-5' : ''}`}
            >
              <p className="font-medium text-gray-800 mb-3">
                {qIndex + 1}. {question}
                {unanswered && <span className="text-red-600 text-xs ml-2">← falta responder</span>}
              </p>
              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-2">
                {RESPONSE_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => handleSelect(qIndex, opt.value)}
                    className={`text-sm px-3 py-2 rounded-xl border-2 transition ${
                      answers[qIndex] === opt.value
                        ? 'border-purple-600 bg-purple-50 text-purple-700 font-semibold'
                        : 'border-gray-200 text-gray-600 hover:border-purple-300'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {showMissing && answeredCount < config.questions.length && (
        <p className="text-red-600 text-sm mt-6 text-center">
          Te falta responder {config.questions.length - answeredCount} pregunta(s), marcadas en rojo arriba.
        </p>
      )}

      <button
        onClick={handleSubmit}
        disabled={submitting}
        className="mt-6 w-full bg-gradient-to-r from-purple-600 to-blue-600 text-white py-4 rounded-full font-semibold disabled:opacity-50 hover:shadow-lg transition"
      >
        {submitting ? 'Enviando...' : 'Finalizar y enviar para revisión profesional'}
      </button>
    </div>
  );
}
