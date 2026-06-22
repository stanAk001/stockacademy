import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import api from '../services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Session lives in an httpOnly cookie — ask the server who we are.
  const fetchMe = useCallback(async () => {
    try {
      const { data } = await api.get('/auth/me');
      setUser(data.user);
    } catch (err) {
      setUser(null);
      // Token invalid/expired → drop it so we don't keep sending a dead one.
      if (err?.response?.status === 401) localStorage.removeItem('auth_token');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMe();
  }, [fetchMe]);

  const login = async ({ identifier, password }) => {
    const { data } = await api.post('/auth/login', { identifier, password });
    if (data.success) {
      if (data.token) localStorage.setItem('auth_token', data.token);
      setUser(data.user);
    }
    return data;
  };

  const signup = async (payload) => {
    const { data } = await api.post('/auth/signup', payload);
    if (data.success) {
      if (data.token) localStorage.setItem('auth_token', data.token);
      setUser(data.user);
    }
    return data;
  };

  const googleLogin = async (credential) => {
    const { data } = await api.post('/auth/google', { credential });
    if (data.success) {
      if (data.token) localStorage.setItem('auth_token', data.token);
      setUser(data.user);
    }
    return data;
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('auth_token');
    api.post('/auth/logout').catch(() => {});
  };

  const refreshUser = fetchMe;

  return (
    <AuthContext.Provider value={{ user, setUser, loading, login, signup, googleLogin, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
};
