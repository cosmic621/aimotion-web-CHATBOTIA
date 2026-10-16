// Limitadores de la API (items 11, 12, 17). Valores conservadores para un
// prototipo; ajustar segun el trafico real.
import { createRateLimiter } from './rateLimit.js';

export function createLimiters({ now } = {}) {
  const mk = (name, windowMs, max, message) => createRateLimiter({ name, windowMs, max, message, now });
  return {
    global: mk('global', 60_000, 300, 'Demasiadas solicitudes. Espera un momento.'),
    login: mk('login-ip', 15 * 60_000, 30, 'Demasiados intentos de inicio de sesión desde esta red. Intenta más tarde.'),
    register: mk('register', 60 * 60_000, 5, 'Demasiados registros desde esta red. Intenta más tarde.'),
    // Ruta critica para la seguridad: limite holgado (un campus o una red compartida no debe poder silenciarla facilmente).
    alerts: mk('alerts', 10 * 60_000, 60, 'Demasiadas alertas enviadas. Si es una emergencia, llama al 123.'),
    screenings: mk('screenings', 10 * 60_000, 20),
    chat: mk('chat', 10 * 60_000, 120),
  };
}
