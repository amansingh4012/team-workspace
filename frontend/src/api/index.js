import api from './axios';

// ── Auth ──
export const login = (data) => api.post('/auth/login', data);
export const register = (data) => api.post('/auth/register', data);
export const getMe = () => api.get('/auth/me');

// ── Projects ──
export const getProjects = () => api.get('/projects');
export const getProject = (id) => api.get(`/projects/${id}`);
export const createProject = (data) => api.post('/projects', data);
export const updateProject = (id, data) => api.put(`/projects/${id}`, data);
export const deleteProject = (id) => api.delete(`/projects/${id}`);
export const addProjectMember = (id, data) => api.post(`/projects/${id}/members`, data);
export const removeProjectMember = (projectId, userId) =>
  api.delete(`/projects/${projectId}/members/${userId}`);

// ── Tasks ──
export const getMyTasks = () => api.get('/tasks/mine');
export const getTasks = (projectId, params) =>
  api.get(`/projects/${projectId}/tasks`, { params });
export const getTask = (projectId, taskId) =>
  api.get(`/projects/${projectId}/tasks/${taskId}`);
export const createTask = (projectId, data) =>
  api.post(`/projects/${projectId}/tasks`, data);
export const updateTask = (projectId, taskId, data) =>
  api.put(`/projects/${projectId}/tasks/${taskId}`, data);
export const deleteTask = (projectId, taskId) =>
  api.delete(`/projects/${projectId}/tasks/${taskId}`);
export const reorderTasks = (projectId, tasks) =>
  api.put(`/projects/${projectId}/tasks/reorder`, { tasks });
export const uploadAttachment = (projectId, taskId, file) => {
  const form = new FormData();
  form.append('file', file);
  return api.post(`/projects/${projectId}/tasks/${taskId}/attachment`, form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
};

// ── Activities ──
export const getActivities = (projectId, params) =>
  api.get(`/projects/${projectId}/activities`, { params });

// ── Analytics ──
export const getProjectAnalytics = (projectId) =>
  api.get(`/projects/${projectId}/analytics`);
