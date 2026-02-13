// Admin Service — Dashboard, User Management, System Health
const { getModels } = require('../models');
const { getSequelize } = require('../config/database');
const { getRedis } = require('../config/redis');
const { getMinio } = require('../config/minio');
const logger = require('../utils/logger');
const { Op, fn, col, literal } = require('sequelize');

// ── Dashboard Stats ─────────────────────────────────────
async function getDashboardStats() {
  const { User, Project } = getModels();

  const [totalUsers, totalProjects, activeProcessing, todayRegistrations] = await Promise.all([
    User.count(),
    Project.count(),
    Project.count({ where: { status: 'processing' } }),
    User.count({
      where: {
        created_at: { [Op.gte]: new Date(new Date().setHours(0, 0, 0, 0)) }
      }
    })
  ]);

  const planBreakdown = await User.findAll({
    attributes: ['plan', [fn('COUNT', col('id')), 'count']],
    group: ['plan'],
    raw: true
  });

  const statusBreakdown = await Project.findAll({
    attributes: ['status', [fn('COUNT', col('id')), 'count']],
    group: ['status'],
    raw: true
  });

  return {
    totalUsers,
    totalProjects,
    activeProcessing,
    todayRegistrations,
    planBreakdown,
    statusBreakdown
  };
}

// ── Processing Stats (period: 7d, 30d, 90d) ────────────
async function getProcessingStats(period) {
  const days = period === '90d' ? 90 : period === '30d' ? 30 : 7;
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  const sequelize = getSequelize();

  const dailyProjects = await sequelize.query(`
    SELECT DATE(created_at) as date, COUNT(*) as count, status
    FROM projects
    WHERE created_at >= :since
    GROUP BY DATE(created_at), status
    ORDER BY date ASC
  `, {
    replacements: { since },
    type: sequelize.constructor.QueryTypes.SELECT
  });

  const dailyUsers = await sequelize.query(`
    SELECT DATE(created_at) as date, COUNT(*) as count
    FROM users
    WHERE created_at >= :since
    GROUP BY DATE(created_at)
    ORDER BY date ASC
  `, {
    replacements: { since },
    type: sequelize.constructor.QueryTypes.SELECT
  });

  return { dailyProjects, dailyUsers, period };
}

// ── User Management ─────────────────────────────────────
async function listUsers({ page = 1, limit = 20, search, plan, role, sort = 'created_at', order = 'DESC' }) {
  const { User } = getModels();
  const where = {};

  if (search) {
    where[Op.or] = [
      { email: { [Op.iLike]: `%${search}%` } },
      { name: { [Op.iLike]: `%${search}%` } }
    ];
  }
  if (plan) where.plan = plan;
  if (role) where.role = role;

  const allowedSort = ['created_at', 'name', 'email', 'plan', 'projects_count'];
  const sortField = allowedSort.includes(sort) ? sort : 'created_at';
  const sortOrder = order === 'ASC' ? 'ASC' : 'DESC';

  const { rows, count } = await User.findAndCountAll({
    where,
    attributes: { exclude: ['password_hash', 'verification_token', 'reset_token', 'verification_expires', 'reset_expires'] },
    order: [[sortField, sortOrder]],
    limit: Math.min(limit, 100),
    offset: (page - 1) * limit
  });

  return {
    users: rows,
    total: count,
    page,
    totalPages: Math.ceil(count / limit)
  };
}

async function getUserDetail(userId) {
  const { User, Project } = getModels();

  const user = await User.findByPk(userId, {
    attributes: { exclude: ['password_hash', 'verification_token', 'reset_token', 'verification_expires', 'reset_expires'] }
  });

  if (!user) {
    const error = new Error('User not found');
    error.status = 404;
    throw error;
  }

  const projects = await Project.findAll({
    where: { user_id: userId },
    order: [['created_at', 'DESC']],
    limit: 50
  });

  return { user, projects };
}

async function updateUserRole(userId, role, adminUser) {
  const { User } = getModels();
  const validRoles = ['user', 'admin', 'superadmin'];
  if (!validRoles.includes(role)) {
    const error = new Error('Invalid role');
    error.status = 400;
    throw error;
  }

  if (userId === adminUser.id) {
    const error = new Error('Cannot change your own role');
    error.status = 400;
    throw error;
  }

  const user = await User.findByPk(userId);
  if (!user) {
    const error = new Error('User not found');
    error.status = 404;
    throw error;
  }

  user.role = role;
  await user.save();

  logger.info(`Admin ${adminUser.id} changed role of user ${userId} to ${role}`);
  return user.toSafeJSON();
}

async function updateUserPlan(userId, plan) {
  const { User } = getModels();
  const validPlans = ['free', 'pro', 'enterprise'];
  if (!validPlans.includes(plan)) {
    const error = new Error('Invalid plan');
    error.status = 400;
    throw error;
  }

  const user = await User.findByPk(userId);
  if (!user) {
    const error = new Error('User not found');
    error.status = 404;
    throw error;
  }

  user.plan = plan;
  await user.save();

  logger.info(`User ${userId} plan changed to ${plan}`);
  return user.toSafeJSON();
}

async function toggleBanUser(userId, banned, adminUser) {
  const { User } = getModels();

  if (userId === adminUser.id) {
    const error = new Error('Cannot ban yourself');
    error.status = 400;
    throw error;
  }

  const user = await User.findByPk(userId);
  if (!user) {
    const error = new Error('User not found');
    error.status = 404;
    throw error;
  }

  if (user.role === 'superadmin') {
    const error = new Error('Cannot ban a super admin');
    error.status = 403;
    throw error;
  }

  user.is_banned = banned;
  await user.save();

  logger.info(`Admin ${adminUser.id} ${banned ? 'banned' : 'unbanned'} user ${userId}`);
  return user.toSafeJSON();
}

// ── Project Management ──────────────────────────────────
async function listAllProjects({ page = 1, limit = 20, status, search, sort = 'created_at', order = 'DESC' }) {
  const { Project, User } = getModels();
  const where = {};

  if (status) where.status = status;
  if (search) {
    where.name = { [Op.iLike]: `%${search}%` };
  }

  const allowedSort = ['created_at', 'name', 'status', 'page_count', 'file_size'];
  const sortField = allowedSort.includes(sort) ? sort : 'created_at';
  const sortOrder = order === 'ASC' ? 'ASC' : 'DESC';

  const { rows, count } = await Project.findAndCountAll({
    where,
    include: [{ model: User, attributes: ['id', 'name', 'email'] }],
    order: [[sortField, sortOrder]],
    limit: Math.min(limit, 100),
    offset: (page - 1) * limit
  });

  return {
    projects: rows,
    total: count,
    page,
    totalPages: Math.ceil(count / limit)
  };
}

async function getProjectDetail(projectId) {
  const { Project, User, File, ProcessingLog } = getModels();

  const project = await Project.findByPk(projectId, {
    include: [
      { model: User, attributes: ['id', 'name', 'email'] },
      { model: File },
      { model: ProcessingLog, order: [['created_at', 'ASC']] }
    ]
  });

  if (!project) {
    const error = new Error('Project not found');
    error.status = 404;
    throw error;
  }

  return project;
}

async function deleteProject(projectId, adminUser) {
  const { Project } = getModels();

  const project = await Project.findByPk(projectId);
  if (!project) {
    const error = new Error('Project not found');
    error.status = 404;
    throw error;
  }

  await project.destroy();
  logger.info(`Admin ${adminUser.id} deleted project ${projectId}`);
  return { message: 'Project deleted' };
}

// ── System Health ───────────────────────────────────────
async function getSystemHealth() {
  const checks = {};

  // PostgreSQL
  try {
    const sequelize = getSequelize();
    await sequelize.authenticate();
    checks.postgresql = { status: 'ok' };
  } catch (err) {
    checks.postgresql = { status: 'error', message: err.message };
  }

  // Redis
  try {
    const redis = getRedis();
    const pong = await redis.ping();
    checks.redis = { status: pong === 'PONG' ? 'ok' : 'error' };
  } catch (err) {
    checks.redis = { status: 'error', message: err.message };
  }

  // MinIO
  try {
    const minio = getMinio();
    const bucket = process.env.MINIO_BUCKET || 'typesettr-files';
    const exists = await minio.bucketExists(bucket);
    checks.minio = { status: exists ? 'ok' : 'error' };
  } catch (err) {
    checks.minio = { status: 'error', message: err.message };
  }

  // Queue (BullMQ via Redis)
  try {
    const redis = getRedis();
    const waiting = await redis.llen('bull:typeset:wait') || 0;
    const active = await redis.llen('bull:typeset:active') || 0;
    const failed = await redis.zcard('bull:typeset:failed') || 0;
    checks.queue = { status: 'ok', waiting, active, failed };
  } catch (err) {
    checks.queue = { status: 'error', message: err.message };
  }

  checks.uptime = process.uptime();
  checks.memory = process.memoryUsage();

  return checks;
}

module.exports = {
  getDashboardStats,
  getProcessingStats,
  listUsers,
  getUserDetail,
  updateUserRole,
  updateUserPlan,
  toggleBanUser,
  listAllProjects,
  getProjectDetail,
  deleteProject,
  getSystemHealth
};
