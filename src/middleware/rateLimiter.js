// Faz 2 — Rate Limiting Middleware (plan-based)
const rateLimit = require('express-rate-limit');
const logger = require('../utils/logger');

const planLimits = {
  free: { windowMs: 60000, max: 60 },
  pro: { windowMs: 60000, max: 60 },
  enterprise: { windowMs: 60000, max: 200 }
};

const apiLimiter = rateLimit({
  windowMs: 60000,
  max: (req) => {
    const plan = req.user?.plan || 'free';
    return planLimits[plan]?.max || 10;
  },
  message: { success: false, error: 'Too many requests, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.user?.id || req.ip
});

const authLimiter = rateLimit({
  windowMs: 900000, // 15 min
  max: 10,
  message: { success: false, error: 'Too many login attempts, try again in 15 minutes' },
  standardHeaders: true,
  legacyHeaders: false
});

const uploadLimiter = rateLimit({
  windowMs: 3600000, // 1 hour
  max: (req) => {
    const plan = req.user?.plan || 'free';
    return plan === 'free' ? 5 : plan === 'pro' ? 50 : 200;
  },
  message: { success: false, error: 'Upload limit reached for your plan' },
  keyGenerator: (req) => req.user?.id || req.ip
});

module.exports = { apiLimiter, authLimiter, uploadLimiter };
