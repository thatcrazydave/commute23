require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const connectDB = require('./config/db');
const { initFirebaseAdmin } = require('./config/firebaseAdmin');
const { authLimiter, generalLimiter, passwordResetLimiter } = require('./middleware/rateLimiter');
const Logger = require('./utils/logger');

const authRoutes = require('./routes/auth');
const postsRoutes = require('./routes/posts');
const connectionsRoutes = require('./routes/connections');
const eventsRoutes = require('./routes/events');
const notificationsRoutes = require('./routes/notifications');
const uploadRoutes = require('./routes/upload');
const usersRoutes = require('./routes/users');

const app = express();

// Trust proxy when behind one (so req.ip works)
app.set('trust proxy', 1);

// Security
app.use(helmet());

// CORS
const corsOrigins = (process.env.CORS_ORIGINS || 'http://localhost:3000')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

app.use(
  cors({
    origin: (origin, cb) => {
      if (!origin) return cb(null, true);
      if (corsOrigins.includes(origin)) return cb(null, true);
      return cb(new Error('CORS blocked: ' + origin));
    },
    credentials: true,
  })
);

app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// Health
app.get('/api/health', (req, res) => {
  res.json({ success: true, status: 'ok', timestamp: new Date().toISOString() });
});

// Auth routes — strict limiter
app.use('/api/auth/forgot-password', passwordResetLimiter);
app.use('/api/auth/reset-password', passwordResetLimiter);
app.use('/api/auth', authLimiter, authRoutes);

// App routes — general limiter
app.use('/api/posts', generalLimiter, postsRoutes);
app.use('/api/connections', generalLimiter, connectionsRoutes);
app.use('/api/events', generalLimiter, eventsRoutes);
app.use('/api/notifications', generalLimiter, notificationsRoutes);
app.use('/api/upload', generalLimiter, uploadRoutes);
app.use('/api/users', generalLimiter, usersRoutes);

// 404
app.use((req, res) => {
  res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Route not found' } });
});

// Error handler
app.use((err, req, res, _next) => {
  Logger.error('Unhandled error', { error: err.message, stack: err.stack });
  res.status(500).json({
    success: false,
    error: { code: 'SERVER_ERROR', message: 'Internal server error' },
  });
});

const PORT = process.env.PORT || 5001;

const start = async () => {
  await connectDB();
  initFirebaseAdmin();
  app.listen(PORT, () => {
    Logger.info(`Server running on port ${PORT}`, {
      env: process.env.NODE_ENV || 'development',
      cors: corsOrigins,
    });
  });
};

start().catch((err) => {
  Logger.error('Failed to start server', { error: err.message });
  process.exit(1);
});
