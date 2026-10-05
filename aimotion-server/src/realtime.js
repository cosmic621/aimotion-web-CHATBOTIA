let ioInstance = null;

export function setIo(io) {
  ioInstance = io;
}

/** Emite un evento a todos los profesionales conectados en tiempo real. */
export function emitToProfessionals(event, payload) {
  if (!ioInstance) return;
  ioInstance.to('professionals').emit(event, payload);
}
