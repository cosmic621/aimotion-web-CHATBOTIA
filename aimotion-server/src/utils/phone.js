/**
 * Normaliza un telefono a formato internacional (E.164).
 * - Con "+" se respeta el codigo de pais (8 a 15 digitos).
 * - Celular colombiano de 10 digitos que empieza por 3 -> +57XXXXXXXXXX.
 * - 12 digitos que empiezan por 57 -> +57XXXXXXXXXX.
 * Devuelve null si no parece un numero valido.
 */
export function normalizePhone(input) {
  const raw = String(input || '').trim();
  const digits = raw.replace(/\D/g, '');
  if (raw.startsWith('+')) {
    return digits.length >= 8 && digits.length <= 15 ? `+${digits}` : null;
  }
  if (digits.length === 10 && digits.startsWith('3')) return `+57${digits}`;
  if (digits.length === 12 && digits.startsWith('57')) return `+${digits}`;
  return null;
}
