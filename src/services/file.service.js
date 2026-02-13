// Faz 2 — File Service (MinIO upload/download)
const fs = require('fs');
const path = require('path');
const { getMinio } = require('../config/minio');
const { getModels } = require('../models');
const logger = require('../utils/logger');

const BUCKET = process.env.MINIO_BUCKET || 'typesettr-files';

async function uploadFile(projectId, filePath, type, originalName, mimeType) {
  const minio = getMinio();
  const { File } = getModels();

  const fileSize = fs.statSync(filePath).size;
  const ext = path.extname(originalName);
  const storagePath = `projects/${projectId}/${type}/${Date.now()}${ext}`;

  await minio.fPutObject(BUCKET, storagePath, filePath, {
    'Content-Type': mimeType,
    'X-Project-Id': projectId
  });

  const file = await File.create({
    project_id: projectId,
    type,
    filename: originalName,
    storage_path: storagePath,
    file_size: fileSize,
    mime_type: mimeType
  });

  // Clean up temp file
  fs.unlink(filePath, () => {});

  logger.info(`File uploaded: ${file.id} (${storagePath}, ${fileSize} bytes)`);;
  return file.toJSON();
}

async function getDownloadUrl(fileId, userId) {
  const { File, Project } = getModels();
  const file = await File.findByPk(fileId, {
    include: [{ model: Project, as: 'project', attributes: ['user_id'] }]
  });

  if (!file || file.project.user_id !== userId) {
    const error = new Error('File not found');
    error.status = 404;
    throw error;
  }

  const minio = getMinio();
  const url = await minio.presignedGetObject(BUCKET, file.storage_path, 24 * 60 * 60); // 24h
  return { url, filename: file.filename, mimeType: file.mime_type, fileSize: file.file_size };
}

async function getFileBuffer(storagePath) {
  const minio = getMinio();
  return new Promise((resolve, reject) => {
    const chunks = [];
    minio.getObject(BUCKET, storagePath, (err, stream) => {
      if (err) return reject(err);
      stream.on('data', chunk => chunks.push(chunk));
      stream.on('end', () => resolve(Buffer.concat(chunks)));
      stream.on('error', reject);
    });
  });
}

async function downloadToTemp(storagePath, destPath) {
  const minio = getMinio();
  await minio.fGetObject(BUCKET, storagePath, destPath);
  return destPath;
}

async function uploadBuffer(projectId, buffer, storagePath, mimeType) {
  const minio = getMinio();
  await minio.putObject(BUCKET, storagePath, buffer, buffer.length, {
    'Content-Type': mimeType,
    'X-Project-Id': projectId
  });
  logger.info(`Buffer uploaded: ${storagePath} (${buffer.length} bytes)`);;
  return storagePath;
}

async function getProjectFiles(projectId, userId) {
  const { File, Project } = getModels();
  const project = await Project.findOne({ where: { id: projectId, user_id: userId } });
  if (!project) {
    const error = new Error('Project not found');
    error.status = 404;
    throw error;
  }
  const files = await File.findAll({
    where: { project_id: projectId },
    order: [['created_at', 'DESC']]
  });
  return files.map(f => f.toJSON());
}

module.exports = { uploadFile, getDownloadUrl, getFileBuffer, downloadToTemp, uploadBuffer, getProjectFiles };
