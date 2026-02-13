// Faz 2 — Project Service
const { getModels } = require('../models');
const logger = require('../utils/logger');

const DEFAULT_SETTINGS = {
  pageSize: 'a5',
  margins: 'standard',
  fontFamily: 'ebgaramond',
  fontSize: '11pt',
  lineSpacing: 1.15,
  chapterStyle: 'classic',
  language: 'tr',
  features: {
    tableOfContents: true,
    listOfFigures: true,
    listOfTables: true,
    footnotes: true,
    bibliography: false,
    pageNumbers: true,
    header: true,
    footer: true,
    coverPage: false
  }
};

async function createProject(userId, { name, settings, coverData }) {
  const { Project, User } = getModels();

  const user = await User.findByPk(userId);
  if (user.plan === 'free') {
    const count = await Project.count({ where: { user_id: userId } });
    if (count >= 3) {
      const error = new Error('Free plan limit: maximum 3 projects. Upgrade to Pro for unlimited.');
      error.status = 403;
      throw error;
    }
  }

  const mergedSettings = { ...DEFAULT_SETTINGS, ...settings };
  if (settings?.features) {
    mergedSettings.features = { ...DEFAULT_SETTINGS.features, ...settings.features };
  }

  const project = await Project.create({
    user_id: userId,
    name: name.replace(/<[^>]*>/g, "").trim().substring(0, 500),
    settings: mergedSettings,
    cover_data: coverData || null,
    status: 'pending',
    progress: 0
  });

  await User.increment('projects_count', { by: 1, where: { id: userId } });
  logger.info(`Project created: ${project.id} by user ${userId}`);
  return project.toJSON();
}

async function getProjects(userId) {
  const { Project } = getModels();
  return (await Project.findAll({
    where: { user_id: userId },
    order: [['created_at', 'DESC']],
    attributes: { exclude: ['settings', 'cover_data'] }
  })).map(p => p.toJSON());
}

async function getProject(projectId, userId) {
  const { Project, File, ProcessingLog } = getModels();
  const project = await Project.findOne({
    where: { id: projectId, user_id: userId },
    include: [
      { model: File, as: 'files', attributes: ['id', 'type', 'filename', 'file_size', 'mime_type', 'created_at'] },
      { model: ProcessingLog, as: 'logs', order: [['created_at', 'ASC']], limit: 50 }
    ]
  });
  if (!project) {
    const error = new Error('Project not found');
    error.status = 404;
    throw error;
  }
  return project.toJSON();
}

async function deleteProject(projectId, userId) {
  const { Project, User } = getModels();
  const project = await Project.findOne({ where: { id: projectId, user_id: userId } });
  if (!project) {
    const error = new Error('Project not found');
    error.status = 404;
    throw error;
  }
  await project.destroy();
  await User.decrement('projects_count', { by: 1, where: { id: userId } });
  logger.info(`Project deleted: ${projectId}`);
  return { success: true };
}

const ALLOWED_STATUS_FIELDS = [
  'status', 'current_step', 'progress', 'error_message',
  'output_pdf_url', 'output_latex_url', 'page_count',
  'file_size', 'processing_time_ms', 'source_file_url'
];

async function updateProjectStatus(projectId, updates) {
  const { Project } = getModels();
  const project = await Project.findByPk(projectId);
  if (!project) return null;
  const safeUpdates = {};
  for (const key of ALLOWED_STATUS_FIELDS) {
    if (updates[key] !== undefined) safeUpdates[key] = updates[key];
  }
  Object.assign(project, safeUpdates);
  await project.save();
  return project.toJSON();
}

module.exports = { createProject, getProjects, getProject, deleteProject, updateProjectStatus, DEFAULT_SETTINGS };
