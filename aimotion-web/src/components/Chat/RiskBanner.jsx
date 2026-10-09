import React from 'react';
import { ShieldAlert, PhoneCall, CheckCircle2, AlertTriangle } from 'lucide-react';
import { RISK_CATEGORY_LABELS } from '../../lib/riskEngine';

const EMERGENCY_LINES = [
  { label: 'Línea 106', detail: 'Orientación en salud mental, 24/7 y gratuita', tel: '106' },
  { label: 'Línea de la Vida', detail: 'Prevención de suicidio y crisis', tel: '018000113113' },
  { label: 'Emergencias', detail: 'Atención inmediata en crisis', tel: '123' },
];

export default function RiskBanner({ category, notificationStatus, onContinue }) {
  const emailSent = notificationStatus?.email?.sent;
  const smsSent = notificationStatus?.sms?.sent;
  const anySent = emailSent || smsSent;

  return (
    <div className="max-w-3xl mx-auto bg-white rounded-3xl shadow-2xl overflow-hidden border-4 border-red-400">
      <div className="bg-red-600 text-white p-6 flex items-start gap-4">
        <ShieldAlert className="w-10 h-10 flex-shrink-0" />
        <div>
          <h2 className="text-2xl font-bold">Detectamos una señal importante</h2>
          <p className="text-red-100 text-sm mt-1">
            Categoría identificada: {RISK_CATEGORY_LABELS[category] || category}
          </p>
        </div>
      </div>

      <div className="p-8 space-y-6">
        <p className="text-gray-800 text-lg leading-relaxed">
          Lo que compartiste es serio, y por eso el asistente automático se pausó. Tu vida y tu seguridad
          importan más que cualquier respuesta programada.
        </p>

        <div
          className={`flex items-start gap-3 p-4 rounded-2xl ${
            anySent ? 'bg-green-50 text-green-800' : 'bg-amber-50 text-amber-800'
          }`}
        >
          {anySent ? <CheckCircle2 className="w-6 h-6 flex-shrink-0" /> : <AlertTriangle className="w-6 h-6 flex-shrink-0" />}
          <p className="text-sm">
            {anySent
              ? 'Ya notificamos a un profesional de la red de apoyo sobre esta situación. Alguien revisará tu caso lo antes posible.'
              : 'Intentamos notificar a un profesional automáticamente, pero no pudimos confirmar el envío. Por favor contacta ahora mismo una de las líneas de abajo mientras seguimos intentando.'}
          </p>
        </div>

        {notificationStatus?.contactSms?.sent && (
          <div className="flex items-start gap-3 p-4 rounded-2xl bg-green-50 text-green-800">
            <CheckCircle2 className="w-6 h-6 flex-shrink-0" />
            <p className="text-sm">
              También le enviamos un SMS a tu contacto de emergencia para que pueda comunicarse contigo.
              No compartimos nada de lo que escribiste.
            </p>
          </div>
        )}
        {notificationStatus?.contactSms?.alreadyNotified && (
          <p className="text-sm text-gray-600">Tu contacto de emergencia ya fue avisado hace poco.</p>
        )}

        <div>
          <h3 className="font-bold text-gray-900 mb-3">Contacta ahora, no esperes:</h3>
          <div className="grid sm:grid-cols-3 gap-3">
            {EMERGENCY_LINES.map((line) => (
              <a
                key={line.tel}
                href={`tel:${line.tel}`}
                className="flex flex-col items-center text-center gap-2 border-2 border-red-200 rounded-2xl p-4 hover:bg-red-50 transition"
              >
                <PhoneCall className="w-6 h-6 text-red-600" />
                <span className="font-semibold text-gray-900">{line.label}</span>
                <span className="text-xs text-gray-500">{line.detail}</span>
              </a>
            ))}
          </div>
        </div>

        <p className="text-gray-600 text-sm">
          Si no puedes llamar ahora, ¿hay alguien cerca — un amigo, familiar o vecino — con quien puedas estar
          mientras llega ayuda?
        </p>

        <button
          onClick={onContinue}
          className="w-full bg-gray-900 text-white py-4 rounded-full font-semibold hover:bg-gray-800 transition"
        >
          Estoy a salvo por ahora, quiero seguir hablando
        </button>
      </div>
    </div>
  );
}
