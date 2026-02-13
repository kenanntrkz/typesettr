// Faz 2 — Typeset Routes: start pipeline, check status
const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { addTypesetJob, getJobStatus } = require('../queues/typeset.queue');
const { getModels } = require('../models');
const logger = require('../utils/logger');

/**
 * POST /api/typeset/start
 * Start typesetting pipeline for a project
 */
router.post('/start', authenticate, async (req, res, next) => {
  try {
    const { Project, File } = getModels();
    const { projectId } = req.body;
    const userId = req.user.id;

    if (!projectId) {
      return res.status(400).json({ error: 'projectId gerekli' });
    }

    const project = await Project.findOne({
      where: { id: projectId, user_id: userId }
    });
    if (!project) {
      return res.status(404).json({ error: 'Proje bulunamadı' });
    }

    if (project.status === 'processing') {
      return res.status(409).json({
        error: 'Bu proje zaten işleniyor',
        currentStep: project.current_step,
        progress: project.progress
      });
    }

    const sourceFile = await File.findOne({
      where: { project_id: projectId, type: 'source_docx' }
    });
    if (!sourceFile) {
      return res.status(400).json({
        error: 'Kaynak DOCX dosyası bulunamadı. Önce dosya yükleyin.'
      });
    }

    await Project.update({
      status: 'processing',
      current_step: 'queued',
      progress: 0,
      error_message: null,
      output_pdf_url: null,
      output_latex_url: null,
      page_count: null,
      file_size: null,
      processing_time_ms: null
    }, { where: { id: projectId } });

    const job = await addTypesetJob(projectId, userId);
    logger.info(`Typesetting started: project ${projectId}, job ${job.id}`);

    res.status(202).json({
      success: true,
      message: 'Dizgi işlemi başlatıldı',
      jobId: job.id,
      projectId
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/typeset/:jobId/status
 */
router.get('/:jobId/status', authenticate, async (req, res, next) => {
  try {
    const { jobId } = req.params;
    const status = await getJobStatus(jobId);
    if (!status) {
      return res.status(404).json({ error: 'İş bulunamadı' });
    }
    res.json(status);
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/typeset/retry/:projectId
 */
router.post('/retry/:projectId', authenticate, async (req, res, next) => {
  try {
    const { Project } = getModels();
    const { projectId } = req.params;
    const userId = req.user.id;

    const project = await Project.findOne({
      where: { id: projectId, user_id: userId }
    });
    if (!project) {
      return res.status(404).json({ error: 'Proje bulunamadı' });
    }
    if (project.status !== 'failed') {
      return res.status(400).json({ error: 'Sadece başarısız projeler tekrar denenebilir' });
    }

    await Project.update({
      status: 'processing',
      current_step: 'queued',
      progress: 0,
      error_message: null
    }, { where: { id: projectId } });

    const job = await addTypesetJob(projectId, userId, project.name);
    res.status(202).json({
      success: true,
      message: 'Dizgi tekrar başlatıldı',
      jobId: job.id,
      projectId
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
