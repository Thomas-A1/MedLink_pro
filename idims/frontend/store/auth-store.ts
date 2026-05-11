import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { User } from '@/lib/auth';

/**
 * SECURE AUTHENTICATION STORE
 * 
 * Uses cookies for tokens (HTTP-only, secure)
 * Only stores user data in localStorage (non-sensitive)
 * Tokens are NEVER stored in localStorage for security
 */
interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  setAuth: (user: User) => void;
  clearAuth: () => void;
  updateUser: (user: Partial<User>) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      isAuthenticated: false,
      // Only store user data - tokens are in secure HTTP-only cookies
      setAuth: (user) =>
        set({
          user,
          isAuthenticated: true,
        }),
      clearAuth: () =>
        set({
          user: null,
          isAuthenticated: false,
        }),
      updateUser: (updates) =>
        set((state) => ({
          user: state.user ? { ...state.user, ...updates } : null,
        })),
    }),
    {
      name: 'auth-storage',
      // Only persist user data, NOT tokens (tokens are in secure cookies)
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);

