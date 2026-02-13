// Project Service Tests
const projectService = require('../services/project.service');

jest.mock('../models', () => ({
  getModels: jest.fn()
}));
jest.mock('../utils/logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn()
}));

const { getModels } = require('../models');

describe('Project Service', () => {
  let mockProject, mockUser;

  beforeEach(() => {
    jest.clearAllMocks();
    mockProject = {
      id: 'proj-uuid',
      user_id: 'user-uuid',
      name: 'Test Project',
      status: 'pending',
      progress: 0,
      toJSON: jest.fn(function () { return { ...this } }),
      save: jest.fn(),
      destroy: jest.fn()
    };
    mockUser = {
      id: 'user-uuid',
      plan: 'free'
    };
  });

  describe('createProject', () => {
    it('should enforce free plan limit of 3 projects', async () => {
      getModels.mockReturnValue({
        Project: {
          count: jest.fn(() => 3),
          create: jest.fn()
        },
        User: {
          findByPk: jest.fn(() => ({ plan: 'free' })),
          increment: jest.fn()
        }
      });

      await expect(
        projectService.createProject('user-uuid', { name: 'New Project', settings: {} })
      ).rejects.toThrow('Free plan limit');
    });

    it('should allow pro plan users unlimited projects', async () => {
      getModels.mockReturnValue({
        Project: {
          count: jest.fn(() => 10),
          create: jest.fn(() => mockProject)
        },
        User: {
          findByPk: jest.fn(() => ({ plan: 'pro' })),
          increment: jest.fn()
        }
      });

      const result = await projectService.createProject('user-uuid', { name: 'New Project', settings: {} });
      expect(result).toBeDefined();
    });

    it('should strip HTML from project name', async () => {
      const createMock = jest.fn(() => mockProject);
      getModels.mockReturnValue({
        Project: { count: jest.fn(() => 0), create: createMock },
        User: { findByPk: jest.fn(() => ({ plan: 'free' })), increment: jest.fn() }
      });

      await projectService.createProject('user-uuid', {
        name: '<script>alert("xss")</script>My Book',
        settings: {}
      });

      const calledWith = createMock.mock.calls[0][0];
      expect(calledWith.name).not.toContain('<script>');
      expect(calledWith.name).toContain('My Book');
    });

    it('should merge settings with defaults', async () => {
      const createMock = jest.fn(() => mockProject);
      getModels.mockReturnValue({
        Project: { count: jest.fn(() => 0), create: createMock },
        User: { findByPk: jest.fn(() => ({ plan: 'free' })), increment: jest.fn() }
      });

      await projectService.createProject('user-uuid', {
        name: 'Book',
        settings: { pageSize: 'a4paper', fontFamily: 'palatino' }
      });

      const calledWith = createMock.mock.calls[0][0];
      expect(calledWith.settings.pageSize).toBe('a4paper');
      expect(calledWith.settings.fontFamily).toBe('palatino');
      expect(calledWith.settings.lineSpacing).toBe(1.15); // default preserved
    });
  });

  describe('getProject', () => {
    it('should throw 404 for non-existing project', async () => {
      getModels.mockReturnValue({
        Project: { findOne: jest.fn(() => null) },
        File: {},
        ProcessingLog: {}
      });

      await expect(
        projectService.getProject('bad-id', 'user-uuid')
      ).rejects.toThrow('Project not found');
    });
  });

  describe('deleteProject', () => {
    it('should throw 404 for non-existing project', async () => {
      getModels.mockReturnValue({
        Project: { findOne: jest.fn(() => null) },
        User: { decrement: jest.fn() }
      });

      await expect(
        projectService.deleteProject('bad-id', 'user-uuid')
      ).rejects.toThrow('Project not found');
    });

    it('should delete project and decrement count', async () => {
      const decrementMock = jest.fn();
      getModels.mockReturnValue({
        Project: { findOne: jest.fn(() => mockProject) },
        User: { decrement: decrementMock }
      });

      const result = await projectService.deleteProject('proj-uuid', 'user-uuid');
      expect(result.success).toBe(true);
      expect(mockProject.destroy).toHaveBeenCalled();
      expect(decrementMock).toHaveBeenCalled();
    });
  });

  describe('updateProjectStatus', () => {
    it('should only allow whitelisted fields', async () => {
      getModels.mockReturnValue({
        Project: { findByPk: jest.fn(() => mockProject) }
      });

      await projectService.updateProjectStatus('proj-uuid', {
        status: 'completed',
        progress: 100,
        user_id: 'hacker-uuid', // should NOT be applied
        name: 'Hacked Name'     // should NOT be applied
      });

      expect(mockProject.status).toBe('completed');
      expect(mockProject.progress).toBe(100);
      expect(mockProject.user_id).toBe('user-uuid'); // unchanged
      expect(mockProject.name).toBe('Test Project');   // unchanged
      expect(mockProject.save).toHaveBeenCalled();
    });

    it('should return null for non-existing project', async () => {
      getModels.mockReturnValue({
        Project: { findByPk: jest.fn(() => null) }
      });

      const result = await projectService.updateProjectStatus('bad-id', { status: 'completed' });
      expect(result).toBeNull();
    });
  });
});
