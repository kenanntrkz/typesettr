// Auth Middleware Tests
const jwt = require('jsonwebtoken');

// Set env before requiring module
process.env.JWT_SECRET = 'test-secret-key';

const { authenticate, generateToken, generateRefreshToken } = require('../middleware/auth');

jest.mock('../utils/logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn()
}));

describe('Auth Middleware', () => {
  let req, res, next;

  beforeEach(() => {
    req = { headers: {} };
    res = {
      status: jest.fn(() => res),
      json: jest.fn(() => res)
    };
    next = jest.fn();
  });

  describe('authenticate', () => {
    it('should reject missing authorization header', () => {
      authenticate(req, res, next);
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Authentication required'
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should reject non-Bearer token', () => {
      req.headers.authorization = 'Basic abc123';
      authenticate(req, res, next);
      expect(res.status).toHaveBeenCalledWith(401);
    });

    it('should reject invalid token', () => {
      req.headers.authorization = 'Bearer invalid-token';
      authenticate(req, res, next);
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Invalid token'
      });
    });

    it('should reject expired token', () => {
      const expiredToken = jwt.sign(
        { id: 'user-id', email: 'test@test.com', plan: 'free' },
        'test-secret-key',
        { expiresIn: '-1s' }
      );
      req.headers.authorization = 'Bearer ' + expiredToken;
      authenticate(req, res, next);
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Token expired'
      });
    });

    it('should accept valid token and set req.user', () => {
      const validToken = jwt.sign(
        { id: 'user-id', email: 'test@test.com', plan: 'pro' },
        'test-secret-key',
        { expiresIn: '1h' }
      );
      req.headers.authorization = 'Bearer ' + validToken;
      authenticate(req, res, next);
      expect(next).toHaveBeenCalled();
      expect(req.user).toEqual({
        id: 'user-id',
        email: 'test@test.com',
        plan: 'pro'
      });
    });
  });

  describe('generateToken', () => {
    it('should generate a valid JWT token', () => {
      const user = { id: 'user-id', email: 'test@test.com', plan: 'free' };
      const token = generateToken(user);
      const decoded = jwt.verify(token, 'test-secret-key');
      expect(decoded.id).toBe('user-id');
      expect(decoded.email).toBe('test@test.com');
      expect(decoded.plan).toBe('free');
    });
  });

  describe('generateRefreshToken', () => {
    it('should generate a refresh token', () => {
      const user = { id: 'user-id' };
      const token = generateRefreshToken(user);
      const decoded = jwt.verify(token, 'test-secret-key');
      expect(decoded.id).toBe('user-id');
      expect(decoded.type).toBe('refresh');
    });
  });
});
