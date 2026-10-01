import axios from 'axios';
import { useTenantStore } from '@/store/useAuthStore';

// Point directly to the Next.js rewrite we configured in next.config.mjs
// This avoids CORS issues and guarantees that HttpOnly cookies are passed properly!
const API_BASE_URL = typeof window !== 'undefined' ? '/api/proxy' : (process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3333');

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true, // Necessary for Better Auth cookies
});

apiClient.interceptors.request.use(
  (config) => {
    try {
      const currentTenantId = useTenantStore.getState().currentTenantId;
      if (currentTenantId) {
        config.headers['X-Active-Tenant-Id'] = currentTenantId;
      }
    } catch (e) {
      // Ignore errors if used outside browser context
    }
    return config;
  },
  (error) => Promise.reject(error)
);

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      if (typeof window !== 'undefined' && !window.location.pathname.includes('/login')) {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default apiClient;