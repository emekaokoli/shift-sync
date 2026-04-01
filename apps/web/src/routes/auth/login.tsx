import { Login } from '@/pages/auth';
import { createFileRoute, redirect } from '@tanstack/react-router';

function getStoredAuth() {
  try {
    const stored = localStorage.getItem('softsync-auth-storage');
    if (stored) {
      const parsed = JSON.parse(stored);
      return {
        accessToken: parsed.state?.accessToken ?? parsed.accessToken,
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
    if (stored?.accessToken) {
      throw redirect({
        to: '/',
      });
    }
  },
  component: Login,
})
