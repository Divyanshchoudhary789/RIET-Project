const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const rateLimit = require('express-rate-limit');
const mongoSanitize = require('express-mongo-sanitize');

const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');
const { RATE_LIMIT } = require('./config/constants');

const authRoutes = require('./modules/auth/auth.routes');
const userRoutes = require('./modules/users/user.routes');
const campusRoutes = require('./modules/campuses/campus.routes');
const departmentRoutes = require('./modules/departments/department.routes');
const requirementRoutes = require('./modules/requirements/requirement.routes');
const workProposalRoutes = require('./modules/proposals/workProposal.routes');
const assessmentRoutes = require('./modules/assessments/assessment.routes');
const notesheetRoutes = require('./modules/notesheets/notesheet.routes');
const memoRoutes = require('./modules/memos/memo.routes');
const purchaseOrderRoutes = require('./modules/purchaseOrders/purchaseOrder.routes');
const stockRoutes = require('./modules/stock/stock.routes');
const notificationRoutes = require('./modules/notifications/notification.routes');
const attachmentRoutes = require('./modules/attachments/attachment.routes');

const app = express();

// Security headers
app.use(helmet());

// Trust first proxy when behind a reverse proxy (required for rate limiting to work correctly)
app.set('trust proxy', 1);

// CORS
const allowedOrigins = process.env.CLIENT_URL
  ? process.env.CLIENT_URL.split(',').map((o) => o.trim())
  : ['http://localhost:5173'];

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error(`CORS policy does not allow access from origin: ${origin}`));
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

// Parse cookies (for refresh token httpOnly cookie)
app.use(cookieParser());

// Parse JSON body
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Sanitize NoSQL injection attempts
app.use(mongoSanitize());

// Global rate limiter (disabled when RATE_LIMIT_ENABLED=false)
if (RATE_LIMIT.ENABLED) {
  app.use(
    rateLimit({
      windowMs: RATE_LIMIT.GLOBAL_WINDOW_MS,
      max: RATE_LIMIT.GLOBAL_MAX_REQUESTS,
      standardHeaders: true,
      legacyHeaders: false,
      message: { success: false, message: 'Too many requests. Please try again later.' },
    })
  );
}

// Stricter rate limiter on auth routes (disabled when RATE_LIMIT_ENABLED=false)
const authLimiter = RATE_LIMIT.ENABLED
  ? rateLimit({
      windowMs: RATE_LIMIT.AUTH_WINDOW_MS,
      max: RATE_LIMIT.AUTH_MAX_REQUESTS,
      standardHeaders: true,
      legacyHeaders: false,
      message: { success: false, message: 'Too many authentication attempts. Please wait 15 minutes.' },
    })
  : (req, res, next) => next();

// Health check (no auth, no rate limit)
app.get('/api/health', (req, res) => {
  res.status(200).json({
    success: true,
    status: 'healthy',
    timestamp: new Date().toISOString(),
    env: process.env.NODE_ENV || 'development',
  });
});

// API routes
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/campuses', campusRoutes);
app.use('/api/departments', departmentRoutes);
app.use('/api/requirements', requirementRoutes);
app.use('/api/work-proposals', workProposalRoutes);
app.use('/api/assessments', assessmentRoutes);
app.use('/api/notesheets', notesheetRoutes);
app.use('/api/memos', memoRoutes);
app.use('/api/purchase-orders', purchaseOrderRoutes);
app.use('/api/stock', stockRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/attachments', attachmentRoutes);

// 404 and global error handling
app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
