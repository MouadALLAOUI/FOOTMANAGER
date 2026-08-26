import axios from 'axios';

import { queryClient } from './queryClient';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  headers: {
    Accept: 'application/json',
  },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('auth_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

const AUTH_REDIRECT_KEY = 'auth_redirect';

api.interceptors.response.use(
  (res) => res,
  (error) => {
    const url = error.config?.url || '';
    const isAuthCall = url.includes('/login') || url.includes('/register');
    if (error.response?.status === 401 && !isAuthCall) {
      localStorage.removeItem('auth_token');
      localStorage.removeItem('auth_user');
      try {
        queryClient.clear();
      } catch {}
      if (!window.location.pathname.startsWith('/login')) {
        sessionStorage.setItem(AUTH_REDIRECT_KEY, window.location.pathname + window.location.search);
        window.location.href = '/login';
      }
    }
    if (error.response?.status === 403 && error.response?.data?.activity_locked) {
      try {
        const { toast } = require('../components/ui/Toast/toastStore');
        toast.error(error.response.data.message || 'تم تقييد نشاط حسابك');
      } catch {}
    }
    return Promise.reject(error);
  },
);

export function takeAuthRedirect() {
  const target = sessionStorage.getItem(AUTH_REDIRECT_KEY);
  if (target) sessionStorage.removeItem(AUTH_REDIRECT_KEY);
  return target;
}

export default api;
