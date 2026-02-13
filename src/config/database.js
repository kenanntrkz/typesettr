const { Sequelize } = require('sequelize');
const logger = require('../utils/logger');

let sequelize;

function getSequelize() {
  if (!sequelize) {
    sequelize = new Sequelize(process.env.DATABASE_URL, {
      dialect: 'postgres',
      logging: (msg) => logger.debug(msg),
      pool: { max: 10, min: 2, acquire: 30000, idle: 10000 },
      define: { timestamps: true, underscored: true, createdAt: 'created_at', updatedAt: 'updated_at' }
    });
  }
  return sequelize;
}

async function initDatabase() {
  const db = getSequelize();
  await db.authenticate();
  if (process.env.NODE_ENV === 'development') {
    await db.sync({ alter: true });
  }
  return db;
}

module.exports = { getSequelize, initDatabase };
