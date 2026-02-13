// Admin Routes — Full Admin Panel
const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { adminAuth, superAdminAuth } = require('../middleware/adminAuth');
const adminService = require('../services/admin.service');

router.use(authenticate);
router.use(adminAuth);

function getIp(req) { return req.headers['x-forwarded-for']?.split(',')[0] || req.ip; }

// ── Dashboard ───────────────────────────────────────────
router.get('/dashboard', async (req, res, next) => {
  try { res.json({ success: true, data: await adminService.getDashboardStats() }); }
  catch (err) { next(err); }
});

// ── Analytics ───────────────────────────────────────────
router.get('/stats/:period', async (req, res, next) => {
  try { res.json({ success: true, data: await adminService.getProcessingStats(req.params.period) }); }
  catch (err) { next(err); }
});

// ── Audit Logs ──────────────────────────────────────────
router.get('/audit-logs', async (req, res, next) => {
  try {
    const { page, limit, action, search } = req.query;
    res.json({ success: true, data: await adminService.getAuditLogs({ page: parseInt(page) || 1, limit: parseInt(limit) || 30, action, search }) });
  } catch (err) { next(err); }
});

// ── Users ───────────────────────────────────────────────
router.get('/users', async (req, res, next) => {
  try {
    const { page, limit, search, plan, role, sort, order } = req.query;
    res.json({ success: true, data: await adminService.listUsers({ page: parseInt(page) || 1, limit: parseInt(limit) || 20, search, plan, role, sort, order }) });
  } catch (err) { next(err); }
});

router.get('/users/:id', async (req, res, next) => {
  try { res.json({ success: true, data: await adminService.getUserDetail(req.params.id) }); }
  catch (err) { next(err); }
});

router.put('/users/:id/role', superAdminAuth, async (req, res, next) => {
  try { res.json({ success: true, data: await adminService.updateUserRole(req.params.id, req.body.role, req.user, getIp(req)) }); }
  catch (err) { next(err); }
});

router.put('/users/:id/plan', async (req, res, next) => {
  try { res.json({ success: true, data: await adminService.updateUserPlan(req.params.id, req.body.plan, req.user, getIp(req)) }); }
  catch (err) { next(err); }
});

router.put('/users/:id/ban', async (req, res, next) => {
  try { res.json({ success: true, data: await adminService.toggleBanUser(req.params.id, req.body.banned, req.user, getIp(req)) }); }
  catch (err) { next(err); }
});

// ── Projects ────────────────────────────────────────────
router.get('/projects', async (req, res, next) => {
  try {
    const { page, limit, status, search, sort, order } = req.query;
    res.json({ success: true, data: await adminService.listAllProjects({ page: parseInt(page) || 1, limit: parseInt(limit) || 20, status, search, sort, order }) });
  } catch (err) { next(err); }
});

router.get('/projects/:id', async (req, res, next) => {
  try { res.json({ success: true, data: await adminService.getProjectDetail(req.params.id) }); }
  catch (err) { next(err); }
});

router.delete('/projects/:id', async (req, res, next) => {
  try { res.json({ success: true, data: await adminService.deleteProject(req.params.id, req.user, getIp(req)) }); }
  catch (err) { next(err); }
});

// ── Queue ───────────────────────────────────────────────
router.get('/queue/stats', async (req, res, next) => {
  try { res.json({ success: true, data: await adminService.getQueueStats() }); }
  catch (err) { next(err); }
});

router.get('/queue/jobs', async (req, res, next) => {
  try {
    const { status, page, limit } = req.query;
    res.json({ success: true, data: await adminService.getQueueJobs(status || 'failed', parseInt(page) || 1, parseInt(limit) || 20) });
  } catch (err) { next(err); }
});

router.post('/queue/retry/:jobId', async (req, res, next) => {
  try { res.json({ success: true, data: await adminService.retryFailedJob(req.params.jobId) }); }
  catch (err) { next(err); }
});

router.post('/queue/clean', async (req, res, next) => {
  try { res.json({ success: true, data: await adminService.cleanQueue(req.body.status, req.user, getIp(req)) }); }
  catch (err) { next(err); }
});

// ── Settings ────────────────────────────────────────────
router.get('/settings', async (req, res, next) => {
  try { res.json({ success: true, data: await adminService.getAllSettings() }); }
  catch (err) { next(err); }
});

router.put('/settings', async (req, res, next) => {
  try { res.json({ success: true, data: await adminService.updateSetting(req.body.key, req.body.value, req.user, getIp(req)) }); }
  catch (err) { next(err); }
});

// ── System Health ───────────────────────────────────────
router.get('/system/health', async (req, res, next) => {
  try { res.json({ success: true, data: await adminService.getSystemHealth() }); }
  catch (err) { next(err); }
});

module.exports = router;
