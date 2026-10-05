import { getToken, clearSession } from './authSession';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

class AuthError extends Error {}

async function request(path, options = {}) {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    ...options,
  });

  if (res.status === 401 && path !== '/api/auth/login') {
    clearSession();
    const body = await res.json().catch(() => ({}));
    throw new AuthError(body.error || 'Sesión expirada, inicia sesión de nuevo');
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Error ${res.status}`);
  }
  return res.json();
}

function authHeaders() {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

/**
 * Registra una alerta de riesgo y dispara el protocolo de escalamiento
 * (email/SMS al profesional) desde el backend. No requiere sesion: lo
 * dispara el propio chat de la persona usuaria.
 */
export function postAlert(payload) {
  return request('/api/alerts', { method: 'POST', body: JSON.stringify(payload) });
}

/** Guarda el resultado de una escala (PHQ-9 / GAD-7) para revision profesional. */
export function postScreening(payload) {
  return request('/api/screenings', { method: 'POST', body: JSON.stringify(payload) });
}

/** Inicio de sesion del profesional. Devuelve { token, professional }. */
export function login(email, password) {
  return request('/api/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) });
}

/** Panel profesional: requiere sesion (JWT en localStorage via authSession). */
export function getAlerts() {
  return request('/api/alerts', { headers: authHeaders() });
}

export function getScreenings() {
  return request('/api/screenings', { headers: authHeaders() });
}

export function reviewAlert(id, reviewerNote) {
  return request(`/api/alerts/${id}/review`, {
    method: 'PATCH',
    headers: authHeaders(),
    body: JSON.stringify({ reviewerNote }),
  });
}

export function getHealth() {
  return request('/api/health');
}
