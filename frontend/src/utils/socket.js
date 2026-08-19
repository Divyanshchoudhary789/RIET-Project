import { io } from 'socket.io-client';
import { BASE_URL } from './api';

// Use a dedicated socket URL env var if provided, otherwise fall back to the API base URL
const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || BASE_URL;

let socket = null;

/**
 * Connect (or reconnect) the socket with the given access token.
 * If a socket already exists with the same token it is reused.
 * If the token changed (re-login) the old socket is torn down first.
 */
export const connectSocket = (accessToken) => {
  // Already connected with the same credentials — nothing to do
  if (socket?.connected && socket._authToken === accessToken) return socket;

  // Stale socket — tear it down cleanly before creating a new one
  if (socket) {
    socket.disconnect();
    socket = null;
  }

  socket = io(SOCKET_URL, {
    auth: { token: accessToken },
    transports: ['websocket', 'polling'],
    reconnectionDelay: 1000,
    reconnectionAttempts: 10,
    // Re-send auth on each reconnect attempt so the server middleware
    // can re-validate the token after network interruptions
    reconnection: true,
  });

  // Tag so we can detect token changes on the next connectSocket call
  socket._authToken = accessToken;

  socket.on('connect_error', (err) => {
    console.warn('[Socket] connection error:', err.message);
  });

  socket.on('reconnect', (attempt) => {
    console.info(`[Socket] reconnected after ${attempt} attempt(s)`);
  });

  return socket;
};

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};

/** Returns the current socket instance (may be null before login) */
export const getSocket = () => socket;
