import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || '/api';

const api = axios.create({
  baseURL: API_URL,
  withCredentials: true,
});

// Attach token on every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// On 401, clear token
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      // Only kick out of protected pages, not during login/signup attempts
      const url = err.config?.url || '';
      if (!url.includes('/auth/login') && !url.includes('/auth/signup') && !url.includes('/auth/google')) {
        localStorage.removeItem('token');
      }
    }
    return Promise.reject(err);
  }
);

export default api;
