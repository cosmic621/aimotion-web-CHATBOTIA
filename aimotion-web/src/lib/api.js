import { getToken } from './authSession';
import { getPatientToken } from './patientSession';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

export class AuthError extends Error {}

async function request(path, options = {}) {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    ...options,
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const message = body.error || `Error ${res.status}`;
    if (res.status === 401) throw new AuthError(message);
    throw new Error(message);
  }
  return res.json();
}

function professionalAuthHeaders() {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

function patientAuthHeaders() {
  const token = getPatientToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

// ---------------------------------------------------------------------
// Alertas y tamizajes (publico desde el chat; lectura requiere profesional)
// ---------------------------------------------------------------------

// Con sesion de paciente, el servidor sabe quien es (por el token) y puede avisar
// a su contacto de emergencia si el riesgo es critico. Sin sesion, es anonimo.
export function postAlert(payload) {
  return request('/api/alerts', { method: 'POST', headers: patientAuthHeaders(), body: JSON.stringify(payload) });
}

export function postScreening(payload) {
  return request('/api/screenings', { method: 'POST', headers: patientAuthHeaders(), body: JSON.stringify(payload) });
}

export function getAlerts() {
  return request('/api/alerts', { headers: professionalAuthHeaders() });
}

export function getScreenings() {
  return request('/api/screenings', { headers: professionalAuthHeaders() });
}

export function reviewAlert(id, reviewerNote) {
  return request(`/api/alerts/${id}/review`, {
    method: 'PATCH',
    headers: professionalAuthHeaders(),
    body: JSON.stringify({ reviewerNote }),
  });
}

export function getHealth() {
  return request('/api/health');
}

// ---------------------------------------------------------------------
// Autenticacion de profesional
// ---------------------------------------------------------------------

export function login(email, password) {
  return request('/api/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) });
}

// ---------------------------------------------------------------------
// Cuentas de paciente (opcional, registro publico)
// ---------------------------------------------------------------------

export function registerPatient(data) {
  // data: { name, email, password, contactName, contactPhone, contactRelation, contactConsent }
  return request('/api/patient-auth/register', { method: 'POST', body: JSON.stringify(data) });
}

/** Agregar/cambiar el contacto de emergencia de la cuenta (requiere consentimiento). */
export function updateEmergencyContact(data) {
  return request('/api/patient-auth/contact', {
    method: 'PATCH',
    headers: patientAuthHeaders(),
    body: JSON.stringify(data),
  });
}

export function loginPatient(email, password) {
  return request('/api/patient-auth/login', { method: 'POST', body: JSON.stringify({ email, password }) });
}

// ---------------------------------------------------------------------
// Chat: persistencia y trazabilidad
// ---------------------------------------------------------------------

/** Registra un turno del chat. Si hay sesion de paciente, queda asociado a la cuenta. */
export function postChatMessage({ sessionId, role, content, topic }) {
  return request('/api/chat/messages', {
    method: 'POST',
    headers: patientAuthHeaders(),
    body: JSON.stringify({ sessionId, role, content, topic }),
  });
}

/** Historial: si hay cuenta de paciente, trae todo; si no, trae solo el de esta sesion anonima. */
export function getChatHistory(sessionId) {
  return request(`/api/chat/messages?sessionId=${encodeURIComponent(sessionId)}`, {
    headers: patientAuthHeaders(),
  });
}

/** Panel profesional: usuarios con actividad de chat, para trazabilidad. */
export function getChatUsers() {
  return request('/api/chat/users', { headers: professionalAuthHeaders() });
}

export function getUserChatHistory(userId) {
  return request(`/api/chat/users/${userId}/messages`, { headers: professionalAuthHeaders() });
}

// ---------------------------------------------------------------------
// Planes de tratamiento semanales (SIEMPRE creados por un profesional)
// ---------------------------------------------------------------------

export function createTreatmentPlan({ userId, condition, title, weeks }) {
  return request('/api/treatment-plans', {
    method: 'POST',
    headers: professionalAuthHeaders(),
    body: JSON.stringify({ userId, condition, title, weeks }),
  });
}

/** El paciente ve sus propios planes. */
export function getMyTreatmentPlans() {
  return request('/api/treatment-plans/mine', { headers: patientAuthHeaders() });
}

/** El profesional ve los planes de un paciente especifico. */
export function getUserTreatmentPlans(userId) {
  return request(`/api/treatment-plans/user/${userId}`, { headers: professionalAuthHeaders() });
}

/** El paciente marca una semana como completada/pendiente. */
export function updateTreatmentPlanProgress(planId, weekNumber, completed) {
  return request(`/api/treatment-plans/${planId}/progress`, {
    method: 'PATCH',
    headers: patientAuthHeaders(),
    body: JSON.stringify({ weekNumber, completed }),
  });
}
