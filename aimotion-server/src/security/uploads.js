// Restriccion de subida de archivos (item 16).
// AIMotion NO acepta archivos: toda la API habla JSON. Se rechazan de forma
// explicita los cuerpos multipart/binarios y cualquier otro Content-Type.
// Si algun dia se agregan subidas, hacerlo en una ruta dedicada con lista blanca
// de tipos, limite de tamano, nombres aleatorios, y escaneo antes de almacenarlas.

const BODY_METHODS = new Set(['POST', 'PUT', 'PATCH']);

export function rejectUploads(req, res, next) {
  const ct = String(req.headers['content-type'] || '').toLowerCase();
  if (ct.startsWith('multipart/') || ct.startsWith('application/octet-stream')) {
    return res.status(415).json({ error: 'Esta API no acepta archivos' });
  }
  return next();
}

export function requireJson(req, res, next) {
  if (BODY_METHODS.has(req.method)) {
    const hasBody = Number(req.headers['content-length'] || 0) > 0 || Boolean(req.headers['transfer-encoding']);
    const ct = String(req.headers['content-type'] || '').toLowerCase();
    if (hasBody && !ct.startsWith('application/json')) {
      return res.status(415).json({ error: 'El Content-Type debe ser application/json' });
    }
  }
  return next();
}
