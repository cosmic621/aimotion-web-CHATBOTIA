import jwt from 'jsonwebtoken';
import { config } from '../config.js';

const PROFESSIONAL_EXPIRES_IN = '8h'; // duracion de un turno laboral
const PATIENT_EXPIRES_IN = '30d'; // sesion mas larga, es una app de acompañamiento

export function signProfessionalToken(professional) {
  return jwt.sign(
    { sub: professional.id, email: professional.email, role: professional.role, name: professional.name, type: 'professional' },
    config.jwtSecret,
    { expiresIn: PROFESSIONAL_EXPIRES_IN }
  );
}

export function signPatientToken(user) {
  return jwt.sign(
    { sub: user.id, email: user.email, name: user.name, type: 'patient' },
    config.jwtSecret,
    { expiresIn: PATIENT_EXPIRES_IN }
  );
}

export function verifyToken(token) {
  return jwt.verify(token, config.jwtSecret); // lanza si es invalido/expirado
}
