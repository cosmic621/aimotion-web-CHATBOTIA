// Cliente HTTP de la API. Seguridad (items 9 y 15):
//  - La sesion viaja en cookies HttpOnly: este codigo NUNCA ve ni guarda tokens
//    (un XSS no puede robarlos). Por eso todas las peticiones usan credentials: 'include'.
//  - Las peticiones que modifican datos envian el token CSRF en X-CSRF-Token.
//    Se obtiene al iniciar sesion y, tras recargar la pagina, de GET /api/auth/csrf.
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

export class AuthError extends Error {}

let csrfToken = null;

export function setCsrfToken(token) {
  csrfToken = token || null;
}

async function fetchCsrfToken() {
  const res = await fetch(`${API_BASE_URL}/api/auth/csrf`, { credentials: 'include' });
  const data = await res.json();
  csrfToken = data.csrfToken || null;
  return csrfToken;
}

async function request(path, options = {}, retried = false) {
  const method = (options.method || 'GET').toUpperCase();
  const modifies = method !== 'GET' && method !== 'HEAD';
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };

  if (modifies) {
    if (!csrfToken) await fetchCsrfToken().catch(() => {});
    if (csrfToken) headers['X-CSRF-Token'] = csrfToken;
  }

  const res = await fetch(`${API_BASE_URL}${path}`, { ...options, method, headers, credentials: 'include' });

  // Token CSRF vencido (p. ej. cambio de sesion): se renueva y se reintenta una vez.
  if (res.status === 403 && modifies && !retried) {
    const body = await res.clone().json().catch(() => ({}));
    if (/CSRF/i.test(body.error || '')) {
      await fetchCsrfToken().catch(() => {});
      return request(path, options, true);
    }
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const message = body.error || `Error ${res.status}`;
    if (res.status === 401) throw new AuthError(message);
    throw new Error(message);
  }
  return res.json();
}

// ---------------------------------------------------------------------
// Alertas y tamizajes (anonimos o con cuenta; la lectura es solo del profesional)
// ---------------------------------------------------------------------
export const postAlert = (payload) => request('/api/alerts', { method: 'POST', body: JSON.stringify(payload) });
export const postScreening = (payload) => request('/api/screenings', { method: 'POST', body: JSON.stringify(payload) });
export const getAlerts = () => request('/api/alerts');
export const getScreenings = () => request('/api/screenings');
export const reviewAlert = (id, reviewerNote) =>
  request(`/api/alerts/${encodeURIComponent(id)}/review`, { method: 'PATCH', body: JSON.stringify({ reviewerNote: reviewerNote || null }) });
export const getHealth = () => request('/api/health');

// ---------------------------------------------------------------------
// Profesional
// botData = { website, formStartedAt }: defensas anti-bot (campo trampa + tiempo de llenado)
// ---------------------------------------------------------------------
export async function login(email, password, botData = {}) {
  const result = await request('/api/auth/login', { method: 'POST', body: JSON.stringify({ email, password, ...botData }) });
  setCsrfToken(result.csrfToken);
  return result;
}

export async function logout() {
  await request('/api/auth/logout', { method: 'POST' }).catch(() => {});
  setCsrfToken(null);
}

// ---------------------------------------------------------------------
// Paciente (cuenta opcional)
// ---------------------------------------------------------------------
export async function registerPatient(data) {
  const result = await request('/api/patient-auth/register', { method: 'POST', body: JSON.stringify(data) });
  setCsrfToken(result.csrfToken);
  return result;
}

export async function loginPatient(email, password, botData = {}) {
  const result = await request('/api/patient-auth/login', { method: 'POST', body: JSON.stringify({ email, password, ...botData }) });
  setCsrfToken(result.csrfToken);
  return result;
}

export async function logoutPatient() {
  await request('/api/patient-auth/logout', { method: 'POST' }).catch(() => {});
  setCsrfToken(null);
}

export const updateEmergencyContact = (data) => request('/api/patient-auth/contact', { method: 'PATCH', body: JSON.stringify(data) });

// ---------------------------------------------------------------------
// Chat: persistencia y trazabilidad
// ---------------------------------------------------------------------
export const postChatMessage = ({ sessionId, role, content, topic }) =>
  request('/api/chat/messages', { method: 'POST', body: JSON.stringify({ sessionId, role, content, topic: topic || null }) });
export const getChatHistory = (sessionId) => request(`/api/chat/messages?sessionId=${encodeURIComponent(sessionId)}`);
export const getChatUsers = () => request('/api/chat/users');
export const getUserChatHistory = (userId) => request(`/api/chat/users/${encodeURIComponent(userId)}/messages`);

// ---------------------------------------------------------------------
// Planes de tratamiento semanales (siempre creados por un profesional)
// ---------------------------------------------------------------------
export const createTreatmentPlan = ({ userId, condition, title, weeks }) =>
  request('/api/treatment-plans', { method: 'POST', body: JSON.stringify({ userId, condition, title, weeks }) });
export const getMyTreatmentPlans = () => request('/api/treatment-plans/mine');
export const getUserTreatmentPlans = (userId) => request(`/api/treatment-plans/user/${encodeURIComponent(userId)}`);
export const updateTreatmentPlanProgress = (planId, weekNumber, completed) =>
  request(`/api/treatment-plans/${encodeURIComponent(planId)}/progress`, { method: 'PATCH', body: JSON.stringify({ weekNumber, completed }) });
