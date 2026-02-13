import axios from 'axios'

const API_URL = import.meta.env.VITE_API_URL || 'http://91.99.207.148:3100/api'

const api = axios.create({
  baseURL: API_URL,
  timeout: 30000,
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

export const authAPI = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
  profile: () => api.get('/auth/profile'),
  updateProfile: (data) => api.put('/auth/profile', data),
}

export const projectAPI = {
  list: () => api.get('/projects'),
  get: (id) => api.get('/projects/' + id),
  create: (data) => api.post('/projects', data),
  delete: (id) => api.delete('/projects/' + id),
  downloadPdf: (id) => api.get('/projects/' + id + '/download/pdf'),
  downloadLatex: (id) => api.get('/projects/' + id + '/download/latex'),
}

export const fileAPI = {
  upload: (file, onProgress) => { const fd = new FormData(); fd.append('file', file); return api.post('/files/upload', fd, { headers: { 'Content-Type': 'multipart/form-data' }, onUploadProgress: (e) => { if (onProgress && e.total) onProgress(Math.round((e.loaded * 100) / e.total)) } }) },
}

export const typesetAPI = {
  start: (projectId) => api.post('/typeset/start', { projectId }),
  status: (jobId) => api.get('/typeset/' + jobId + '/status'),
  retry: (projectId) => api.post('/typeset/retry/' + projectId),
}

export default api
