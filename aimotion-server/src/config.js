import 'dotenv/config';

function list(value) {
  return (value || '')
    .split(',')
    .map((v) => v.trim())
    .filter(Boolean);
}

export const config = {
  port: Number(process.env.PORT || 4000),
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  databaseUrl: process.env.DATABASE_URL || '',
  jwtSecret: process.env.JWT_SECRET || '',

  smtp: {
    host: process.env.SMTP_HOST || '',
    port: Number(process.env.SMTP_PORT || 587),
    secure: process.env.SMTP_SECURE === 'true',
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
    from: process.env.ALERT_EMAIL_FROM || 'AIMotion Alertas <no-reply@aimotion.local>',
    to: list(process.env.ALERT_EMAIL_TO),
  },

  // Pasarela SMS propia (sin Twilio): un celular Android con la app de codigo
  // abierto "SMS Gateway for Android" (capcom6). Se usa para avisar al
  // contacto de emergencia de la persona usuaria.
  smsGateway: {
    url: process.env.SMS_GATEWAY_URL || '',
    username: process.env.SMS_GATEWAY_USER || '',
    password: process.env.SMS_GATEWAY_PASS || '',
  },

  twilio: {
    accountSid: process.env.TWILIO_ACCOUNT_SID || '',
    authToken: process.env.TWILIO_AUTH_TOKEN || '',
    fromNumber: process.env.TWILIO_FROM_NUMBER || '',
    to: list(process.env.ALERT_SMS_TO),
  },
};

export const isEmailConfigured = () =>
  Boolean(config.smtp.host && config.smtp.user && config.smtp.pass && config.smtp.to.length);

export const isSmsConfigured = () =>
  Boolean(config.twilio.accountSid && config.twilio.authToken && config.twilio.fromNumber && config.twilio.to.length);

export const isContactSmsConfigured = () =>
  Boolean(config.smsGateway.url && config.smsGateway.username && config.smsGateway.password);
