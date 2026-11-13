// Ubicacion del navegador para el aviso al contacto de emergencia.
//
// Reglas de privacidad:
//  - Solo la da el navegador SI la persona acepta su ventana de permiso; nunca se adivina por IP.
//  - Solo se consulta en el momento de una alerta critica, y unicamente con una cuenta con sesion.
//  - Se envia al servidor solo para armar el enlace del SMS: no se guarda.
//  - En plena crisis NO se abre la ventana de permiso (retrasaria la alerta): se pide antes, al
//    registrarse o guardar el contacto (primeLocationPermission).

const hasGeolocation = () => typeof navigator !== 'undefined' && 'geolocation' in navigator;

/** 'granted' | 'denied' | 'prompt' | 'unknown' (algunos navegadores no informan el estado). */
async function permissionState() {
  try {
    const status = await navigator.permissions.query({ name: 'geolocation' });
    return status.state;
  } catch {
    return 'unknown';
  }
}

/**
 * Lee la posicion con watchPosition durante unos segundos y se queda con la lectura MAS PRECISA.
 * El primer dato que entrega un navegador suele ser aproximado (por Wi-Fi o IP) y el GPS real tarda unos
 * segundos en afinarse; por eso no basta una sola lectura. Termina antes si alcanza una precision
 * suficiente. Nunca lanza: devuelve null si no hay permiso, hay error o no llega ninguna lectura.
 * maximumAge = 0: nunca se reutiliza una posicion vieja guardada por el navegador.
 */
function readBestPosition({ timeoutMs, goodEnoughMeters = 50 }) {
  return new Promise((resolve) => {
    let best = null;
    let finished = false;
    let watchId = null;
    let timer = null;
    const finish = () => {
      if (finished) return;
      finished = true;
      clearTimeout(timer);
      if (watchId !== null) navigator.geolocation.clearWatch(watchId);
      resolve(best);
    };
    timer = setTimeout(finish, timeoutMs);
    watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const { latitude, longitude, accuracy } = pos.coords;
        if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return;
        const acc = Number.isFinite(accuracy) ? accuracy : Infinity;
        if (!best || acc < (best.accuracy ?? Infinity)) {
          best = {
            lat: Number(latitude.toFixed(6)),
            lng: Number(longitude.toFixed(6)),
            ...(Number.isFinite(accuracy) ? { accuracy: Math.round(accuracy) } : {}),
          };
        }
        if (acc <= goodEnoughMeters) finish();
      },
      () => finish(),
      { enableHighAccuracy: true, maximumAge: 0, timeout: timeoutMs }
    );
  });
}

/**
 * Ubicacion actual para adjuntar a una alerta, o null. Solo si el permiso ya fue concedido
 * (o el navegador no informa su estado). Espera como maximo ~6 s (menos si el GPS ya es preciso) para no retrasar la alerta.
 */
export async function getAlertLocation({ timeoutMs = 6000 } = {}) {
  if (!hasGeolocation()) return null;
  const state = await permissionState();
  if (state === 'denied' || state === 'prompt') return null;
  return readBestPosition({ timeoutMs });
}

/**
 * Abre la ventana de permiso del navegador (si aun no se ha decidido) para que, si llega a
 * haber una emergencia, la ubicacion ya este autorizada. Se llama tras una accion de la persona
 * (registrarse o guardar su contacto de emergencia). No bloquea ni lanza errores.
 */
export function primeLocationPermission() {
  if (!hasGeolocation()) return;
  permissionState()
    .then((state) => (state === 'granted' || state === 'denied' ? null : readBestPosition({ timeoutMs: 20_000 })))
    .catch(() => {});
}
