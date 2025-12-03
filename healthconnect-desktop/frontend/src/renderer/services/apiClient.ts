import axios from 'axios';
import type { Store } from '@reduxjs/toolkit';

function computeBaseUrl(): string {
  // Priority 1: explicit env
  const envBase = import.meta.env.VITE_API_BASE_URL as string | undefined;
  if (envBase && typeof envBase === 'string' && envBase.trim().length > 0) {
    return envBase;
  }
  // Priority 2: local dev defaults
  if (typeof window !== 'undefined' && window.location?.hostname === 'localhost') {
    return 'http://localhost:4000/api';
  }
  // Priority 3: relative path (when behind reverse proxy)
  return '/api';
}

export const apiClient = axios.create({
  baseURL: computeBaseUrl(),
  timeout: 20000,
});

// Store instance set after initialization to avoid circular dependency
let storeInstance: Store<any> | null = null;

// Function to register the store after it's created
export const registerStore = (store: Store<any>) => {
  storeInstance = store;
};

apiClient.interceptors.request.use((config) => {
  // Try to get token from Redux store first (most up-to-date), then localStorage
  let token: string | null = null;
  
  try {
    if (storeInstance) {
      const state = storeInstance.getState();
      token = state?.auth?.accessToken || null;
    }
  } catch (err) {
    // Store access failed, will fall back to localStorage
  }
  
  // Fallback to localStorage if no token from store
  if (!token) {
    token = localStorage.getItem('accessToken');
  }
  
  if (token) {
    config.headers = {
      ...config.headers,
      Authorization: `Bearer ${token}`,
    };
  } else {
    // Allow unauthenticated endpoints (login, password reset) to proceed without noise
  }
  
  return config;
}, (error) => {
  return Promise.reject(error);
});

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    // Surface backend error message when available
    if (error.response?.data?.message) {
      error.message =
        Array.isArray(error.response.data.message)
          ? error.response.data.message.join(', ')
          : error.response.data.message;
    }
    if (error.response?.status === 401 && !originalRequest._retry) {
      // Clear tokens on 401
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('healthconnect-auth');
      
      // Redirect to login if not already there
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  },
);
