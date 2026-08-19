const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const User = require('../modules/users/user.model');
const { setSocketIO } = require('../modules/notifications/notification.service');

/**
 * Initializes Socket.io on the HTTP server.
 *
 * Each authenticated connection joins TWO rooms:
 *   - `user:<userId>`   — personal room for direct notifications
 *   - `role:<userRole>` — role room for dashboard:refresh broadcast events
 */
const initializeSocket = (httpServer) => {
  const allowedOrigins = process.env.CLIENT_URL
    ? process.env.CLIENT_URL.split(',').map((o) => o.trim())
    : ['http://localhost:5173'];

  const io = new Server(httpServer, {
    cors: {
      origin: allowedOrigins,
      methods: ['GET', 'POST'],
      credentials: true,
    },
    connectionStateRecovery: {
      maxDisconnectionDuration: 2 * 60 * 1000,
    },
    // Ping every 25 s, drop after 60 s — keeps connections alive through load balancers
    pingInterval: 25000,
    pingTimeout: 60000,
  });

  // ── Auth middleware ────────────────────────────────────────────────────────
  io.use(async (socket, next) => {
    const token =
      socket.handshake.auth?.token ||
      socket.handshake.headers?.authorization?.split(' ')[1];

    if (!token) return next(new Error('Authentication required.'));

    try {
      const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);

      const user = await User.findById(decoded.id).select('isActive role');
      if (!user || !user.isActive) {
        return next(new Error('Account is inactive or does not exist.'));
      }

      socket.userId = decoded.id.toString();
      socket.userRole = user.role;
      next();
    } catch {
      next(new Error('Invalid or expired token.'));
    }
  });

  // ── Connection handler ─────────────────────────────────────────────────────
  io.on('connection', (socket) => {
    // Join personal room
    socket.join(`user:${socket.userId}`);
    // Join role-based room so services can broadcast to all users of a role at once
    socket.join(`role:${socket.userRole}`);

    socket.on('disconnect', () => {
      // Rooms are cleaned up automatically by Socket.io
    });
  });

  setSocketIO(io);
  console.log('Socket.io initialized.');

  return io;
};

module.exports = { initializeSocket };
