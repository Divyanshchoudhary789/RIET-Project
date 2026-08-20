import React, { createContext, useCallback, useContext, useEffect, useReducer } from 'react';
import api from '../utils/api';
import { connectSocket, disconnectSocket } from '../utils/socket';
import { getDashboardPath } from '../utils/helpers';

export const AuthContext = createContext(null);

const initialState = {
  user: null,
  loading: true,
  mustChangePassword: false,
};

const reducer = (state, action) => {
  switch (action.type) {
    case 'READY':
      return { loading: false, user: action.user || null, mustChangePassword: action.user?.mustChangePassword || false };
    case 'LOGIN':
      return { loading: false, user: action.user, mustChangePassword: action.mustChangePassword || false };
    case 'LOGOUT':
      return { loading: false, user: null, mustChangePassword: false };
    default:
      return state;
  }
};

export const AuthProvider = ({ children }) => {
  const [state, dispatch] = useReducer(reducer, initialState);

  useEffect(() => {
    const init = async () => {
      const token = sessionStorage.getItem('accessToken');
      if (!token) {
        try {
          const r = await api.post('/api/auth/refresh-token', {});
          const { accessToken } = r.data.data;
          sessionStorage.setItem('accessToken', accessToken);
          const me = await api.get('/api/auth/me', { headers: { Authorization: `Bearer ${accessToken}` } });
          connectSocket(accessToken);
          dispatch({ type: 'READY', user: me.data.data });
        } catch {
          dispatch({ type: 'READY', user: null });
        }
        return;
      }
      try {
        const me = await api.get('/api/auth/me');
        connectSocket(token);
        dispatch({ type: 'READY', user: me.data.data });
      } catch {
        sessionStorage.removeItem('accessToken');
        dispatch({ type: 'READY', user: null });
      }
    };
    init();
  }, []);

  const login = useCallback(async (email, password) => {
    const r = await api.post('/api/auth/login', { email: email.trim().toLowerCase(), password });
    const { user, accessToken, mustChangePassword } = r.data.data;
    sessionStorage.setItem('accessToken', accessToken);
    connectSocket(accessToken);
    dispatch({ type: 'LOGIN', user, mustChangePassword });
    return { user, mustChangePassword };
  }, []);

  const logout = useCallback(async () => {
    try { await api.post('/api/auth/logout'); } catch { /* ignore */ }
    sessionStorage.removeItem('accessToken');
    disconnectSocket();
    dispatch({ type: 'LOGOUT' });
  }, []);

  const changePassword = useCallback(async (currentPassword, newPassword, confirmPassword) => {
    await api.post('/api/auth/change-password', { currentPassword, newPassword, confirmPassword });
    sessionStorage.removeItem('accessToken');
    dispatch({ type: 'LOGOUT' });
  }, []);

  const forgotPassword = useCallback(async (email) => {
    await api.post('/api/auth/forgot-password', { email: email.trim().toLowerCase() });
  }, []);

  const resetPassword = useCallback(async (email, otp, newPassword, confirmPassword) => {
    await api.post('/api/auth/reset-password', { email: email.trim().toLowerCase(), otp, newPassword, confirmPassword });
  }, []);

  return (
    <AuthContext.Provider value={{ ...state, login, logout, changePassword, forgotPassword, resetPassword, getDashboardPath }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
