// Faz 2 — Auth Service (with email verification)
const { getModels } = require('../models');
const { generateToken, generateRefreshToken } = require('../middleware/auth');
const { generateVerificationToken, sendVerificationEmail, sendPasswordResetEmail } = require('./email.service');
const logger = require('../utils/logger');

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validateEmail(email) {
  if (!email || typeof email !== 'string') return false;
  return EMAIL_REGEX.test(email.trim());
}

async function register({ email, password, name, language }) {
  const { User } = getModels();

  if (!validateEmail(email)) {
    const error = new Error('Invalid email format');
    error.status = 400;
    throw error;
  }

  if (!name || typeof name !== 'string' || name.trim().length < 2 || name.trim().length > 100) {
    const error = new Error('Name must be between 2 and 100 characters');
    error.status = 400;
    throw error;
  }

  const existing = await User.findOne({ where: { email: email.toLowerCase().trim() } });
  if (existing) {
    const error = new Error('Email already registered');
    error.status = 409;
    throw error;
  }

  if (!password || password.length < 8) {
    const error = new Error('Password must be at least 8 characters');
    error.status = 400;
    throw error;
  }

  const password_hash = await User.hashPassword(password);
  const verification_token = generateVerificationToken();

  const user = await User.create({
    email: email.toLowerCase().trim(),
    password_hash,
    name: name.trim(),
    language: language || 'tr',
    email_verified: false,
    verification_token,
    verification_expires: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 saat
  });

  // Send verification email (async, don't block registration)
  sendVerificationEmail(user.email, user.name, verification_token).catch(err => {
    logger.error(`Failed to send verification email: ${err.message}`);
  });

  const token = generateToken(user);
  const refreshToken = generateRefreshToken(user);

  logger.info(`User registered: ${user.id} (${user.email})`);
  return { user: user.toSafeJSON(), token, refreshToken };
}

async function verifyEmail(verificationToken) {
  const { User } = getModels();
  const { Op } = require('sequelize');

  const user = await User.findOne({
    where: {
      verification_token: verificationToken,
      verification_expires: { [Op.gt]: new Date() }
    }
  });

  if (!user) {
    const error = new Error('Invalid or expired verification token');
    error.status = 400;
    throw error;
  }

  user.email_verified = true;
  user.verification_token = null;
  user.verification_expires = null;
  await user.save();

  logger.info(`Email verified: ${user.id} (${user.email})`);
  return { message: 'Email verified successfully' };
}

async function resendVerification(userId) {
  const { User } = getModels();
  const user = await User.findByPk(userId);
  if (!user) {
    const error = new Error('User not found');
    error.status = 404;
    throw error;
  }
  if (user.email_verified) {
    const error = new Error('Email already verified');
    error.status = 400;
    throw error;
  }

  const verification_token = generateVerificationToken();
  user.verification_token = verification_token;
  user.verification_expires = new Date(Date.now() + 24 * 60 * 60 * 1000);
  await user.save();

  await sendVerificationEmail(user.email, user.name, verification_token);
  return { message: 'Verification email sent' };
}

async function login({ email, password }) {
  const { User } = getModels();

  if (!validateEmail(email)) {
    const error = new Error('Invalid email or password');
    error.status = 401;
    throw error;
  }

  const user = await User.findOne({ where: { email: email.toLowerCase().trim() } });
  if (!user) {
    const error = new Error('Invalid email or password');
    error.status = 401;
    throw error;
  }

  const valid = await user.checkPassword(password);
  if (!valid) {
    const error = new Error('Invalid email or password');
    error.status = 401;
    throw error;
  }

  const token = generateToken(user);
  const refreshToken = generateRefreshToken(user);

  logger.info(`User logged in: ${user.id} (${user.email})`);
  return { user: user.toSafeJSON(), token, refreshToken };
}

async function forgotPassword(email) {
  const { User } = getModels();

  if (!validateEmail(email)) {
    return { message: 'If the email exists, a reset link has been sent' };
  }

  const user = await User.findOne({ where: { email: email.toLowerCase().trim() } });

  // Don't reveal if email exists
  if (!user) return { message: 'If the email exists, a reset link has been sent' };

  const reset_token = generateVerificationToken();
  user.reset_token = reset_token;
  user.reset_expires = new Date(Date.now() + 60 * 60 * 1000); // 1 saat
  await user.save();

  await sendPasswordResetEmail(user.email, user.name, reset_token);
  return { message: 'If the email exists, a reset link has been sent' };
}

async function resetPassword(token, newPassword) {
  const { User } = getModels();
  const { Op } = require('sequelize');

  if (!newPassword || newPassword.length < 8) {
    const error = new Error('Password must be at least 8 characters');
    error.status = 400;
    throw error;
  }

  const user = await User.findOne({
    where: {
      reset_token: token,
      reset_expires: { [Op.gt]: new Date() }
    }
  });

  if (!user) {
    const error = new Error('Invalid or expired reset token');
    error.status = 400;
    throw error;
  }

  user.password_hash = await User.hashPassword(newPassword);
  user.reset_token = null;
  user.reset_expires = null;
  await user.save();

  logger.info(`Password reset: ${user.id} (${user.email})`);
  return { message: 'Password reset successfully' };
}

async function getProfile(userId) {
  const { User } = getModels();
  const user = await User.findByPk(userId);
  if (!user) {
    const error = new Error('User not found');
    error.status = 404;
    throw error;
  }
  return user.toSafeJSON();
}

async function updateProfile(userId, { name, language }) {
  const { User } = getModels();
  const user = await User.findByPk(userId);
  if (!user) {
    const error = new Error('User not found');
    error.status = 404;
    throw error;
  }

  if (name) user.name = name.trim();
  if (language && ['tr', 'en'].includes(language)) user.language = language;
  await user.save();

  logger.info(`Profile updated: ${userId}`);
  return user.toSafeJSON();
}

module.exports = { register, verifyEmail, resendVerification, login, forgotPassword, resetPassword, getProfile, updateProfile };
