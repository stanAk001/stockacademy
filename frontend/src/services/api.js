import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || '/api';

const api = axios.create({
  baseURL: API_URL,
  withCredentials: true, // still send the cookie where the browser allows it
});

// Safari/iOS — and Chrome's third-party-cookie phase-out — block the cross-site
// auth cookie when the frontend (Vercel) and backend (Render) live on different
// domains. So we ALSO send the token as an Authorization: Bearer header, which
// the backend accepts (it checks the header before the cookie). This makes auth
// work on every browser, iPhone included. AuthContext saves the token on
// login / signup / Google sign-in.
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('auth_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export default api;
