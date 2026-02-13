const Minio = require('minio');
const logger = require('../utils/logger');

let minioClient;

function getMinio() {
  if (!minioClient) {
    minioClient = new Minio.Client({
      endPoint: process.env.MINIO_ENDPOINT || 'localhost',
      port: parseInt(process.env.MINIO_PORT) || 9000,
      useSSL: process.env.MINIO_USE_SSL === 'true',
      accessKey: process.env.MINIO_ACCESS_KEY || 'minioadmin',
      secretKey: process.env.MINIO_SECRET_KEY || 'minioadmin'
    });
  }
  return minioClient;
}

async function initMinio() {
  const client = getMinio();
  const bucket = process.env.MINIO_BUCKET || 'typesettr-files';
  const exists = await client.bucketExists(bucket);
  if (!exists) {
    await client.makeBucket(bucket);
    logger.info(`MinIO bucket created: ${bucket}`);
  }
  logger.debug(`MinIO bucket ready: ${bucket}`);
  return client;
}

module.exports = { getMinio, initMinio };
