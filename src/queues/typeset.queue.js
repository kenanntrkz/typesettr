// Faz 2 — Typeset Queue: BullMQ worker for typesetting pipeline
const { Queue, Worker } = require('bullmq');
const logger = require('../utils/logger');
const { processTypesettingJob } = require('./processors/typeset.processor');

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

function parseRedisUrl(url) {
  const parsed = new URL(url);
  return {
    host: parsed.hostname || 'localhost',
    port: parseInt(parsed.port) || 6379,
    password: parsed.password || undefined
  };
}

const connection = parseRedisUrl(REDIS_URL);

const typesetQueue = new Queue('typeset', {
  connection,
  defaultJobOptions: {
    attempts: 1,
    backoff: { type: 'exponential', delay: 5000 },
    removeOnComplete: { count: 100 },
    removeOnFail: { count: 50 }
  }
});

let typesetWorker = null;

function startWorker() {
  typesetWorker = new Worker('typeset', async (job) => {
    logger.info(`[Worker] Processing job ${job.id}: project ${job.data.projectId}`);
    return await processTypesettingJob(job);
  }, {
    connection,
    concurrency: parseInt(process.env.TYPESET_CONCURRENCY || '2'),
    limiter: { max: 5, duration: 60000 }
  });

  typesetWorker.on('completed', (job, result) => {
    logger.info(`[Worker] Job ${job.id} completed: project ${result?.projectId}`);
  });

  typesetWorker.on('failed', (job, error) => {
    logger.error(`[Worker] Job ${job?.id} failed: ${error.message}`);
  });

  typesetWorker.on('error', (error) => {
    logger.error(`[Worker] Worker error: ${error.message}`);
  });

  logger.info(`[Worker] Typeset worker started (concurrency: ${process.env.TYPESET_CONCURRENCY || '2'})`);
  return typesetWorker;
}

async function addTypesetJob(projectId, userId, projectName) {
  const job = await typesetQueue.add('typeset-project', {
    projectId,
    userId,
    projectName: projectName || 'Kitap',
    createdAt: new Date().toISOString()
  }, {
    jobId: `typeset-${projectId}`,
    priority: 1
  });
  logger.info(`[Queue] Job added: ${job.id} for project ${projectId}`);
  return job;
}

async function getJobStatus(jobId) {
  const job = await typesetQueue.getJob(jobId);
  if (!job) return null;
  const state = await job.getState();
  return {
    id: job.id,
    state,
    progress: job.progress,
    data: job.data,
    failedReason: job.failedReason,
    timestamp: job.timestamp,
    finishedOn: job.finishedOn
  };
}

async function shutdown() {
  logger.info('[Queue] Shutting down...');
  if (typesetWorker) await typesetWorker.close();
  await typesetQueue.close();
  logger.info('[Queue] Shutdown complete');
}

module.exports = { typesetQueue, startWorker, addTypesetJob, getJobStatus, shutdown };
