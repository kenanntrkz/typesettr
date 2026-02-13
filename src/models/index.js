// Faz 2 — Model Associations
const UserFactory = require('./User');
const ProjectFactory = require('./Project');
const FileFactory = require('./File');
const ProcessingLogFactory = require('./ProcessingLog');

let initialized = false;

function initModels() {
  if (initialized) return;

  const User = UserFactory();
  const Project = ProjectFactory();
  const File = FileFactory();
  const ProcessingLog = ProcessingLogFactory();

  User.hasMany(Project, { foreignKey: 'user_id', as: 'projects', onDelete: 'CASCADE' });
  Project.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

  Project.hasMany(File, { foreignKey: 'project_id', as: 'files', onDelete: 'CASCADE' });
  File.belongsTo(Project, { foreignKey: 'project_id', as: 'project' });

  Project.hasMany(ProcessingLog, { foreignKey: 'project_id', as: 'logs', onDelete: 'CASCADE' });
  ProcessingLog.belongsTo(Project, { foreignKey: 'project_id', as: 'project' });

  initialized = true;
  return { User, Project, File, ProcessingLog };
}

function getModels() {
  initModels();
  return {
    User: UserFactory(),
    Project: ProjectFactory(),
    File: FileFactory(),
    ProcessingLog: ProcessingLogFactory()
  };
}

module.exports = { initModels, getModels };
