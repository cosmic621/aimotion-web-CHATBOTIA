// Sesion de PACIENTE en el navegador: solo el perfil visible (no secreto).
// El token de sesion vive en una cookie HttpOnly.
const KEY = 'aimotion_patient_profile';
try { localStorage.removeItem('aimotion_patient_session'); } catch { /* sin acceso a storage */ }

export function savePatientSession({ user }) {
  localStorage.setItem(KEY, JSON.stringify({ user }));
}

export function getPatientSession() {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function clearPatientSession() {
  localStorage.removeItem(KEY);
}
