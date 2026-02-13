// Faz 2 — File Model (Sequelize)
const { DataTypes } = require('sequelize');
const { getSequelize } = require('../config/database');

let FileModel;

function File() {
  if (FileModel) return FileModel;

  const sequelize = getSequelize();

  FileModel = sequelize.define('File', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    project_id: {
      type: DataTypes.UUID,
      allowNull: true,
      references: { model: 'projects', key: 'id' }
    },
    type: {
      type: DataTypes.STRING(20),
      allowNull: false,
      validate: { isIn: [['source_docx', 'output_pdf', 'output_latex', 'cover_image']] }
    },
    filename: {
      type: DataTypes.STRING(500),
      allowNull: false
    },
    storage_path: {
      type: DataTypes.STRING(1000),
      allowNull: false
    },
    file_size: {
      type: DataTypes.BIGINT,
      allowNull: false
    },
    mime_type: {
      type: DataTypes.STRING(100),
      allowNull: false
    }
  }, {
    tableName: 'files',
    timestamps: true,
    underscored: true,
    createdAt: 'created_at',
    updatedAt: false
  });

  return FileModel;
}

module.exports = File;
