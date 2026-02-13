// Faz 2 — Socket.io configuration (fixed template literals)
const { Server } = require('socket.io');
const logger = require('../utils/logger');

let io;

function initSocketIO(httpServer) {
  io = new Server(httpServer, {
    cors: {
      origin: process.env.CORS_ORIGINS
        ? process.env.CORS_ORIGINS.split(',')
        : ['http://localhost:5173'],
      methods: ['GET', 'POST'],
      credentials: true
    },
    pingTimeout: 60000,
    pingInterval: 25000
  });

  io.on('connection', (socket) => {
    logger.debug(`Socket connected: ${socket.id}`);

    socket.on('join-project', ({ projectId }) => {
      if (projectId) {
        socket.join(`project:${projectId}`);
        logger.debug(`Socket ${socket.id} joined project:${projectId}`);
      }
    });

    socket.on('leave-project', ({ projectId }) => {
      if (projectId) {
        socket.leave(`project:${projectId}`);
      }
    });

    socket.on('disconnect', (reason) => {
      logger.debug(`Socket disconnected: ${socket.id} (${reason})`);
    });
  });

  logger.info('Socket.io initialized');
  return io;
}

function getIO() {
  if (!io) throw new Error('Socket.io not initialized');
  return io;
}

function emitProgress(projectId, data) {
  if (io) {
    io.to(`project:${projectId}`).emit('progress', { projectId, ...data });
  }
}

function emitCompleted(projectId, data) {
  if (io) {
    io.to(`project:${projectId}`).emit('completed', { projectId, ...data });
  }
}

function emitError(projectId, data) {
  if (io) {
    io.to(`project:${projectId}`).emit('error', { projectId, ...data });
  }
}

module.exports = { initSocketIO, getIO, emitProgress, emitCompleted, emitError };
