import { authGuard, roleGuard } from '@/components/routeAuthGuard';
import { PremiumAnalytics } from '@/pages/premium';
import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/(_authenticated)/premium')({
  beforeLoad: async () => {
    await authGuard({ location: { pathname: '/premium' } });
    await roleGuard(['ADMIN', 'MANAGER'])({ location: { pathname: '/premium' } });
  },
  component: PremiumAnalytics,
});