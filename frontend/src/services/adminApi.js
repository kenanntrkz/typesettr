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

  // System
  systemHealth: () => api.get('/admin/system/health'),
}
