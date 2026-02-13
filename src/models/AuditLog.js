const { DataTypes } = require('sequelize');
const { getSequelize } = require('../config/database');

let AuditLogModel;

function AuditLog() {
  if (AuditLogModel) return AuditLogModel;
  const sequelize = getSequelize();

  AuditLogModel = sequelize.define('AuditLog', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    admin_id: { type: DataTypes.UUID, allowNull: true },
    admin_email: { type: DataTypes.STRING(255) },
    action: { type: DataTypes.STRING(100), allowNull: false },
    target_type: { type: DataTypes.STRING(50), allowNull: true },
    target_id: { type: DataTypes.UUID, allowNull: true },
    details: { type: DataTypes.JSONB, allowNull: true },
    ip_address: { type: DataTypes.STRING(45), allowNull: true }
  }, {
    tableName: 'audit_logs',
    timestamps: true,
    underscored: true,
    createdAt: 'created_at',
    updatedAt: false
  });

  return AuditLogModel;
}

module.exports = AuditLog;
