const { Router } = require('express');
const fileService = require('../services/file.service');
const { authenticate } = require('../middleware/auth');
const { upload, validateDocxMagicBytes } = require('../middleware/fileValidator');
const { uploadLimiter } = require('../middleware/rateLimiter');
const { getModels } = require('../models');
const multer = require('multer');
const fs = require('fs');
const router = Router();

function handleMulterUpload(req, res, next) {
  const uploadSingle = upload.single('file');
  uploadSingle(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ success: false, error: 'File too large. Maximum 50MB allowed.' });
      }
      return res.status(400).json({ success: false, error: 'Upload error: ' + err.message });
    }
    if (err) {
      return res.status(400).json({ success: false, error: err.message });
    }
    next();
  });
}

router.post('/upload',
  authenticate,
  uploadLimiter,
  handleMulterUpload,
  async (req, res, next) => {
    try {
      if (!req.file) {
        return res.status(400).json({ success: false, error: 'No file uploaded' });
      }
      if (!validateDocxMagicBytes(req.file.path)) {
        fs.unlinkSync(req.file.path);
        return res.status(400).json({ success: false, error: 'Invalid file: not a valid DOCX' });
      }
      const { projectId } = req.body;
      if (projectId) {
        const { Project } = getModels();
        const project = await Project.findOne({ where: { id: projectId, user_id: req.user.id } });
        if (!project) {
          fs.unlinkSync(req.file.path);
          return res.status(404).json({ success: false, error: 'Project not found' });
        }
      }
      const file = await fileService.uploadFile(
        projectId || null,
        req.file.path,
        'source_docx',
        req.file.originalname,
        req.file.mimetype
      );
      if (projectId) {
        const { Project } = getModels();
        const project = await Project.findOne({ where: { id: projectId } });
        if (project) {
          project.source_file_url = file.storage_path;
          await project.save();
        }
      }
      res.status(201).json({
        success: true,
        file: { id: file.id, filename: file.filename, file_size: file.file_size, storage_path: file.storage_path }
      });
    } catch (error) { next(error); }
  }
);

router.get('/:id/download', authenticate, async (req, res, next) => {
  try {
    const result = await fileService.getDownloadUrl(req.params.id, req.user.id);
    res.json({ success: true, ...result });
  } catch (error) { next(error); }
});

module.exports = router;
