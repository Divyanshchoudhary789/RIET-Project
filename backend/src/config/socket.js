const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const User = require('../modules/users/user.model');
const { setSocketIO } = require('../modules/notifications/notification.service');

/**
 * Initializes Socket.io on the HTTP server.
 * Authenticates connections using the JWT access token.
 * Each authenticated user joins a personal room: `user:<userId>`
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
  });

  io.use(async (socket, next) => {
    const token = socket.handshake.auth?.token || socket.handshake.headers?.authorization?.split(' ')[1];

    if (!token) {
      return next(new Error('Authentication required.'));
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);

      // Verify user is still active — prevents deactivated accounts from holding live sockets
      const user = await User.findById(decoded.id).select('isActive');
      if (!user || !user.isActive) {
        return next(new Error('Account is inactive or does not exist.'));
      }

      socket.userId = decoded.id;
      next();
    } catch {
      next(new Error('Invalid or expired token.'));
    }
  });

  io.on('connection', (socket) => {
    const roomName = `user:${socket.userId}`;
    socket.join(roomName);

    socket.on('disconnect', () => {
      // Room cleanup is automatic
    });
  });

  setSocketIO(io);

  console.log('Socket.io initialized.');

  return io;
};

module.exports = { initializeSocket };
