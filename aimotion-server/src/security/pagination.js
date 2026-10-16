// Limites de respuesta de la API (item 17): ninguna lista devuelve un volumen
// ilimitado de datos. ?limit= (1..max) y ?offset= (>=0), con valores por defecto.

export function parsePagination(query = {}, { defaultLimit = 50, maxLimit = 100 } = {}) {
  const toInt = (v, fallback) => {
    if (v === undefined || v === null || v === '') return fallback;
    const n = Number(v);
    return Number.isInteger(n) ? n : NaN;
  };
  const limit = toInt(query.limit, defaultLimit);
  const offset = toInt(query.offset, 0);
  if (Number.isNaN(limit) || Number.isNaN(offset) || limit < 1 || offset < 0) {
    return { ok: false, error: 'limit y offset deben ser enteros positivos' };
  }
  return { ok: true, limit: Math.min(limit, maxLimit), offset: Math.min(offset, 1_000_000) };
}

/** Informa si hay mas resultados sin cambiar la forma (array) de la respuesta. */
export function setPaginationHeaders(res, { limit, offset, returned }) {
  res.setHeader('X-Limit', String(limit));
  res.setHeader('X-Offset', String(offset));
  res.setHeader('X-Has-More', returned >= limit ? 'true' : 'false');
}
