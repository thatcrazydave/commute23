const { Redis } = require('ioredis');
const Logger = require('../utils/logger');

let redisClient = null;
let redisReady = false;

async function createRedisClient() {
  const client = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
    maxRetriesPerRequest: null, // required by BullMQ
    enableReadyCheck: false,
    lazyConnect: true,
  });

  client.on('error', (err) =>
    Logger.error('Redis connection error', { error: err.message })
  );

  try {
    await client.ping();
    Logger.info('Redis connected');
    redisReady = true;
    redisClient = client;
  } catch (err) {
    Logger.warn('Redis unreachable — background jobs disabled. Start redis-server to enable.', {
      error: err.message,
    });
  }

  return client;
}

module.exports = {
  getClient: () => redisClient,
  isReady: () => redisReady,
  createRedisClient,
};
