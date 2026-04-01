import { authGuard, roleGuard } from '@/components/routeAuthGuard';
import { FairnessAnalytics } from '@/pages/analytics';
import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/(_authenticated)/analytics')({
  beforeLoad: async () => {
    await authGuard({ location: { pathname: '/analytics' } });
    await roleGuard(['ADMIN', 'MANAGER'])({ location: { pathname: '/analytics' } });
  },
  component: FairnessAnalytics,
});