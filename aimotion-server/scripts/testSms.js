// Envia un SMS de prueba por la pasarela propia (celular Android) para verificar
// SMS_GATEWAY_* en .env.   Uso: npm run test-sms -- --phone=3001234567
import 'dotenv/config';
import { normalizePhone } from '../src/utils/phone.js';
import { createContactSmsService } from '../src/services/contactSmsService.js';

const arg = process.argv.find((a) => a.startsWith('--phone='));
const phone = normalizePhone(arg?.split('=')[1]);
if (!phone) {
  console.error('Uso: npm run test-sms -- --phone=3001234567   (celular colombiano o con +codigo de pais)');
  process.exit(1);
}
const gateway = { url: process.env.SMS_GATEWAY_URL || '', username: process.env.SMS_GATEWAY_USER || '', password: process.env.SMS_GATEWAY_PASS || '' };
const svc = createContactSmsService({ gateway });
if (!svc.configured()) {
  console.error('Falta configurar SMS_GATEWAY_URL, SMS_GATEWAY_USER y SMS_GATEWAY_PASS en .env (ver .env.example).');
  process.exit(1);
}
const result = await svc.send({ name: 'Prueba', emergencyContact: { phone } });
console.log(result.sent ? `Listo: SMS en cola hacia ${phone}. Revisa el celular destino.` : `No se envió: ${result.reason}`);
process.exit(result.sent ? 0 : 1);
