// Envia un SMS de prueba por la pasarela propia (celular Android) para
// verificar que la configuracion de SMS_GATEWAY_* en .env funciona.
//
// Uso:  npm run test-sms -- --phone=3001234567
import 'dotenv/config';
import { config, isContactSmsConfigured } from '../src/config.js';
import { normalizePhone } from '../src/utils/phone.js';

const arg = process.argv.find((a) => a.startsWith('--phone='));
const phone = normalizePhone(arg?.split('=')[1]);

if (!phone) {
  console.error('Uso: npm run test-sms -- --phone=3001234567   (celular colombiano o con +codigo de pais)');
  process.exit(1);
}
if (!isContactSmsConfigured()) {
  console.error('Falta configurar SMS_GATEWAY_URL, SMS_GATEWAY_USER y SMS_GATEWAY_PASS en .env (ver .env.example).');
  process.exit(1);
}

const auth = Buffer.from(`${config.smsGateway.username}:${config.smsGateway.password}`).toString('base64');
try {
  const res = await fetch(config.smsGateway.url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Basic ${auth}` },
    body: JSON.stringify({ message: 'AIMotion: mensaje de prueba de la pasarela SMS. Si lo recibes, todo funciona.', phoneNumbers: [phone] }),
    signal: AbortSignal.timeout(10000),
  });
  const body = await res.text();
  console.log(`Respuesta de la pasarela: HTTP ${res.status}`);
  console.log(body);
  if (res.ok) console.log(`\nListo: SMS en cola hacia ${phone}. Revisa el celular destino en unos segundos.`);
  else console.log('\nLa pasarela rechazó la petición: revisa la URL, usuario y contraseña.');
} catch (err) {
  console.error('No se pudo contactar la pasarela:', err.message);
  console.error('Revisa que el celular esté encendido, con la app abierta y en la misma red WiFi (modo local).');
  process.exit(1);
}
