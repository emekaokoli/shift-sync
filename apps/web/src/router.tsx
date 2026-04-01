import { createRouter as createTanStackRouter } from '@tanstack/react-router';
import type { QueryClient } from '@tanstack/react-query';
import type { User } from '@shift-sync/shared';
import { routeTree } from './routeTree.gen';

export interface RouterContext {
  queryClient: QueryClient;
  auth: {
    user: User | null;
    isAuthenticated: boolean;
  };
}

export function createRouter(queryClient: QueryClient) {
  const router = createTanStackRouter({
    routeTree,
    defaultPreload: 'intent',
    defaultPreloadStaleTime: 0,
    context: {
      queryClient,
      auth: {
        user: null,
        isAuthenticated: false,
      },
    },
  });

  return router;
}

declare module '@tanstack/react-router' {
  interface Register {
    router: ReturnType<typeof createRouter>;
  }
}