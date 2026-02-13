const { Router } = require('express');
const projectService = require('../services/project.service');
const { authenticate } = require('../middleware/auth');
const { apiLimiter } = require('../middleware/rateLimiter');
const { getModels } = require('../models');
const { getMinio } = require('../config/minio');
const { getFileBuffer } = require('../services/file.service');
const router = Router();

const BUCKET = process.env.MINIO_BUCKET || 'typesettr-files';

router.post('/', authenticate, apiLimiter, async (req, res, next) => {
  try {
    const { name, settings, coverData, fileId } = req.body;
    if (!name) return res.status(400).json({ success: false, error: 'Project name is required' });
    const project = await projectService.createProject(req.user.id, { name, settings, coverData });
    if (fileId) {
      const { File, Project } = getModels();
      const file = await File.findOne({ where: { id: fileId } });
      if (file) {
        await File.update({ project_id: project.id }, { where: { id: fileId } });
        await Project.update({ source_file_url: file.storage_path }, { where: { id: project.id } });
        project.source_file_url = file.storage_path;
      }
    }
    res.status(201).json({ success: true, project });
  } catch (error) { next(error); }
});

router.get('/', authenticate, apiLimiter, async (req, res, next) => {
  try {
    const projects = await projectService.getProjects(req.user.id);
    res.json({ success: true, projects });
  } catch (error) { next(error); }
});

router.get('/:id', authenticate, apiLimiter, async (req, res, next) => {
  try {
    const project = await projectService.getProject(req.params.id, req.user.id);
    res.json({ success: true, project });
  } catch (error) { next(error); }
});

// Download PDF or LaTeX — streams directly from MinIO through backend
router.get('/:id/download/:type', authenticate, async (req, res, next) => {
  try {
    const { Project } = getModels();
    const project = await Project.findOne({ where: { id: req.params.id, user_id: req.user.id } });
    if (!project) return res.status(404).json({ error: 'Project not found' });

    const urlField = req.params.type === 'latex' ? 'output_latex_url' : 'output_pdf_url';
    const storagePath = project[urlField];
    if (!storagePath) return res.status(404).json({ error: 'File not available' });

    const minio = getMinio();
    const filename = decodeURIComponent(storagePath.split('/').pop());
    const mimeType = req.params.type === 'latex' ? 'application/zip' : 'application/pdf';

    res.setHeader('Content-Type', mimeType);
    res.setHeader('Content-Disposition', 'attachment; filename="' + filename + '"');

    const stream = await minio.getObject(BUCKET, storagePath);
    stream.pipe(res);
  } catch (error) { next(error); }
});

router.delete('/:id', authenticate, apiLimiter, async (req, res, next) => {
  try {
    await projectService.deleteProject(req.params.id, req.user.id);
    res.json({ success: true, message: 'Project deleted' });
  } catch (error) { next(error); }
});

module.exports = router;
