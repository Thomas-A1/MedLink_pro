import { apiClient } from './apiClient';

const storageKey = 'healthconnect-auth';

const persist = (payload: any) => {
  localStorage.setItem('accessToken', payload.accessToken);
  localStorage.setItem('refreshToken', payload.refreshToken);
  localStorage.setItem(storageKey, JSON.stringify(payload.user));
};

export const authService = {
  login: async (identifier: string, password: string) => {
    const { data } = await apiClient.post('/auth/login', { identifier, password });
    persist(data);
    return data;
  },
  requestPasswordReset: async (email: string) => {
    const { data } = await apiClient.post('/auth/forgot-password', { email });
    return data;
  },
  resetPassword: async (code: string, password: string) => {
    const { data } = await apiClient.post('/auth/reset-password', { code, password });
    return data;
  },
  changePassword: async (currentPassword: string, newPassword: string) => {
    const { data } = await apiClient.post('/auth/change-password', { currentPassword, newPassword });
    return data;
  },
  logout: () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem(storageKey);
  },
  bootstrap: async () => {
    const accessToken = localStorage.getItem('accessToken');
    const refreshToken = localStorage.getItem('refreshToken');
    const userRaw = localStorage.getItem(storageKey);
    if (!accessToken || !userRaw) {
      return null;
    }

    return {
      accessToken,
      refreshToken,
      user: JSON.parse(userRaw),
    };
  },
};
