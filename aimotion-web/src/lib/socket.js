import { io } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

let socket = null;

/** Conecta el WebSocket. La autenticacion va en la cookie HttpOnly (withCredentials). Idempotente. */
export function connectSocket() {
  if (socket?.connected) return socket;
  socket = io(SOCKET_URL, { withCredentials: true, transports: ['websocket', 'polling'] });
  return socket;
}

export function disconnectSocket() {
  socket?.disconnect();
  socket = null;
}

export function getSocket() {
  return socket;
}
