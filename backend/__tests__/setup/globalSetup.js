const { MongoMemoryServer } = require('mongodb-memory-server');

module.exports = async () => {
  const mongod = await MongoMemoryServer.create();
  process.env.MONGO_URI_TEST = mongod.getUri();
  global.__MONGOD__ = mongod;

  // Minimal env vars required by modules that validate at import time
  process.env.JWT_SECRET = 'test-jwt-secret-that-is-long-enough-for-hs256';
  process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-different-from-access';
  process.env.JWT_ACCESS_EXPIRES_IN = '15m';
  process.env.JWT_REFRESH_EXPIRES_IN = '7d';
  process.env.MONGODB_URI = mongod.getUri();
  process.env.SUPABASE_URL = 'https://placeholder.supabase.co';
  process.env.SUPABASE_SERVICE_KEY = 'placeholder-service-key';
  process.env.SUPABASE_CDN_URL = 'https://placeholder.supabase.co/storage/v1/object/public/posts';
  process.env.SUPABASE_STORAGE_BUCKET = 'posts';
  process.env.CORS_ORIGINS = 'http://localhost:3000';
};
