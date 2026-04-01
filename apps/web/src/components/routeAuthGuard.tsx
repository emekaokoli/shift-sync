import { redirect } from '@tanstack/react-router';
import { useAuthStore } from '@/lib/stores/authStore';

function getStoredAuth() {
  try {
    const stored = localStorage.getItem('softsync-auth-storage');
    if (stored) {
      const parsed = JSON.parse(stored);
      return {
        isAuthenticated: !!parsed.state?.accessToken,
        accessTokenExpiresAt: parsed.state?.accessTokenExpiresAt,
        refreshToken: parsed.state?.refreshToken,
        refreshTokenExpiresAt: parsed.state?.refreshTokenExpiresAt,
        user: parsed.state?.user,
      };
    }
  } catch {
    return null;
  }
  return null;
}

export const authGuard = async ({ location }: { location: { pathname: string } }) => {
  const stored = getStoredAuth();

  if (!stored?.isAuthenticated) {
    throw redirect({
      to: '/auth/login',
      search: { redirect: location.pathname },
    });
  }

  const isAccessExpired = !stored.accessTokenExpiresAt || Date.now() >= stored.accessTokenExpiresAt;
  
  if (isAccessExpired) {
    if (stored.refreshToken && stored.refreshTokenExpiresAt && Date.now() < stored.refreshTokenExpiresAt) {
      try {
        const response = await fetch(`${import.meta.env.VITE_API_URL || "http://localhost:1964"}/api/v1/auth/refresh`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${stored.refreshToken}` },
        });
        
        if (response.ok) {
          const data = await response.json();
          if (data.data) {
            const { accessToken, refreshToken } = data.data;
            useAuthStore.getState().setTokens(accessToken, refreshToken);
          }
        } else {
          throw redirect({
            to: '/auth/login',
            search: { redirect: location.pathname },
          });
        }
      } catch {
        throw redirect({
          to: '/auth/login',
          search: { redirect: location.pathname },
        });
      }
    } else {
      throw redirect({
        to: '/auth/login',
        search: { redirect: location.pathname },
      });
    }
  }
};

export const roleGuard = (allowedRoles: string[]) => {
  return async () => {
    const stored = getStoredAuth();
    
    if (!stored?.isAuthenticated || !stored.user) {
      throw redirect({ to: '/auth/login' });
    }

    if (!allowedRoles.includes(stored.user.role)) {
      throw redirect({ to: '/unauthorized' });
    }
  };
};
