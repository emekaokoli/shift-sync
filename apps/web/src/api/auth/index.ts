import type { User } from '@shift-sync/shared';
import { fetchApi } from '../client';

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export const authApi = {
  login: (email: string, password: string) =>
    fetchApi<AuthTokens & { user: User }>('/api/v1/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),
  register: (data: {
    email: string;
    password: string;
    name: string;
    role?: 'ADMIN' | 'MANAGER' | 'STAFF';
    timezone?: string;
    desiredHours?: number;
  }) =>
    fetchApi<AuthTokens & { user: User }>('/api/v1/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  refresh: (refreshToken: string) =>
    fetchApi<AuthTokens>('/api/v1/auth/refresh', {
      method: 'POST',
      headers: { Authorization: `Bearer ${refreshToken}` },
    }),
  me: () => fetchApi<User>('/api/v1/auth/me'),
};
