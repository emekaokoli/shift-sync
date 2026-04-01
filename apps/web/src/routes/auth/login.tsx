import { Login } from '@/pages/auth';
import { createFileRoute, redirect } from '@tanstack/react-router';

function getStoredAuth() {
  try {
    const stored = localStorage.getItem('softsync-auth-storage');
    if (stored) {
      const parsed = JSON.parse(stored);
      return {
        accessToken: parsed.state?.accessToken ?? parsed.accessToken,
        accessTokenExpiresAt:
          parsed.state?.accessTokenExpiresAt ?? parsed.accessTokenExpiresAt,
        refreshToken: parsed.state?.refreshToken ?? parsed.refreshToken,
        refreshTokenExpiresAt:
          parsed.state?.refreshTokenExpiresAt ?? parsed.refreshTokenExpiresAt,
        user: parsed.state?.user ?? parsed.user,
      };
    }
  } catch {
    return null;
  }
  return null;
}

export const Route = createFileRoute('/auth/login')({
  beforeLoad: async () => {
    const stored = getStoredAuth();
    const hasValidAccessToken =
      !!stored?.accessToken &&
      !!stored?.accessTokenExpiresAt &&
      Date.now() < stored.accessTokenExpiresAt;
    const hasValidRefreshToken =
      !!stored?.refreshToken &&
      !!stored?.refreshTokenExpiresAt &&
      Date.now() < stored.refreshTokenExpiresAt;

    if (hasValidAccessToken || hasValidRefreshToken) {
      throw redirect({
        to: '/',
      });
    }
  },
  component: Login,
})
