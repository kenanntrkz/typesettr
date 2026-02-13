// Faz 2 — User Model (with email verification)
const { DataTypes } = require('sequelize');
const bcrypt = require('bcrypt');
const { getSequelize } = require('../config/database');

let UserModel;

function User() {
  if (UserModel) return UserModel;
  const sequelize = getSequelize();

  UserModel = sequelize.define('User', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    email: { type: DataTypes.STRING(255), allowNull: false, unique: true, validate: { isEmail: true } },
    password_hash: { type: DataTypes.STRING(255), allowNull: false },
    name: { type: DataTypes.STRING(255), allowNull: false, validate: { len: [1, 255] } },
    language: { type: DataTypes.STRING(2), defaultValue: 'tr', validate: { isIn: [['tr', 'en']] } },
    plan: { type: DataTypes.STRING(20), defaultValue: 'free', validate: { isIn: [['free', 'pro', 'enterprise']] } },
    projects_count: { type: DataTypes.INTEGER, defaultValue: 0 },
    email_verified: { type: DataTypes.BOOLEAN, defaultValue: false },
    verification_token: { type: DataTypes.STRING(255), allowNull: true },
    verification_expires: { type: DataTypes.DATE, allowNull: true },
    reset_token: { type: DataTypes.STRING(255), allowNull: true },
    reset_expires: { type: DataTypes.DATE, allowNull: true }
  }, {
    tableName: 'users',
    timestamps: true,
    underscored: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  });

  UserModel.prototype.checkPassword = async function(password) {
    return bcrypt.compare(password, this.password_hash);
  };

  UserModel.prototype.toSafeJSON = function() {
    const { password_hash, verification_token, reset_token, ...safe } = this.toJSON();
    return safe;
  };

  UserModel.hashPassword = async function(password) {
    return bcrypt.hash(password, 12);
  };

  return UserModel;
}

module.exports = User;
