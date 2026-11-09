// Sesion de PACIENTE en el navegador: solo el perfil visible (no secreto), incluido el perfil
// (USUARIO o FUNCIONARIO). El token de sesion vive en una cookie HttpOnly.
// Nota: el perfil guardado aqui solo sirve para MOSTRAR u ocultar pantallas; quien manda siempre
// es el servidor, que vuelve a comprobar el perfil en cada peticion.
import { useEffect, useState } from 'react';

const KEY = 'aimotion_patient_profile';
const EVENT = 'aimotion:patient-session';
try { localStorage.removeItem('aimotion_patient_session'); } catch { /* sin acceso a storage */ }

// Avisa a los componentes que usan usePatientSession() para que se actualicen al iniciar o cerrar sesion.
function notify() {
  try { window.dispatchEvent(new Event(EVENT)); } catch { /* entorno sin window */ }
}

export function savePatientSession({ user }) {
  localStorage.setItem(KEY, JSON.stringify({ user }));
  notify();
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
  notify();
}

/** Devuelve el usuario con sesion iniciada (o null) y se actualiza solo cuando cambia. */
export function usePatientSession() {
  const [user, setUser] = useState(() => getPatientSession()?.user || null);
  useEffect(() => {
    const sync = () => setUser(getPatientSession()?.user || null);
    window.addEventListener(EVENT, sync);
    window.addEventListener('storage', sync);
    return () => {
      window.removeEventListener(EVENT, sync);
      window.removeEventListener('storage', sync);
    };
  }, []);
  return user;
}
