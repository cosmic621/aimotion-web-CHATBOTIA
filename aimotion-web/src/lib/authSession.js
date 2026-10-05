const STORAGE_KEY = 'aimotion_professional_session';

// Nota de seguridad para el documento de monografía: guardar el JWT en
// localStorage es una simplificación aceptable para un prototipo académico,
// pero es vulnerable a robo vía XSS. Un despliegue real debería usar una
// cookie httpOnly + SameSite=Strict emitida por el backend en vez de esto.

export function saveSession({ token, professional }) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ token, professional }));
}

export function getSession() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function clearSession() {
  localStorage.removeItem(STORAGE_KEY);
}

export function getToken() {
  return getSession()?.token || null;
}
