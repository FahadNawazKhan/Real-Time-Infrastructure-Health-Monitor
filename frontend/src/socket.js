import { io } from 'socket.io-client';

// Connect to backend Socket.IO server.
// In dev Vite proxies /api to port 5000, and socket.io connects directly to port 5000 or current origin.
const SOCKET_URL = window.location.port === '3000' ? 'http://localhost:5000' : '/';

export const socket = io(SOCKET_URL, {
  autoConnect: true,
  reconnection: true,
  reconnectionAttempts: Infinity,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 5000,
  timeout: 20000,
});
