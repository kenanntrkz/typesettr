// Faz 2 — ProcessingLog Model
const { DataTypes } = require('sequelize');
const { getSequelize } = require('../config/database');

let ProcessingLogModel;

function ProcessingLog() {
  if (ProcessingLogModel) return ProcessingLogModel;
  const sequelize = getSequelize();

  ProcessingLogModel = sequelize.define('ProcessingLog', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    project_id: {
      type: DataTypes.UUID,
      allowNull: false
    },
    step: {
      type: DataTypes.STRING(50),
      allowNull: false
    },
    status: {
      type: DataTypes.STRING(20),
      allowNull: false
    },
    message: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    metadata: {
      type: DataTypes.JSONB,
      allowNull: true,
      defaultValue: {}
    },
    duration_ms: {
      type: DataTypes.INTEGER,
      allowNull: true
    }
  }, {
    tableName: 'processing_logs',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: false
  });

  return ProcessingLogModel;
}

module.exports = ProcessingLog;
