const STORAGE_KEY = 'aimotion_patient_session';

export function savePatientSession({ token, user }) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ token, user }));
}

export function getPatientSession() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function clearPatientSession() {
  localStorage.removeItem(STORAGE_KEY);
}

export function getPatientToken() {
  return getPatientSession()?.token || null;
}
