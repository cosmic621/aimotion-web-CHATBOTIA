import jwt from 'jsonwebtoken';
import { config } from '../config.js';

const EXPIRES_IN = '8h'; // duracion de un turno laboral; se debe volver a iniciar sesion despues

export function signToken(professional) {
  return jwt.sign(
    { sub: professional.id, email: professional.email, role: professional.role, name: professional.name },
    config.jwtSecret,
    { expiresIn: EXPIRES_IN }
  );
}

export function verifyToken(token) {
  return jwt.verify(token, config.jwtSecret); // lanza si es invalido/expirado
}
