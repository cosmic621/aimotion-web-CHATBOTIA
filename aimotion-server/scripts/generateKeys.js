// Genera secretos aleatorios fuertes para el .env. NO los guardes en git.
import crypto from 'node:crypto';

console.log('Copia estas líneas a aimotion-server/.env (cada secreto distinto, nunca en git):\n');
console.log(`JWT_SECRET=${crypto.randomBytes(48).toString('hex')}`);
console.log(`DATA_ENCRYPTION_KEY=${crypto.randomBytes(32).toString('hex')}`);
console.log('\nGuarda DATA_ENCRYPTION_KEY también en un lugar seguro (gestor de contraseñas):');
console.log('si la pierdes, los datos cifrados (chats, contactos) NO se pueden recuperar.');
