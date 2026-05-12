// Minimal env vars required for modules that validate at import time
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret-long-enough-for-hs256-algorithm';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-different-from-access-secret';
process.env.JWT_ACCESS_EXPIRES_IN = '15m';
process.env.JWT_REFRESH_EXPIRES_IN = '7d';
process.env.MONGODB_URI = 'mongodb://localhost:27017/commute_test';
process.env.SUPABASE_URL = 'https://placeholder.supabase.co';
process.env.SUPABASE_SERVICE_KEY = 'placeholder-service-key';
process.env.SUPABASE_CDN_URL = 'https://placeholder.supabase.co/storage/v1/object/public/posts';
process.env.SUPABASE_STORAGE_BUCKET = 'posts';
process.env.CORS_ORIGINS = 'http://localhost:3000';
