// Configuracion (items 1, 6, 19). Funcion PURA: recibe el entorno y devuelve la
// configuracion mas los errores/advertencias. Ningun secreto se imprime nunca.
import crypto from 'node:crypto';
import { validateEnv } from './security/configCheck.js';
import { cookieNames } from './security/cookies.js';

const list = (v) => String(v || '').split(',').map((s) => s.trim()).filter(Boolean);

export function loadConfig(env = process.env) {
  const { errors, warnings, isProd } = validateEnv(env);

  const forceHttps = isProd ? env.FORCE_HTTPS !== 'false' : env.FORCE_HTTPS === 'true';
  const secureCookies = isProd || forceHttps || env.COOKIE_SECURE === 'true';
  const raw = env.TRUST_PROXY;
  const trustProxy = !raw ? false : /^\d+$/.test(raw) ? Number(raw) : raw === 'true' ? 1 : raw;

  const databaseUrl = env.DATABASE_URL || '';
  const sslWanted = /sslmode=require/.test(databaseUrl) || env.DB_SSL === 'true';

  const config = {
    env: isProd ? 'production' : 'development',
    isProd,
    port: Number(env.PORT || 4000),
    corsOrigins: list(env.CORS_ORIGIN || 'http://localhost:5173'),
    databaseUrl,
    adminDatabaseUrl: env.ADMIN_DATABASE_URL || '',
    dbSsl: sslWanted ? { rejectUnauthorized: env.DB_SSL_REJECT_UNAUTHORIZED !== 'false' } : undefined,
    slowQueryMs: Number(env.SLOW_QUERY_MS || 200),
    jwtSecret: env.JWT_SECRET || '',
    // Clave independiente para CSRF: derivada, para no reutilizar el secreto de firma tal cual.
    csrfSecret: env.JWT_SECRET ? crypto.createHmac('sha256', env.JWT_SECRET).update('aimotion-csrf-v1').digest('hex') : '',
    bcryptCost: Math.max(12, Number(env.BCRYPT_COST || 12)),
    forceHttps,
    publicHost: env.PUBLIC_API_HOST || '',
    trustProxy,
    cookies: {
      secure: secureCookies,
      sameSite: ['Strict', 'Lax'].includes(env.COOKIE_SAMESITE) ? env.COOKIE_SAMESITE : 'Strict',
      names: cookieNames(secureCookies),
    },
    turnstileSecret: env.TURNSTILE_SECRET || '',
    smtp: {
      host: env.SMTP_HOST || '', port: Number(env.SMTP_PORT || 587), secure: env.SMTP_SECURE === 'true',
      user: env.SMTP_USER || '', pass: env.SMTP_PASS || '',
      from: env.ALERT_EMAIL_FROM || 'AIMotion Alertas <no-reply@aimotion.local>', to: list(env.ALERT_EMAIL_TO),
    },
    twilio: { accountSid: env.TWILIO_ACCOUNT_SID || '', authToken: env.TWILIO_AUTH_TOKEN || '', fromNumber: env.TWILIO_FROM_NUMBER || '', to: list(env.ALERT_SMS_TO) },
    smsGateway: { url: env.SMS_GATEWAY_URL || '', username: env.SMS_GATEWAY_USER || '', password: env.SMS_GATEWAY_PASS || '' },
  };
  return { config, errors, warnings };
}

/** Version de la configuracion segura para mostrar (sin secretos). */
export function redactConfig(config) {
  return {
    env: config.env, port: config.port, corsOrigins: config.corsOrigins, forceHttps: config.forceHttps,
    cookies: { secure: config.cookies.secure, sameSite: config.cookies.sameSite },
    trustProxy: config.trustProxy, bcryptCost: config.bcryptCost, turnstile: Boolean(config.turnstileSecret),
    emailConfigured: Boolean(config.smtp.host && config.smtp.user && config.smtp.pass && config.smtp.to.length),
    contactSmsConfigured: Boolean(config.smsGateway.url && config.smsGateway.username && config.smsGateway.password),
  };
}
