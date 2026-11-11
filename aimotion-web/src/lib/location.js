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

/** Pide la posicion al navegador. Nunca lanza: devuelve null si no hay permiso, hay error o se agota el tiempo. */
function readPosition({ timeoutMs, maximumAge }) {
  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve(null), timeoutMs + 1000);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        clearTimeout(timer);
        const { latitude, longitude, accuracy } = pos.coords;
        if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return resolve(null);
        return resolve({
          lat: Number(latitude.toFixed(6)),
          lng: Number(longitude.toFixed(6)),
          ...(Number.isFinite(accuracy) ? { accuracy: Math.round(accuracy) } : {}),
        });
      },
      () => {
        clearTimeout(timer);
        resolve(null);
      },
      { enableHighAccuracy: true, timeout: timeoutMs, maximumAge }
    );
  });
}

/**
 * Ubicacion actual para adjuntar a una alerta, o null. Solo si el permiso ya fue concedido
 * (o el navegador no informa su estado). Espera como maximo ~6 s para no retrasar la alerta.
 */
export async function getAlertLocation({ timeoutMs = 6000 } = {}) {
  if (!hasGeolocation()) return null;
  const state = await permissionState();
  if (state === 'denied' || state === 'prompt') return null;
  return readPosition({ timeoutMs, maximumAge: 15_000 });
}

/**
 * Abre la ventana de permiso del navegador (si aun no se ha decidido) para que, si llega a
 * haber una emergencia, la ubicacion ya este autorizada. Se llama tras una accion de la persona
 * (registrarse o guardar su contacto de emergencia). No bloquea ni lanza errores.
 */
export function primeLocationPermission() {
  if (!hasGeolocation()) return;
  permissionState()
    .then((state) => (state === 'granted' || state === 'denied' ? null : readPosition({ timeoutMs: 20_000, maximumAge: 600_000 })))
    .catch(() => {});
}
