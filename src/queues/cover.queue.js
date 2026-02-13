const { Queue } = require('bullmq');
const { getRedis } = require('../config/redis');
const logger = require('../utils/logger');

let coverQueue;

function getCoverQueue() {
  if (!coverQueue) {
    coverQueue = new Queue('cover-queue', {
      connection: getRedis(),
      defaultJobOptions: { attempts: 2, backoff: { type: 'exponential', delay: 3000 }, removeOnComplete: { age: 86400, count: 50 }, removeOnFail: { age: 604800 }, timeout: 300000 }
    });
    coverQueue.on('error', (err) => logger.error(`Cover queue error: ${err.message}`));
    logger.info('Cover queue initialized');
  }
  return coverQueue;
}

async function addCoverJob(jobData) {
  const queue = getCoverQueue();
  const job = await queue.add('cover', jobData, { jobId: `cover-${jobData.projectId}` });
  logger.info(`Cover job added: ${job.id}`);
  return job;
}

module.exports = { getCoverQueue, addCoverJob };
