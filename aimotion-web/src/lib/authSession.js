// Sesion de PROFESIONAL en el navegador. Guarda solo el perfil visible (nombre,
// rol...), que no es secreto. El token de sesion vive en una cookie HttpOnly que
// JavaScript no puede leer: un XSS ya no puede robar la sesion.
const KEY = 'aimotion_professional_profile';
// Versiones anteriores guardaban el token aqui: se elimina por higiene.
try { localStorage.removeItem('aimotion_professional_session'); } catch { /* sin acceso a storage */ }

export function saveSession({ professional }) {
  localStorage.setItem(KEY, JSON.stringify({ professional }));
}

export function getSession() {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function clearSession() {
  localStorage.removeItem(KEY);
}
