const { Queue } = require('bullmq');
const { getRedis } = require('../config/redis');
const logger = require('../utils/logger');

let cleanupQueue;

function getCleanupQueue() {
  if (!cleanupQueue) {
    cleanupQueue = new Queue('cleanup-queue', {
      connection: getRedis(),
      defaultJobOptions: { attempts: 1, removeOnComplete: { age: 3600, count: 50 }, removeOnFail: { age: 86400 }, timeout: 60000 }
    });
    cleanupQueue.on('error', (err) => logger.error(`Cleanup queue error: ${err.message}`));
    logger.info('Cleanup queue initialized');
  }
  return cleanupQueue;
}

async function addCleanupJob(jobData) {
  const queue = getCleanupQueue();
  const job = await queue.add('cleanup', jobData, { delay: 3600000 });
  logger.info(`Cleanup job scheduled: ${job.id}`);
  return job;
}

module.exports = { getCleanupQueue, addCleanupJob };
