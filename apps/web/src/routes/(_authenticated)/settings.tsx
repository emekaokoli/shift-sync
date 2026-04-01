import { authGuard } from '@/components/routeAuthGuard';
import { NotificationSettings } from '@/pages/settings';
import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/(_authenticated)/settings')({
  beforeLoad: async () => {
    await authGuard({ location: { pathname: '/settings' } });
  },
  component: NotificationSettings,
});