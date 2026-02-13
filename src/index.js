// Faz 2 — Main Entry Point (Typesettr Backend)
require('dotenv').config();

const express = require('express');
const http = require('http');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const { initSocketIO } = require('./config/socket');
const { initDatabase } = require('./config/database');
const { initRedis } = require('./config/redis');
const { initMinio } = require('./config/minio');
const { initModels } = require('./models');
const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');
const logger = require('./utils/logger');

// Routes
const authRoutes = require('./routes/auth.routes');
const projectRoutes = require('./routes/project.routes');
const fileRoutes = require('./routes/file.routes');
const typesetRoutes = require('./routes/typeset.routes');
const coverRoutes = require("./routes/cover.routes");

// Queue workers
const { startWorker: startTypesetWorker, shutdown: shutdownTypesetQueue } = require('./queues/typeset.queue');

const app = express();
const server = http.createServer(app);
// ── Middleware ────────────────────────────────────────────
app.use(cors({
  origin: process.env.CORS_ORIGINS
    ? process.env.CORS_ORIGINS.split(',')
    : ['http://localhost:5173'],
  credentials: true
}));
app.use(helmet({ crossOriginResourcePolicy: false }));
app.use(morgan('combined', {
  stream: { write: (msg) => logger.info(msg.trim()) }
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
// ── Health Check ─────────────────────────────────────────
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'typesettr-backend',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// ── API Routes ───────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/files', fileRoutes);
app.use('/api/typeset', typesetRoutes);
app.use('/api/covers', coverRoutes);

// ── Error Handling ───────────────────────────────────────
app.use(notFoundHandler);
app.use(errorHandler);

// ── Server Startup ───────────────────────────────────────
async function startServer() {
  const PORT = process.env.PORT || 3000;

  try {
    // 1. Database
    await initDatabase();
    logger.info('PostgreSQL connected');

    // 2. Models
    initModels();
    logger.info('Models initialized');

    // 3. Redis
    await initRedis();
    logger.info('Redis connected');

    // 4. MinIO
    await initMinio();
    logger.info('MinIO connected');

    // 5. Socket.io
    initSocketIO(server);
    logger.info('Socket.io initialized');

    // 6. Queue workers
    startTypesetWorker();
    logger.info('Typeset queue worker started');

    // 7. Start listening
    server.listen(PORT, () => {
      logger.info(`Typesettr Backend running on port ${PORT}`);
      logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
    });
  } catch (error) {
    logger.error(`Failed to start server: ${error.message}`);
    logger.error(error.stack);
    process.exit(1);
  }
}

// ── Graceful Shutdown ────────────────────────────────────
async function gracefulShutdown(signal) {
  logger.info(`${signal} received, shutting down gracefully...`);

  try {
    await shutdownTypesetQueue();
    logger.info('Queue workers stopped');
  } catch (e) {
    logger.error(`Queue shutdown error: ${e.message}`);
  }

  server.close(() => {
    logger.info('HTTP server closed');
    process.exit(0);
  });

  // Force exit after 10 seconds
  setTimeout(() => {
    logger.error('Forced exit after timeout');
    process.exit(1);
  }, 10000);
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

startServer();
