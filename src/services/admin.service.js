// Admin Service — Dashboard, Users, Projects, Audit, Queue, Settings, Analytics
const { getModels } = require('../models');
const { getSequelize } = require('../config/database');
const { getRedis } = require('../config/redis');
const { getMinio } = require('../config/minio');
const logger = require('../utils/logger');
const { Op, fn, col } = require('sequelize');

// ══════════════════════════════════════════════════════════
// AUDIT LOG
// ══════════════════════════════════════════════════════════
async function logAudit(adminUser, action, targetType, targetId, details, ip) {
  try {
    const { AuditLog } = getModels();
    await AuditLog.create({
      admin_id: adminUser.id,
      admin_email: adminUser.email,
      action,
      target_type: targetType || null,
      target_id: targetId || null,
      details: details || null,
      ip_address: ip || null
    });
  } catch (err) {
    logger.error(`Audit log failed: ${err.message}`);
  }
}

async function getAuditLogs({ page = 1, limit = 30, action, search }) {
  const { AuditLog } = getModels();
  const where = {};

  if (action) where.action = action;
  if (search) {
    where[Op.or] = [
      { admin_email: { [Op.iLike]: `%${search}%` } },
      { action: { [Op.iLike]: `%${search}%` } }
    ];
  }

  const { rows, count } = await AuditLog.findAndCountAll({
    where,
    order: [['created_at', 'DESC']],
    limit: Math.min(limit, 100),
    offset: (page - 1) * limit
  });

  return { logs: rows, total: count, page, totalPages: Math.ceil(count / limit) };
}

// ══════════════════════════════════════════════════════════
// DASHBOARD STATS
// ══════════════════════════════════════════════════════════
async function getDashboardStats() {
  const { User, Project } = getModels();

  const [totalUsers, totalProjects, activeProcessing, todayRegistrations, bannedUsers, totalCompleted, totalFailed] = await Promise.all([
    User.count(),
    Project.count(),
    Project.count({ where: { status: 'processing' } }),
    User.count({ where: { created_at: { [Op.gte]: new Date(new Date().setHours(0, 0, 0, 0)) } } }),
    User.count({ where: { is_banned: true } }),
    Project.count({ where: { status: 'completed' } }),
    Project.count({ where: { status: 'failed' } })
  ]);

  const planBreakdown = await User.findAll({
    attributes: ['plan', [fn('COUNT', col('id')), 'count']],
    group: ['plan'], raw: true
  });

  const statusBreakdown = await Project.findAll({
    attributes: ['status', [fn('COUNT', col('id')), 'count']],
    group: ['status'], raw: true
  });

  const roleBreakdown = await User.findAll({
    attributes: ['role', [fn('COUNT', col('id')), 'count']],
    group: ['role'], raw: true
  });

  const successRate = totalCompleted + totalFailed > 0
    ? Math.round((totalCompleted / (totalCompleted + totalFailed)) * 100) : 0;

  return {
    totalUsers, totalProjects, activeProcessing, todayRegistrations,
    bannedUsers, totalCompleted, totalFailed, successRate,
    planBreakdown, statusBreakdown, roleBreakdown
  };
}

// ══════════════════════════════════════════════════════════
// ANALYTICS
// ══════════════════════════════════════════════════════════
async function getProcessingStats(period) {
  const days = period === '90d' ? 90 : period === '30d' ? 30 : 7;
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  const sequelize = getSequelize();

  const dailyProjects = await sequelize.query(`
    SELECT DATE(created_at) as date, COUNT(*) as count, status
    FROM projects WHERE created_at >= :since
    GROUP BY DATE(created_at), status ORDER BY date ASC
  `, { replacements: { since }, type: sequelize.constructor.QueryTypes.SELECT });

  const dailyUsers = await sequelize.query(`
    SELECT DATE(created_at) as date, COUNT(*) as count
    FROM users WHERE created_at >= :since
    GROUP BY DATE(created_at) ORDER BY date ASC
  `, { replacements: { since }, type: sequelize.constructor.QueryTypes.SELECT });

  const cumulativeUsers = await sequelize.query(`
    SELECT DATE(created_at) as date,
      SUM(COUNT(*)) OVER (ORDER BY DATE(created_at)) as cumulative
    FROM users WHERE created_at >= :since
    GROUP BY DATE(created_at) ORDER BY date ASC
  `, { replacements: { since }, type: sequelize.constructor.QueryTypes.SELECT });

  const avgProcessingTime = await sequelize.query(`
    SELECT DATE(created_at) as date, ROUND(AVG(processing_time_ms)) as avg_ms
    FROM projects WHERE created_at >= :since AND processing_time_ms IS NOT NULL
    GROUP BY DATE(created_at) ORDER BY date ASC
  `, { replacements: { since }, type: sequelize.constructor.QueryTypes.SELECT });

  const topUsers = await sequelize.query(`
    SELECT u.name, u.email, COUNT(p.id) as project_count
    FROM users u JOIN projects p ON p.user_id = u.id
    WHERE p.created_at >= :since
    GROUP BY u.id, u.name, u.email
    ORDER BY project_count DESC LIMIT 10
  `, { replacements: { since }, type: sequelize.constructor.QueryTypes.SELECT });

  const hourlyDistribution = await sequelize.query(`
    SELECT EXTRACT(HOUR FROM created_at)::int as hour, COUNT(*) as count
    FROM projects WHERE created_at >= :since
    GROUP BY hour ORDER BY hour ASC
  `, { replacements: { since }, type: sequelize.constructor.QueryTypes.SELECT });

  return { dailyProjects, dailyUsers, cumulativeUsers, avgProcessingTime, topUsers, hourlyDistribution, period };
}

// ══════════════════════════════════════════════════════════
// USER MANAGEMENT
// ══════════════════════════════════════════════════════════
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
  return { users: rows, total: count, page, totalPages: Math.ceil(count / limit) };
}

async function getUserDetail(userId) {
  const { User, Project } = getModels();
  const user = await User.findByPk(userId, {
    attributes: { exclude: ['password_hash', 'verification_token', 'reset_token', 'verification_expires', 'reset_expires'] }
  });
  if (!user) { const e = new Error('User not found'); e.status = 404; throw e; }
  const projects = await Project.findAll({ where: { user_id: userId }, order: [['created_at', 'DESC']], limit: 50 });
  return { user, projects };
}

async function updateUserRole(userId, role, adminUser, ip) {
  const { User } = getModels();
  if (!['user', 'admin', 'superadmin'].includes(role)) { const e = new Error('Invalid role'); e.status = 400; throw e; }
  if (userId === adminUser.id) { const e = new Error('Cannot change your own role'); e.status = 400; throw e; }
  const user = await User.findByPk(userId);
  if (!user) { const e = new Error('User not found'); e.status = 404; throw e; }
  const oldRole = user.role;
  user.role = role;
  await user.save();
  await logAudit(adminUser, 'user.role_change', 'user', userId, { oldRole, newRole: role, email: user.email }, ip);
  return user.toSafeJSON();
}

async function updateUserPlan(userId, plan, adminUser, ip) {
  const { User } = getModels();
  if (!['free', 'pro', 'enterprise'].includes(plan)) { const e = new Error('Invalid plan'); e.status = 400; throw e; }
  const user = await User.findByPk(userId);
  if (!user) { const e = new Error('User not found'); e.status = 404; throw e; }
  const oldPlan = user.plan;
  user.plan = plan;
  await user.save();
  await logAudit(adminUser, 'user.plan_change', 'user', userId, { oldPlan, newPlan: plan, email: user.email }, ip);
  return user.toSafeJSON();
}

async function toggleBanUser(userId, banned, adminUser, ip) {
  const { User } = getModels();
  if (userId === adminUser.id) { const e = new Error('Cannot ban yourself'); e.status = 400; throw e; }
  const user = await User.findByPk(userId);
  if (!user) { const e = new Error('User not found'); e.status = 404; throw e; }
  if (user.role === 'superadmin') { const e = new Error('Cannot ban a super admin'); e.status = 403; throw e; }
  user.is_banned = banned;
  await user.save();
  await logAudit(adminUser, banned ? 'user.ban' : 'user.unban', 'user', userId, { email: user.email }, ip);
  return user.toSafeJSON();
}

// ══════════════════════════════════════════════════════════
// PROJECT MANAGEMENT
// ══════════════════════════════════════════════════════════
async function listAllProjects({ page = 1, limit = 20, status, search, sort = 'created_at', order = 'DESC' }) {
  const { Project, User } = getModels();
  const where = {};
  if (status) where.status = status;
  if (search) where.name = { [Op.iLike]: `%${search}%` };
  const allowedSort = ['created_at', 'name', 'status', 'page_count', 'file_size'];
  const sortField = allowedSort.includes(sort) ? sort : 'created_at';
  const sortOrder = order === 'ASC' ? 'ASC' : 'DESC';
  const { rows, count } = await Project.findAndCountAll({
    where, include: [{ model: User, attributes: ['id', 'name', 'email'] }],
    order: [[sortField, sortOrder]], limit: Math.min(limit, 100), offset: (page - 1) * limit
  });
  return { projects: rows, total: count, page, totalPages: Math.ceil(count / limit) };
}

async function getProjectDetail(projectId) {
  const { Project, User, File, ProcessingLog } = getModels();
  const project = await Project.findByPk(projectId, {
    include: [{ model: User, attributes: ['id', 'name', 'email'] }, { model: File }, { model: ProcessingLog, order: [['created_at', 'ASC']] }]
  });
  if (!project) { const e = new Error('Project not found'); e.status = 404; throw e; }
  return project;
}

async function deleteProject(projectId, adminUser, ip) {
  const { Project } = getModels();
  const project = await Project.findByPk(projectId);
  if (!project) { const e = new Error('Project not found'); e.status = 404; throw e; }
  const projectName = project.name;
  await project.destroy();
  await logAudit(adminUser, 'project.delete', 'project', projectId, { name: projectName }, ip);
  return { message: 'Project deleted' };
}

// ══════════════════════════════════════════════════════════
// QUEUE MANAGEMENT
// ══════════════════════════════════════════════════════════
async function getQueueStats() {
  const redis = getRedis();
  const waiting = await redis.llen('bull:typeset:wait') || 0;
  const active = await redis.llen('bull:typeset:active') || 0;
  const completed = await redis.zcard('bull:typeset:completed') || 0;
  const failed = await redis.zcard('bull:typeset:failed') || 0;
  const delayed = await redis.zcard('bull:typeset:delayed') || 0;
  return { waiting, active, completed, failed, delayed };
}

async function getQueueJobs(status = 'failed', page = 1, limit = 20) {
  const redis = getRedis();
  const offset = (page - 1) * limit;
  let jobIds = [];
  if (status === 'failed') jobIds = await redis.zrange('bull:typeset:failed', offset, offset + limit - 1);
  else if (status === 'completed') jobIds = await redis.zrange('bull:typeset:completed', offset, offset + limit - 1);
  else if (status === 'waiting') jobIds = await redis.lrange('bull:typeset:wait', offset, offset + limit - 1);
  else if (status === 'active') jobIds = await redis.lrange('bull:typeset:active', offset, offset + limit - 1);
  else if (status === 'delayed') jobIds = await redis.zrange('bull:typeset:delayed', offset, offset + limit - 1);

  const jobs = [];
  for (const jobId of jobIds) {
    const jobData = await redis.hgetall(`bull:typeset:${jobId}`);
    if (jobData && jobData.data) {
      try {
        jobs.push({
          id: jobId, data: JSON.parse(jobData.data),
          failedReason: jobData.failedReason || null,
          timestamp: jobData.timestamp ? parseInt(jobData.timestamp) : null,
          finishedOn: jobData.finishedOn ? parseInt(jobData.finishedOn) : null,
          attemptsMade: jobData.attemptsMade ? parseInt(jobData.attemptsMade) : 0
        });
      } catch { /* skip */ }
    }
  }
  return { jobs, status };
}

async function retryFailedJob(jobId) {
  const { typesetQueue } = require('../queues/typeset.queue');
  const job = await typesetQueue.getJob(jobId);
  if (!job) { const e = new Error('Job not found'); e.status = 404; throw e; }
  await job.retry();
  return { message: `Job ${jobId} queued for retry` };
}

async function cleanQueue(status, adminUser, ip) {
  const { typesetQueue } = require('../queues/typeset.queue');
  let cleaned = 0;
  if (status === 'failed') cleaned = await typesetQueue.clean(0, 1000, 'failed');
  else if (status === 'completed') cleaned = await typesetQueue.clean(0, 1000, 'completed');
  await logAudit(adminUser, 'queue.clean', 'queue', null, { status, cleaned: cleaned?.length || 0 }, ip);
  return { message: `Cleaned ${cleaned?.length || 0} ${status} jobs` };
}

// ══════════════════════════════════════════════════════════
// SITE SETTINGS
// ══════════════════════════════════════════════════════════
const DEFAULT_SETTINGS = {
  'maintenance_mode': { value: false, description: 'Site bakım modu' },
  'max_file_size_mb': { value: 50, description: 'Maksimum dosya boyutu (MB)' },
  'max_projects_free': { value: 3, description: 'Free plan proje limiti' },
  'max_projects_pro': { value: 50, description: 'Pro plan proje limiti' },
  'max_projects_enterprise': { value: 999, description: 'Enterprise plan proje limiti' },
  'rate_limit_free': { value: 10, description: 'Free — dakika başına istek' },
  'rate_limit_pro': { value: 30, description: 'Pro — dakika başına istek' },
  'registration_enabled': { value: true, description: 'Yeni kayıt açık mı?' },
  'site_announcement': { value: '', description: 'Site duyurusu (boş = kapalı)' }
};

async function getAllSettings() {
  const { SiteSetting } = getModels();
  const dbSettings = await SiteSetting.findAll({ raw: true });
  const settings = {};
  for (const [key, def] of Object.entries(DEFAULT_SETTINGS)) {
    const dbVal = dbSettings.find(s => s.key === key);
    settings[key] = { value: dbVal ? dbVal.value : def.value, description: def.description, updated_at: dbVal?.updated_at || null };
  }
  return settings;
}

async function updateSetting(key, value, adminUser, ip) {
  const { SiteSetting } = getModels();
  if (!DEFAULT_SETTINGS[key]) { const e = new Error('Unknown setting key'); e.status = 400; throw e; }
  await SiteSetting.upsert({ key, value, description: DEFAULT_SETTINGS[key].description, updated_by: adminUser.id });
  await logAudit(adminUser, 'settings.update', 'setting', null, { key, value }, ip);
  return { key, value };
}

// ══════════════════════════════════════════════════════════
// SYSTEM HEALTH
// ══════════════════════════════════════════════════════════
async function getSystemHealth() {
  const checks = {};
  try { const sq = getSequelize(); await sq.authenticate(); checks.postgresql = { status: 'ok' }; }
  catch (err) { checks.postgresql = { status: 'error', message: err.message }; }

  try {
    const redis = getRedis(); const pong = await redis.ping();
    const info = await redis.info('memory');
    const memMatch = info.match(/used_memory_human:(.+)/);
    checks.redis = { status: pong === 'PONG' ? 'ok' : 'error', memory: memMatch ? memMatch[1].trim() : null };
  } catch (err) { checks.redis = { status: 'error', message: err.message }; }

  try {
    const minio = getMinio(); const bucket = process.env.MINIO_BUCKET || 'typesettr-files';
    const exists = await minio.bucketExists(bucket);
    checks.minio = { status: exists ? 'ok' : 'error' };
  } catch (err) { checks.minio = { status: 'error', message: err.message }; }

  try {
    const redis = getRedis();
    checks.queue = { status: 'ok', waiting: await redis.llen('bull:typeset:wait') || 0, active: await redis.llen('bull:typeset:active') || 0, failed: await redis.zcard('bull:typeset:failed') || 0 };
  } catch (err) { checks.queue = { status: 'error', message: err.message }; }

  checks.uptime = process.uptime();
  checks.memory = process.memoryUsage();
  checks.nodeVersion = process.version;
  return checks;
}

module.exports = {
  logAudit, getAuditLogs, getDashboardStats, getProcessingStats,
  listUsers, getUserDetail, updateUserRole, updateUserPlan, toggleBanUser,
  listAllProjects, getProjectDetail, deleteProject,
  getQueueStats, getQueueJobs, retryFailedJob, cleanQueue,
  getAllSettings, updateSetting, getSystemHealth
};
