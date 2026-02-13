const express = require('express');
const router = express.Router();
const { getTemplates, getTemplateById } = require('../services/cover.service');

router.get('/templates', (req, res) => {
  res.json({ success: true, data: getTemplates() });
});

router.get('/templates/:id', (req, res) => {
  const t = getTemplateById(req.params.id);
  if (!t) return res.status(404).json({ success: false, error: 'Template not found' });
  res.json({ success: true, data: t });
});

module.exports = router;
