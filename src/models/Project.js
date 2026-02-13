// Faz 2 — Project Model (Sequelize)
const { DataTypes } = require('sequelize');
const { getSequelize } = require('../config/database');

let ProjectModel;

function Project() {
  if (ProjectModel) return ProjectModel;

  const sequelize = getSequelize();

  ProjectModel = sequelize.define('Project', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    user_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: 'users', key: 'id' }
    },
    name: {
      type: DataTypes.STRING(500),
      allowNull: false,
      validate: { len: [1, 500] }
    },
    status: {
      type: DataTypes.STRING(20),
      defaultValue: 'pending',
      validate: { isIn: [['pending', 'processing', 'completed', 'failed']] }
    },
    current_step: {
      type: DataTypes.STRING(50),
      allowNull: true
    },
    progress: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      validate: { min: 0, max: 100 }
    },
    settings: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: {}
    },
    cover_data: {
      type: DataTypes.JSONB,
      allowNull: true
    },
    error_message: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    source_file_url: {
      type: DataTypes.STRING(1000),
      allowNull: true
    },
    output_pdf_url: {
      type: DataTypes.STRING(1000),
      allowNull: true
    },
    output_latex_url: {
      type: DataTypes.STRING(1000),
      allowNull: true
    },
    page_count: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    file_size: {
      type: DataTypes.BIGINT,
      allowNull: true
    },
    processing_time_ms: {
      type: DataTypes.INTEGER,
      allowNull: true
    }
  }, {
    tableName: 'projects',
    timestamps: true,
    underscored: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  });

  return ProjectModel;
}

module.exports = Project;
