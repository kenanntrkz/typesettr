import api from './api'

export const adminAPI = {
  // Dashboard
  dashboard: () => api.get('/admin/dashboard'),
  stats: (period = '7d') => api.get(`/admin/stats/${period}`),

  // Users
  listUsers: (params) => api.get('/admin/users', { params }),
  getUser: (id) => api.get(`/admin/users/${id}`),
  updateUserRole: (id, role) => api.put(`/admin/users/${id}/role`, { role }),
  updateUserPlan: (id, plan) => api.put(`/admin/users/${id}/plan`, { plan }),
  toggleBan: (id, banned) => api.put(`/admin/users/${id}/ban`, { banned }),

  // Projects
  listProjects: (params) => api.get('/admin/projects', { params }),
  getProject: (id) => api.get(`/admin/projects/${id}`),
  deleteProject: (id) => api.delete(`/admin/projects/${id}`),

  // Audit Logs
  auditLogs: (params) => api.get('/admin/audit-logs', { params }),

  // Queue
  queueStats: () => api.get('/admin/queue/stats'),
  queueJobs: (params) => api.get('/admin/queue/jobs', { params }),
  retryJob: (jobId) => api.post(`/admin/queue/retry/${jobId}`),
  cleanQueue: (status) => api.post('/admin/queue/clean', { status }),

  // Settings
  getSettings: () => api.get('/admin/settings'),
  updateSetting: (key, value) => api.put('/admin/settings', { key, value }),

  // System
  systemHealth: () => api.get('/admin/system/health'),
}
