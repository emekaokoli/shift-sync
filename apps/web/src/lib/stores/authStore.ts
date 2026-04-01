import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User } from '@shift-sync/shared';

const ACCESS_TOKEN_EXPIRY_MS = 5 * 60 * 1000; // 5 minutes
const REFRESH_TOKEN_EXPIRY_MS = 2 * 60 * 60 * 1000; // 2 hours

interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  accessTokenExpiresAt: number | null;
  refreshTokenExpiresAt: number | null;
  isAuthenticated: boolean;
  setAuth: (user: User, accessToken: string, refreshToken: string) => void;
  setTokens: (accessToken: string, refreshToken: string) => void;
  logout: () => void;
  isAccessTokenExpired: () => boolean;
  isRefreshTokenExpired: () => boolean;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      accessTokenExpiresAt: null,
      refreshTokenExpiresAt: null,
      isAuthenticated: false,
      setAuth: (user, accessToken, refreshToken) => {
        const accessTokenExpiresAt = Date.now() + ACCESS_TOKEN_EXPIRY_MS;
        const refreshTokenExpiresAt = Date.now() + REFRESH_TOKEN_EXPIRY_MS;
        set({
          user,
          accessToken,
          refreshToken,
          accessTokenExpiresAt,
          refreshTokenExpiresAt,
          isAuthenticated: true,
        });
      },
      setTokens: (accessToken, refreshToken) => {
        const accessTokenExpiresAt = Date.now() + ACCESS_TOKEN_EXPIRY_MS;
        const refreshTokenExpiresAt = Date.now() + REFRESH_TOKEN_EXPIRY_MS;
        set({
          accessToken,
          refreshToken,
          accessTokenExpiresAt,
          refreshTokenExpiresAt,
        });
      },
      logout: () => {
        set({
          user: null,
          accessToken: null,
          refreshToken: null,
          accessTokenExpiresAt: null,
          refreshTokenExpiresAt: null,
          isAuthenticated: false,
        });
      },
      isAccessTokenExpired: () => {
        const { accessTokenExpiresAt } = get();
        if (!accessTokenExpiresAt) return true;
        return Date.now() >= accessTokenExpiresAt;
      },
      isRefreshTokenExpired: () => {
        const { refreshTokenExpiresAt } = get();
        if (!refreshTokenExpiresAt) return true;
        return Date.now() >= refreshTokenExpiresAt;
      },
    }),
    {
      name: 'softsync-auth-storage',
      partialize: (state) => ({
        user: state.user,
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        accessTokenExpiresAt: state.accessTokenExpiresAt,
        refreshTokenExpiresAt: state.refreshTokenExpiresAt,
      }),
    },
  ),
);
