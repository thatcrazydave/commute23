import API from '../services/api';

const clientLogger = {
  error: (message, meta = {}) => {
    if (process.env.NODE_ENV !== 'production') {
      console.error('[clientLogger]', message, meta);
    }
    API.post('/logs/client', {
      level: 'error',
      message: String(message).slice(0, 256),
      meta,
      ts: new Date().toISOString(),
    }).catch(() => {}); // fire-and-forget — never throws
  },

  warn: (message, meta = {}) => {
    if (process.env.NODE_ENV !== 'production') {
      console.warn('[clientLogger]', message, meta);
    }
    API.post('/logs/client', {
      level: 'warn',
      message: String(message).slice(0, 256),
      meta,
      ts: new Date().toISOString(),
    }).catch(() => {});
  },
};

export default clientLogger;
