import { io } from 'socket.io-client';
import { BASE_URL } from './api';

let socket = null;

export const connectSocket = (accessToken) => {
  if (socket?.connected) return socket;

  socket = io(BASE_URL, {
    auth: { token: accessToken },
    transports: ['websocket', 'polling'],
    reconnectionDelay: 1000,
    reconnectionAttempts: 5,
  });

  socket.on('connect_error', (err) => {
    console.warn('Socket connection error:', err.message);
  });

  return socket;
};

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};

export const getSocket = () => socket;
