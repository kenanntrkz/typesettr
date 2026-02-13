// Faz 2 — Auth Routes
const { Router } = require('express');
const authService = require('../services/auth.service');
const { authenticate } = require('../middleware/auth');
const { authLimiter } = require('../middleware/rateLimiter');

const router = Router();

router.post('/register', authLimiter, async (req, res, next) => {
  try {
    const { email, password, name, language } = req.body;
    if (!email || !password || !name) {
      return res.status(400).json({ success: false, error: 'Email, password and name are required' });
    }
    const result = await authService.register({ email, password, name, language });
    res.status(201).json({ success: true, ...result });
  } catch (error) { next(error); }
});

router.post('/verify-email', authLimiter, async (req, res, next) => {
  try {
    const { token } = req.body;
    if (!token) return res.status(400).json({ success: false, error: 'Token is required' });
    const result = await authService.verifyEmail(token);
    res.json({ success: true, ...result });
  } catch (error) { next(error); }
});

router.post('/resend-verification', authenticate, async (req, res, next) => {
  try {
    const result = await authService.resendVerification(req.user.id);
    res.json({ success: true, ...result });
  } catch (error) { next(error); }
});

router.post('/login', authLimiter, async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, error: 'Email and password are required' });
    }
    const result = await authService.login({ email, password });
    res.json({ success: true, ...result });
  } catch (error) { next(error); }
});

router.post('/forgot-password', authLimiter, async (req, res, next) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ success: false, error: 'Email is required' });
    const result = await authService.forgotPassword(email);
    res.json({ success: true, ...result });
  } catch (error) { next(error); }
});

router.post('/reset-password', authLimiter, async (req, res, next) => {
  try {
    const { token, newPassword } = req.body;
    if (!token || !newPassword) return res.status(400).json({ success: false, error: 'Token and new password are required' });
    const result = await authService.resetPassword(token, newPassword);
    res.json({ success: true, ...result });
  } catch (error) { next(error); }
});

router.get('/profile', authenticate, async (req, res, next) => {
  try {
    const user = await authService.getProfile(req.user.id);
    res.json({ success: true, user });
  } catch (error) { next(error); }
});

router.put('/profile', authenticate, async (req, res, next) => {
  try {
    const { name, language } = req.body;
    const user = await authService.updateProfile(req.user.id, { name, language });
    res.json({ success: true, user });
  } catch (error) { next(error); }
});

module.exports = router;
