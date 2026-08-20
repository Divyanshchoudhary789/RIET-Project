const http = require('http');
const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');

// Ensure .env is loaded whether process.cwd() is root or src directory
const envPathInSrc = path.join(__dirname, '.env');
const envPathInRoot = path.join(__dirname, '../.env');

if (fs.existsSync(envPathInSrc)) {
  dotenv.config({ path: envPathInSrc });
} else if (fs.existsSync(envPathInRoot)) {
  dotenv.config({ path: envPathInRoot });
} else {
  dotenv.config();
}

const validateEnv = () => {
  const required = ['MONGO_URI', 'JWT_ACCESS_SECRET', 'JWT_REFRESH_SECRET'];
  const missing = required.filter((key) => !process.env[key]);
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
};

const startServer = async () => {
  try {
    validateEnv();

    const connectDB = require('./config/db');
    const { configureCloudinary } = require('./config/cloudinary');
    const { initializeSocket } = require('./config/socket');
    const { verifyTransporter } = require('./utils/email/emailService');
    const app = require('./app');

    await connectDB();
    configureCloudinary();
    verifyTransporter().catch(() => {});

    const httpServer = http.createServer(app);
    initializeSocket(httpServer);

    const PORT = parseInt(process.env.PORT, 10) || 5000;

    httpServer.listen(PORT, '0.0.0.0', () => {
      console.log(`Server running on port ${PORT} [${process.env.NODE_ENV || 'development'}]`);
    });

    const shutdown = (signal) => {
      console.log(`${signal} received. Shutting down gracefully...`);
      httpServer.close(() => {
        const mongoose = require('mongoose');
        mongoose.connection.close(false, () => {
          console.log('MongoDB connection closed. Server stopped.');
          process.exit(0);
        });
      });
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));

    process.on('unhandledRejection', (reason) => {
      console.error('Unhandled Promise Rejection:', reason);
    });

    process.on('uncaughtException', (err) => {
      console.error('Uncaught Exception:', err.message);
      process.exit(1);
    });
  } catch (err) {
    console.error('Server startup failed:', err.message);
    process.exit(1);
  }
};

startServer();
