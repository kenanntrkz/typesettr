const { DataTypes } = require('sequelize');
const { getSequelize } = require('../config/database');

let SiteSettingModel;

function SiteSetting() {
  if (SiteSettingModel) return SiteSettingModel;
  const sequelize = getSequelize();

  SiteSettingModel = sequelize.define('SiteSetting', {
    key: { type: DataTypes.STRING(100), primaryKey: true },
    value: { type: DataTypes.JSONB, allowNull: false },
    description: { type: DataTypes.STRING(500), allowNull: true },
    updated_by: { type: DataTypes.UUID, allowNull: true }
  }, {
    tableName: 'site_settings',
    timestamps: true,
    underscored: true,
    createdAt: false,
    updatedAt: 'updated_at'
  });

  return SiteSettingModel;
}

module.exports = SiteSetting;
