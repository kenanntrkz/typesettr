const { Worker } = require('bullmq');
const { getRedis } = require('../../config/redis');
const logger = require('../../utils/logger');

let coverWorker;

function startCoverWorker() {
  coverWorker = new Worker('cover-queue', async (job) => {
    const { projectId } = job.data;
    logger.info(`[Cover] Starting job ${job.id} for project ${projectId}`);
    // TODO Faz 4: cover generation
    await job.updateProgress(100);
    return { success: true, projectId };
  }, { connection: getRedis(), concurrency: 2 });

  coverWorker.on('error', (err) => logger.error(`Cover worker error: ${err.message}`));
  logger.info('Cover worker started');
  return coverWorker;
}

function stopCoverWorker() { if (coverWorker) return coverWorker.close(); }

module.exports = { startCoverWorker, stopCoverWorker };
