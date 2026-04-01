import { authGuard, roleGuard } from '@/components/routeAuthGuard';
import { CurrentShifts } from '@/pages/now';
import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/(_authenticated)/now')({
  beforeLoad: async () => {
    await authGuard({ location: { pathname: '/now' } });
  },
  component: CurrentShifts,
});
