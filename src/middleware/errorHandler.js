// Faz 2 — Global Error Handler
const logger = require('../utils/logger');

function errorHandler(err, req, res, next) {
  const statusCode = err.status || err.statusCode || 500;
  const message = err.message || 'Internal server error';

  logger.error(`[${req.method}] ${req.path} — ${statusCode}: ${message}`, {
    stack: err.stack,
    userId: req.user?.id,
    ip: req.ip
  });

  res.status(statusCode).json({
    success: false,
    error: process.env.NODE_ENV === 'production' && statusCode === 500
      ? 'Internal server error'
      : message
  });
}

function notFoundHandler(req, res) {
  res.status(404).json({ success: false, error: `Route ${req.method} ${req.path} not found` });
}

module.exports = { errorHandler, notFoundHandler };
