import axios from 'axios';
import { cacheResponse, getCachedResponse, queueMutation } from '../utils/offlineCache';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// ── Request interceptor: attach Bearer token ──
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ── Response interceptor: cache GETs + handle 401 + offline fallback ──
api.interceptors.response.use(
  async (response) => {
    // Cache successful GET responses in IndexedDB
    if (response.config.method === 'get') {
      cacheResponse(response.config, response.data);
    }
    return response;
  },
  async (error) => {
    const config = error.config || {};
    const isNetworkError = !error.response && error.message !== 'canceled';

    // ── Handle 401 ──
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      if (
        !window.location.pathname.startsWith('/login') &&
        !window.location.pathname.startsWith('/register')
      ) {
        window.location.href = '/login';
      }
      return Promise.reject(error);
    }

    // ── Offline fallback for GET requests ──
    if (isNetworkError && config.method === 'get') {
      const cached = await getCachedResponse(config);
      if (cached) {
        return { data: cached, status: 200, statusText: 'OK (from cache)', config, headers: {} };
      }
    }

    // ── Queue mutations (POST/PUT/DELETE) when offline ──
    if (isNetworkError && config.method && config.method !== 'get') {
      await queueMutation(config);
    }

    return Promise.reject(error);
  }
);

export default api;
