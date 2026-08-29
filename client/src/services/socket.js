import { io } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';

let socket = null;

export function getSocket() {
  if (!socket) {
    socket = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
    });

    socket.on('connect', () => {
      console.log('⚡ Connected to KisanSetu Realtime Socket Engine:', socket.id);
    });

    socket.on('disconnect', () => {
      console.log('⚡ Disconnected from Realtime Socket Engine');
    });
  }
  return socket;
}

export function joinCentreRoom(centreId) {
  const s = getSocket();
  s.emit('join:centre', { centreId });
}

export function leaveCentreRoom(centreId) {
  const s = getSocket();
  s.emit('leave:centre', { centreId });
}
