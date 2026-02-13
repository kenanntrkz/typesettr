const Redis = require('ioredis');
const logger = require('../utils/logger');

let redisClient;

function getRedis() {
  if (!redisClient) {
    redisClient = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
      retryStrategy(times) {
        return Math.min(times * 100, 3000);
      }
    });
    redisClient.on('error', (err) => logger.error(`Redis error: ${err.message}`));
    redisClient.on('connect', () => logger.debug('Redis connected'));
  }
  return redisClient;
}

async function initRedis() {
  const client = getRedis();
  await client.ping();
  return client;
}

module.exports = { getRedis, initRedis };
