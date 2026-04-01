import type { User } from '@shift-sync/shared';
import type { QueryClient } from '@tanstack/react-query';

export interface RouterContext {
  auth: {
    user: User | null;
    isAuthenticated: boolean;
  };
  queryClient: QueryClient;
}
