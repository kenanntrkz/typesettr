const { Worker } = require('bullmq');
const { getRedis } = require('../../config/redis');
const { getMinio } = require('../../config/minio');
const logger = require('../../utils/logger');
const fs = require('fs').promises;

let cleanupWorker;

function startCleanupWorker() {
  cleanupWorker = new Worker('cleanup-queue', async (job) => {
    const { projectId, paths, minioKeys } = job.data;
    logger.info(`[Cleanup] Starting job ${job.id} for project ${projectId}`);
    if (paths && paths.length > 0) {
      for (const p of paths) {
        try { await fs.rm(p, { recursive: true, force: true }); } catch (e) { logger.warn(`Cleanup failed: ${p}`); }
      }
    }
    if (minioKeys && minioKeys.length > 0) {
      const minio = getMinio();
      const bucket = process.env.MINIO_BUCKET || 'typesettr-files';
      for (const key of minioKeys) {
        try { await minio.removeObject(bucket, key); } catch (e) { logger.warn(`MinIO cleanup failed: ${key}`); }
      }
    }
    await job.updateProgress(100);
    return { success: true, projectId };
  }, { connection: getRedis(), concurrency: 3 });

  cleanupWorker.on('error', (err) => logger.error(`Cleanup worker error: ${err.message}`));
  logger.info('Cleanup worker started');
  return cleanupWorker;
}

function stopCleanupWorker() { if (cleanupWorker) return cleanupWorker.close(); }

module.exports = { startCleanupWorker, stopCleanupWorker };
