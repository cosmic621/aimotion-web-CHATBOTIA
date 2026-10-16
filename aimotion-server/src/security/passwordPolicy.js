// Politica de contrasenas (item 10). El hash (bcrypt) se calcula en auth/hash.js.
// Sigue la linea de NIST SP 800-63B: longitud minima + lista de contrasenas
// comunes + no derivadas de datos de la cuenta, sin reglas de composicion absurdas.

const COMMON = new Set([
  '123456', '1234567', '12345678', '123456789', '1234567890', '12345678910', 'password', 'password1', 'password123',
  'contrasena', 'contrasena1', 'contrasena123', 'qwerty', 'qwerty123', 'qwertyuiop', 'abc123', 'abcd1234', '111111',
  '000000', '123123', 'iloveyou', 'admin', 'admin123', 'administrador', 'welcome', 'welcome1', 'letmein', 'monkey',
  'dragon', 'football', 'futbol', 'colombia', 'colombia123', 'bogota', 'bogota123', 'medellin', '123qwe', '1q2w3e4r',
  'q1w2e3r4', 'minecraft', 'superman', 'princesa', 'te amo', 'teamo', 'teamo123', 'mi amor', 'miamor', 'cambiame',
  'cambia esto', 'aimotion', 'aimotion123', 'universidad', 'ucundinamarca', 'psicologia', 'psicologo123',
]);

const MAX_BYTES = 72; // limite real de bcrypt: mas alla se ignora en silencio

function normalizeForCompare(s) {
  return String(s).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9 ]/g, '');
}

function isSequence(s) {
  if (s.length < 6) return false;
  // Casi toda la cadena avanza (o retrocede) de a un caracter: 123456, abcdef, 987654321098
  let asc = 0;
  let desc = 0;
  for (let i = 1; i < s.length; i++) {
    const d = s.charCodeAt(i) - s.charCodeAt(i - 1);
    if (d === 1) asc++;
    if (d === -1) desc++;
  }
  return Math.max(asc, desc) >= 0.8 * (s.length - 1);
}

/**
 * @returns {{ ok: boolean, reason?: string }}
 */
export function checkPassword(password, { email = '', name = '', minLength = 10 } = {}) {
  if (typeof password !== 'string') return { ok: false, reason: 'La contraseña es obligatoria' };
  if (password.length < minLength) return { ok: false, reason: `La contraseña debe tener al menos ${minLength} caracteres` };
  if (Buffer.byteLength(password, 'utf8') > MAX_BYTES) return { ok: false, reason: `La contraseña no puede superar ${MAX_BYTES} bytes` };

  const norm = normalizeForCompare(password);
  const compact = norm.replace(/ /g, '');
  if (COMMON.has(norm) || COMMON.has(compact)) return { ok: false, reason: 'Esa contraseña es demasiado común. Elige una más única.' };
  if (/^(.)\1+$/.test(compact)) return { ok: false, reason: 'La contraseña no puede ser un solo carácter repetido' };
  if (isSequence(compact)) return { ok: false, reason: 'La contraseña no puede ser una secuencia simple (123456, abcdef)' };

  const local = normalizeForCompare(String(email).split('@')[0]).replace(/ /g, '');
  if (local.length >= 4 && compact.includes(local)) return { ok: false, reason: 'La contraseña no debe contener tu correo' };
  const first = normalizeForCompare(String(name).split(/\s+/)[0] || '').replace(/ /g, '');
  if (first.length >= 4 && compact.includes(first)) return { ok: false, reason: 'La contraseña no debe contener tu nombre' };

  if (new Set(compact).size < 4) return { ok: false, reason: 'La contraseña es demasiado simple' };
  return { ok: true };
}
