// Utilidades para probar middlewares sin levantar un servidor.
export function fakeRes() {
  return {
    statusCode: 200, headers: {}, body: undefined, redirected: null, ended: false,
    setHeader(k, v) { this.headers[k.toLowerCase()] = v; },
    getHeader(k) { return this.headers[k.toLowerCase()]; },
    removeHeader(k) { delete this.headers[k.toLowerCase()]; },
    status(c) { this.statusCode = c; return this; },
    json(b) { this.body = b; this.ended = true; return this; },
    redirect(c, u) { this.statusCode = c; this.redirected = u; this.ended = true; return this; },
  };
}
export function fakeReq(o = {}) {
  return { method: 'GET', headers: {}, ip: '10.0.0.1', originalUrl: '/', ...o };
}
/** Ejecuta un middleware y dice si llamo a next(). */
export async function run(mw, req, res = fakeRes()) {
  let next = false;
  await mw(req, res, () => { next = true; });
  return { res, next };
}
