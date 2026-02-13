// Admin Authorization Middleware
const logger = require('../utils/logger');

function adminAuth(req, res, next) {
  if (!req.user || !req.user.role) {
    return res.status(403).json({ success: false, error: 'Access denied' });
  }

  if (req.user.role !== 'admin' && req.user.role !== 'superadmin') {
    logger.warn(`Admin access denied for user ${req.user.id} (role: ${req.user.role})`);
    return res.status(403).json({ success: false, error: 'Admin privileges required' });
  }

  next();
}

function superAdminAuth(req, res, next) {
  if (!req.user || req.user.role !== 'superadmin') {
    return res.status(403).json({ success: false, error: 'Super admin privileges required' });
  }

  next();
}

module.exports = { adminAuth, superAdminAuth };
