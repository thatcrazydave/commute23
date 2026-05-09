require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const connectDB = require('./config/db');
const { initFirebaseAdmin } = require('./config/firebaseAdmin');
const { createRedisClient, isReady } = require('./config/redis');
const { authLimiter, generalLimiter, passwordResetLimiter } = require('./middleware/rateLimiter');
const requestLogger = require('./middleware/requestLogger');
const Logger = require('./utils/logger');

const authRoutes = require('./routes/auth');
const postsRoutes = require('./routes/posts');
const connectionsRoutes = require('./routes/connections');
const eventsRoutes = require('./routes/events');
const notificationsRoutes = require('./routes/notifications');
const uploadRoutes = require('./routes/upload');
const usersRoutes = require('./routes/users');
const logsRoutes = require('./routes/logs');
const mediaRoutes = require('./routes/media');

const app = express();

app.set('trust proxy', 1);

app.use(helmet());

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

// Log every request with timing
app.use(requestLogger);

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
app.use('/api/media', generalLimiter, mediaRoutes);

// Client-side error logging — uses its own rate limiter (defined inside the route)
app.use('/api/logs', logsRoutes);

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

  // Redis + media worker (non-blocking — app starts even if Redis is down)
  await createRedisClient();
  let mediaWorker = null;
  if (isReady()) {
    const { createMediaWorker } = require('./workers/mediaWorker');
    mediaWorker = createMediaWorker();
    Logger.info('Media processing worker started');
  }

  let archiveWorker = null;
  if (isReady()) {
    const { createArchiveWorker } = require('./workers/archiveWorker');
    archiveWorker = createArchiveWorker();
    Logger.info('Archive worker started');
  }

  // Graceful shutdown — registered unconditionally so SIGTERM always drains in-flight requests
  const shutdown = async () => {
    Logger.info('Shutting down...');
    if (mediaWorker) await mediaWorker.close();
    if (archiveWorker) await archiveWorker.close();
    process.exit(0);
  };
  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);

  app.listen(PORT, () => {
    Logger.info(`Server running on port ${PORT}`, {
      env: process.env.NODE_ENV || 'development',
      cors: corsOrigins,
      redis: isReady() ? 'connected' : 'unavailable (uploads will be synchronous)',
    });
  });
};

start().catch((err) => {
  Logger.error('Failed to start server', { error: err.message });
  process.exit(1);
});
