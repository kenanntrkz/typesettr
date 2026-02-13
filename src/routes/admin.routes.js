// Admin Routes
const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { adminAuth, superAdminAuth } = require('../middleware/adminAuth');
const adminService = require('../services/admin.service');

// All admin routes require authentication + admin role
router.use(authenticate);
router.use(adminAuth);

// ── Dashboard ───────────────────────────────────────────
router.get('/dashboard', async (req, res, next) => {
  try {
    const stats = await adminService.getDashboardStats();
    res.json({ success: true, data: stats });
  } catch (err) { next(err); }
});

// ── Processing Stats ────────────────────────────────────
router.get('/stats/:period', async (req, res, next) => {
  try {
    const stats = await adminService.getProcessingStats(req.params.period);
    res.json({ success: true, data: stats });
  } catch (err) { next(err); }
});

// ── Users ───────────────────────────────────────────────
router.get('/users', async (req, res, next) => {
  try {
    const { page, limit, search, plan, role, sort, order } = req.query;
    const data = await adminService.listUsers({
      page: parseInt(page) || 1,
      limit: parseInt(limit) || 20,
      search, plan, role, sort, order
    });
    res.json({ success: true, data });
  } catch (err) { next(err); }
});

router.get('/users/:id', async (req, res, next) => {
  try {
    const data = await adminService.getUserDetail(req.params.id);
    res.json({ success: true, data });
  } catch (err) { next(err); }
});

router.put('/users/:id/role', superAdminAuth, async (req, res, next) => {
  try {
    const user = await adminService.updateUserRole(req.params.id, req.body.role, req.user);
    res.json({ success: true, data: user });
  } catch (err) { next(err); }
});

router.put('/users/:id/plan', async (req, res, next) => {
  try {
    const user = await adminService.updateUserPlan(req.params.id, req.body.plan);
    res.json({ success: true, data: user });
  } catch (err) { next(err); }
});

router.put('/users/:id/ban', async (req, res, next) => {
  try {
    const user = await adminService.toggleBanUser(req.params.id, req.body.banned, req.user);
    res.json({ success: true, data: user });
  } catch (err) { next(err); }
});

// ── Projects ────────────────────────────────────────────
router.get('/projects', async (req, res, next) => {
  try {
    const { page, limit, status, search, sort, order } = req.query;
    const data = await adminService.listAllProjects({
      page: parseInt(page) || 1,
      limit: parseInt(limit) || 20,
      status, search, sort, order
    });
    res.json({ success: true, data });
  } catch (err) { next(err); }
});

router.get('/projects/:id', async (req, res, next) => {
  try {
    const data = await adminService.getProjectDetail(req.params.id);
    res.json({ success: true, data });
  } catch (err) { next(err); }
});

router.delete('/projects/:id', async (req, res, next) => {
  try {
    const result = await adminService.deleteProject(req.params.id, req.user);
    res.json({ success: true, data: result });
  } catch (err) { next(err); }
});

// ── System Health ───────────────────────────────────────
router.get('/system/health', async (req, res, next) => {
  try {
    const health = await adminService.getSystemHealth();
    res.json({ success: true, data: health });
  } catch (err) { next(err); }
});

module.exports = router;
