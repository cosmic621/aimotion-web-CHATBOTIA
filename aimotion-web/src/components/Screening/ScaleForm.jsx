import React, { useState } from 'react';
import { RESPONSE_OPTIONS, PHQ9_QUESTIONS, GAD7_QUESTIONS, scorePHQ9, scoreGAD7 } from '../../lib/scales';
import { checkPHQ9Item9 } from '../../lib/riskEngine';
import { postScreening, postAlert } from '../../lib/api';
import { CheckCircle2 } from 'lucide-react';
import RiskBanner from '../Chat/RiskBanner';

const SCALE_CONFIG = {
  'PHQ-9': { questions: PHQ9_QUESTIONS, score: scorePHQ9, title: 'PHQ-9 · Cuestionario de salud del paciente' },
  'GAD-7': { questions: GAD7_QUESTIONS, score: scoreGAD7, title: 'GAD-7 · Escala de ansiedad generalizada' },
};

export default function ScaleForm({ type, sessionId, userName, onCriticalRisk }) {
  const config = SCALE_CONFIG[type];
  const [answers, setAnswers] = useState(Array(config.questions.length).fill(null));
  const [result, setResult] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [criticalAlert, setCriticalAlert] = useState(null); // { category, notificationStatus }

  const allAnswered = answers.every((a) => a !== null);

  const handleSelect = (qIndex, value) => {
    const next = [...answers];
    next[qIndex] = value;
    setAnswers(next);
  };

  const handleSubmit = async () => {
    if (!allAnswered) return;
    setSubmitting(true);
    const { total, severity } = config.score(answers);

    try {
      await postScreening({
        sessionId,
        userName,
        type,
        answers,
        totalScore: total,
        severity,
      });

      if (type === 'PHQ-9') {
        const risk = checkPHQ9Item9(answers);
        if (risk) {
          const alert = await postAlert({
            sessionId,
            userName,
            category: risk.category,
            severity: risk.severity,
            excerpt: `Ítem 9 del PHQ-9 positivo (respuesta: "${RESPONSE_OPTIONS[answers[8]].label}")`,
            source: 'phq9',
          });
          setCriticalAlert({ category: risk.category, notificationStatus: alert.notifications });
          onCriticalRisk?.(risk);
        }
      }
    } catch (err) {
      console.error('No se pudo registrar el tamizaje en el servidor:', err.message);
    } finally {
      setResult({ total, severity });
      setSubmitting(false);
    }
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
        <h3 className="text-2xl font-bold text-gray-900 mb-2">Tamizaje registrado</h3>
        <p className="text-gray-600 mb-6">
          Puntaje total: <strong>{result.total}</strong> — Nivel: <strong className="capitalize">{result.severity}</strong>
        </p>
        <p className="text-sm text-gray-500 max-w-lg mx-auto">
          Este resultado es preliminar y no constituye un diagnóstico. Quedó registrado para que el
          profesional a cargo lo revise y lo contextualice contigo en una consulta.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-3xl shadow-xl p-8 md:p-10">
      <h3 className="text-2xl font-bold text-gray-900 mb-1">{config.title}</h3>
      <p className="text-gray-500 mb-8 text-sm">
        Durante las últimas 2 semanas, ¿con qué frecuencia te ha molestado alguno de los siguientes problemas?
      </p>

      <div className="space-y-8">
        {config.questions.map((question, qIndex) => (
          <div key={qIndex} className="border-b border-gray-100 pb-6 last:border-0">
            <p className="font-medium text-gray-800 mb-3">
              {qIndex + 1}. {question}
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
        ))}
      </div>

      <button
        onClick={handleSubmit}
        disabled={!allAnswered || submitting}
        className="mt-8 w-full bg-gradient-to-r from-purple-600 to-blue-600 text-white py-4 rounded-full font-semibold disabled:opacity-40 disabled:cursor-not-allowed hover:shadow-lg transition"
      >
        {submitting ? 'Registrando...' : 'Finalizar y enviar para revisión profesional'}
      </button>
    </div>
  );
}
