import { config } from '../config.js';

/**
 * Proteccion minima para el panel profesional en el prototipo.
 * En un despliegue real esto debe reemplazarse por autenticacion real
 * (login del profesional, JWT/sesion, roles) e idealmente verificacion
 * de que la cuenta pertenece a un profesional habilitado.
 */
export function requireProfessional(req, res, next) {
  const key = req.header('x-professional-key');

  if (!config.professionalKey) {
    return res.status(500).json({
      error: 'PROFESSIONAL_DASHBOARD_KEY no esta configurada en el servidor',
    });
  }

  if (key !== config.professionalKey) {
    return res.status(401).json({ error: 'Clave profesional invalida o ausente' });
  }

  next();
}
