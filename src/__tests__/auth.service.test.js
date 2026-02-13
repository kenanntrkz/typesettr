// Auth Service Tests
const authService = require('../services/auth.service');

// Mock dependencies
jest.mock('../models', () => ({
  getModels: jest.fn()
}));
jest.mock('../middleware/auth', () => ({
  generateToken: jest.fn(() => 'mock-token'),
  generateRefreshToken: jest.fn(() => 'mock-refresh-token')
}));
jest.mock('../services/email.service', () => ({
  generateVerificationToken: jest.fn(() => 'mock-verification-token'),
  sendVerificationEmail: jest.fn(() => Promise.resolve()),
  sendPasswordResetEmail: jest.fn(() => Promise.resolve())
}));
jest.mock('../utils/logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn()
}));

const { getModels } = require('../models');

describe('Auth Service', () => {
  let mockUser;

  beforeEach(() => {
    jest.clearAllMocks();
    mockUser = {
      id: 'test-uuid',
      email: 'test@example.com',
      name: 'Test User',
      plan: 'free',
      email_verified: false,
      save: jest.fn(),
      toSafeJSON: jest.fn(() => ({
        id: 'test-uuid',
        email: 'test@example.com',
        name: 'Test User'
      }))
    };
  });

  describe('register', () => {
    it('should reject invalid email format', async () => {
      await expect(
        authService.register({ email: 'invalid-email', password: '12345678', name: 'Test' })
      ).rejects.toThrow('Invalid email format');
    });

    it('should reject short name', async () => {
      await expect(
        authService.register({ email: 'test@example.com', password: '12345678', name: 'A' })
      ).rejects.toThrow('Name must be between 2 and 100 characters');
    });

    it('should reject short password', async () => {
      getModels.mockReturnValue({
        User: {
          findOne: jest.fn(() => null),
          hashPassword: jest.fn(() => 'hashed'),
          create: jest.fn(() => mockUser)
        }
      });

      await expect(
        authService.register({ email: 'test@example.com', password: '123', name: 'Test User' })
      ).rejects.toThrow('Password must be at least 8 characters');
    });

    it('should reject duplicate email', async () => {
      getModels.mockReturnValue({
        User: {
          findOne: jest.fn(() => mockUser),
        }
      });

      await expect(
        authService.register({ email: 'test@example.com', password: '12345678', name: 'Test User' })
      ).rejects.toThrow('Email already registered');
    });

    it('should register a valid user', async () => {
      getModels.mockReturnValue({
        User: {
          findOne: jest.fn(() => null),
          hashPassword: jest.fn(() => 'hashed-password'),
          create: jest.fn(() => mockUser)
        }
      });

      const result = await authService.register({
        email: 'new@example.com',
        password: '12345678',
        name: 'New User'
      });

      expect(result).toHaveProperty('token', 'mock-token');
      expect(result).toHaveProperty('refreshToken', 'mock-refresh-token');
      expect(result).toHaveProperty('user');
    });
  });

  describe('login', () => {
    it('should reject invalid email format', async () => {
      await expect(
        authService.login({ email: 'not-an-email', password: '12345678' })
      ).rejects.toThrow('Invalid email or password');
    });

    it('should reject non-existing user', async () => {
      getModels.mockReturnValue({
        User: { findOne: jest.fn(() => null) }
      });

      await expect(
        authService.login({ email: 'nobody@example.com', password: '12345678' })
      ).rejects.toThrow('Invalid email or password');
    });

    it('should reject wrong password', async () => {
      mockUser.checkPassword = jest.fn(() => false);
      getModels.mockReturnValue({
        User: { findOne: jest.fn(() => mockUser) }
      });

      await expect(
        authService.login({ email: 'test@example.com', password: 'wrong-pass' })
      ).rejects.toThrow('Invalid email or password');
    });

    it('should login with correct credentials', async () => {
      mockUser.checkPassword = jest.fn(() => true);
      getModels.mockReturnValue({
        User: { findOne: jest.fn(() => mockUser) }
      });

      const result = await authService.login({ email: 'test@example.com', password: '12345678' });
      expect(result).toHaveProperty('token');
      expect(result).toHaveProperty('user');
    });
  });

  describe('verifyEmail', () => {
    it('should reject invalid token', async () => {
      getModels.mockReturnValue({
        User: { findOne: jest.fn(() => null) }
      });

      await expect(
        authService.verifyEmail('bad-token')
      ).rejects.toThrow('Invalid or expired verification token');
    });

    it('should verify valid token', async () => {
      getModels.mockReturnValue({
        User: { findOne: jest.fn(() => mockUser) }
      });

      const result = await authService.verifyEmail('valid-token');
      expect(result.message).toBe('Email verified successfully');
      expect(mockUser.email_verified).toBe(true);
      expect(mockUser.save).toHaveBeenCalled();
    });
  });

  describe('forgotPassword', () => {
    it('should not reveal if email does not exist', async () => {
      getModels.mockReturnValue({
        User: { findOne: jest.fn(() => null) }
      });

      const result = await authService.forgotPassword('nobody@example.com');
      expect(result.message).toContain('If the email exists');
    });

    it('should return same message for invalid email format', async () => {
      const result = await authService.forgotPassword('bad-email');
      expect(result.message).toContain('If the email exists');
    });
  });

  describe('resetPassword', () => {
    it('should reject short new password', async () => {
      await expect(
        authService.resetPassword('token', 'short')
      ).rejects.toThrow('Password must be at least 8 characters');
    });

    it('should reject invalid/expired token', async () => {
      getModels.mockReturnValue({
        User: {
          findOne: jest.fn(() => null),
          hashPassword: jest.fn(() => 'hashed')
        }
      });

      await expect(
        authService.resetPassword('bad-token', '12345678')
      ).rejects.toThrow('Invalid or expired reset token');
    });
  });

  describe('updateProfile', () => {
    it('should reject non-existing user', async () => {
      getModels.mockReturnValue({
        User: { findByPk: jest.fn(() => null) }
      });

      await expect(
        authService.updateProfile('bad-id', { name: 'New Name' })
      ).rejects.toThrow('User not found');
    });

    it('should update valid user', async () => {
      mockUser.toSafeJSON = jest.fn(() => ({ id: 'test-uuid', name: 'Updated' }));
      getModels.mockReturnValue({
        User: { findByPk: jest.fn(() => mockUser) }
      });

      const result = await authService.updateProfile('test-uuid', { name: 'Updated', language: 'en' });
      expect(mockUser.name).toBe('Updated');
      expect(mockUser.language).toBe('en');
      expect(mockUser.save).toHaveBeenCalled();
    });

    it('should reject invalid language', async () => {
      getModels.mockReturnValue({
        User: { findByPk: jest.fn(() => mockUser) }
      });

      await authService.updateProfile('test-uuid', { language: 'fr' });
      expect(mockUser.language).toBeUndefined(); // fr is not in ['tr', 'en']
    });
  });
});
