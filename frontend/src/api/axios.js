import axios from 'axios';
import toast from 'react-hot-toast';
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

    // ── Queue mutations (POST/PUT/DELETE) when offline — return optimistic response ──
    if (isNetworkError && config.method && config.method !== 'get') {
      await queueMutation(config);
      toast('You are offline — change saved locally and will sync when back online', {
        icon: '📴',
        style: { background: '#1f2937', color: '#e5e7eb', border: '1px solid #374151' },
        duration: 3000,
      });

      // Return a synthetic success response so the calling code doesn't error out.
      // This lets optimistic UI updates work (the real API call will be replayed later).
      const fakeData = config.data ? JSON.parse(config.data || '{}') : {};
      return {
        data: {
          success: true,
          _offline: true,
          // If the caller expects an entity, echo back what was sent
          task: fakeData,
          project: fakeData,
          member: fakeData,
        },
        status: 200,
        statusText: 'OK (queued offline)',
        config,
        headers: {},
      };
    }

    return Promise.reject(error);
  }
);

export default api;
