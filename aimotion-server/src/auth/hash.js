// Hash de contrasenas (item 10). bcrypt con costo >= 12, inyectable para pruebas.
//
// - verify() hace SIEMPRE un compare, incluso si el usuario no existe (contra un
//   hash falso), para que el tiempo de respuesta no revele si un correo esta registrado.
// - Rechaza contrasenas de mas de 72 bytes (bcrypt las truncaria en silencio).
export const MIN_COST = 12;
const MAX_BYTES = 72;

export function createPasswordHasher({ bcrypt, cost = MIN_COST }) {
  const rounds = Math.max(MIN_COST, Number(cost) || MIN_COST);
  let dummyHash = null;

  const tooLong = (pw) => Buffer.byteLength(String(pw), 'utf8') > MAX_BYTES;

  async function hash(password) {
    if (typeof password !== 'string' || !password) throw new Error('Contraseña inválida');
    if (tooLong(password)) throw new Error('La contraseña supera el límite de 72 bytes');
    return bcrypt.hash(password, rounds);
  }

  /** @param {string|null} storedHash null si el usuario no existe */
  async function verify(password, storedHash) {
    if (!dummyHash) dummyHash = await bcrypt.hash('contrasena-falsa-para-igualar-tiempos', rounds);
    const candidate = typeof password === 'string' && !tooLong(password) ? password : '';
    const ok = await bcrypt.compare(candidate, storedHash || dummyHash);
    return Boolean(storedHash) && ok && candidate !== '';
  }

  /** true si el hash guardado usa un costo menor al actual (conviene re-hashear al iniciar sesion). */
  function needsRehash(storedHash) {
    const m = /^\$2[aby]\$(\d{2})\$/.exec(String(storedHash || ''));
    return !m || Number(m[1]) < rounds;
  }

  return { hash, verify, needsRehash, rounds };
}
