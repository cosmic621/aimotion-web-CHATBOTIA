// Cifrado de datos sensibles a nivel de aplicacion (item 5).
//
// AES-256-GCM (cifrado autenticado): protege la confidencialidad Y detecta
// manipulaciones. Cada valor lleva su propio IV aleatorio y un identificador de
// clave (para poder rotar claves sin perder datos antiguos). El contexto (AAD,
// p. ej. "chat_messages.content") queda ligado al dato: un cifrado copiado a
// otra columna no se puede descifrar.
//
// Formato: enc:<keyId>:<iv>:<tag>:<ciphertext>   (base64url)
import crypto from 'node:crypto';

const PREFIX = 'enc:';

export function parseKey(text) {
  const s = String(text || '').trim();
  if (/^[0-9a-fA-F]{64}$/.test(s)) return Buffer.from(s, 'hex');
  const b = Buffer.from(s, 'base64');
  if (b.length === 32) return b;
  throw new Error('La clave de cifrado debe tener 32 bytes (64 caracteres hex o 44 en base64)');
}

export function generateKey() {
  return crypto.randomBytes(32).toString('hex');
}

const b64u = (buf) => buf.toString('base64url');
const fromB64u = (s) => Buffer.from(s, 'base64url');

/**
 * @param {{ keys: Record<string, Buffer>, currentKeyId: string }} config
 */
export function createCipherBox({ keys, currentKeyId }) {
  if (!keys?.[currentKeyId]) throw new Error('Falta la clave de cifrado actual');
  for (const [id, key] of Object.entries(keys)) {
    if (!/^[A-Za-z0-9_-]{1,16}$/.test(id)) throw new Error(`Identificador de clave inválido: ${id}`);
    if (!Buffer.isBuffer(key) || key.length !== 32) throw new Error(`La clave ${id} debe tener 32 bytes`);
  }

  const isEncrypted = (value) => typeof value === 'string' && value.startsWith(PREFIX) && value.split(':').length === 5;

  function encrypt(plain, aad) {
    if (plain === null || plain === undefined) return plain;
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv('aes-256-gcm', keys[currentKeyId], iv);
    cipher.setAAD(Buffer.from(String(aad || '')));
    const ct = Buffer.concat([cipher.update(String(plain), 'utf8'), cipher.final()]);
    return `${PREFIX}${currentKeyId}:${b64u(iv)}:${b64u(cipher.getAuthTag())}:${b64u(ct)}`;
  }

  function decrypt(value, aad) {
    if (value === null || value === undefined) return value;
    // Datos antiguos en texto plano (anteriores al cifrado): se devuelven tal cual.
    if (!isEncrypted(value)) return value;
    const [, keyId, iv, tag, ct] = value.split(':');
    const key = keys[keyId];
    if (!key) throw new Error(`No se pudo descifrar el dato: clave "${keyId}" desconocida`);
    try {
      const decipher = crypto.createDecipheriv('aes-256-gcm', key, fromB64u(iv));
      decipher.setAAD(Buffer.from(String(aad || '')));
      decipher.setAuthTag(fromB64u(tag));
      return Buffer.concat([decipher.update(fromB64u(ct)), decipher.final()]).toString('utf8');
    } catch {
      throw new Error('No se pudo descifrar el dato (clave o contexto incorrectos, o dato alterado)');
    }
  }

  // JSON (JSONB en Postgres): se guarda como { enc: "enc:..." }
  const encryptJson = (obj, aad) => (obj === null || obj === undefined ? obj : { enc: encrypt(JSON.stringify(obj), aad) });
  const decryptJson = (stored, aad) => {
    if (stored === null || stored === undefined) return stored;
    if (typeof stored === 'object' && !Array.isArray(stored) && typeof stored.enc === 'string') {
      return JSON.parse(decrypt(stored.enc, aad));
    }
    return stored; // JSON antiguo sin cifrar
  };

  return { encrypt, decrypt, encryptJson, decryptJson, isEncrypted, currentKeyId };
}

/**
 * Construye el cifrador desde variables de entorno:
 *   DATA_ENCRYPTION_KEY (+ DATA_ENCRYPTION_KEY_ID, def. k1)  clave actual
 *   DATA_ENCRYPTION_KEY_OLD (+ _OLD_ID, def. k0)              clave anterior, solo para descifrar (rotacion)
 */
export function createCipherBoxFromEnv(env) {
  if (!env.DATA_ENCRYPTION_KEY) throw new Error('Falta DATA_ENCRYPTION_KEY');
  const currentKeyId = env.DATA_ENCRYPTION_KEY_ID || 'k1';
  const keys = { [currentKeyId]: parseKey(env.DATA_ENCRYPTION_KEY) };
  if (env.DATA_ENCRYPTION_KEY_OLD) keys[env.DATA_ENCRYPTION_KEY_OLD_ID || 'k0'] = parseKey(env.DATA_ENCRYPTION_KEY_OLD);
  return createCipherBox({ keys, currentKeyId });
}

/** Comparacion en tiempo constante de dos strings. */
export function safeEqual(a, b) {
  const x = Buffer.from(String(a));
  const y = Buffer.from(String(b));
  return x.length === y.length && crypto.timingSafeEqual(x, y);
}
