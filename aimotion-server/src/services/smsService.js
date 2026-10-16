import twilio from 'twilio';

/** SMS opcional al PROFESIONAL por Twilio (distinto del SMS al contacto de emergencia). */
export function createProfessionalSmsService({ twilioConfig }) {
  const configured = () => Boolean(twilioConfig.accountSid && twilioConfig.authToken && twilioConfig.fromNumber && twilioConfig.to.length);
  let client = null;

  async function sendAlert(alert) {
    if (!configured()) return { sent: false, reason: 'Twilio no configurado' };
    client ||= twilio(twilioConfig.accountSid, twilioConfig.authToken);
    const body = `AIMotion ALERTA ${String(alert.severity).toUpperCase()}. Revise el panel profesional de inmediato.`;
    try {
      await Promise.all(twilioConfig.to.map((to) => client.messages.create({ from: twilioConfig.fromNumber, to, body })));
      return { sent: true };
    } catch (err) {
      return { sent: false, reason: err.message };
    }
  }
  return { sendAlert, configured };
}
