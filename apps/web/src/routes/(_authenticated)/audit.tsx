import { authGuard, roleGuard } from '@/components/routeAuthGuard';
import { AuditLogViewer } from '@/pages/audit';
import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/(_authenticated)/audit')({
  beforeLoad: async () => {
    await authGuard({ location: { pathname: '/audit' } });
    await roleGuard(['ADMIN', 'MANAGER'])({ location: { pathname: '/audit' } });
  },
  component: AuditLogViewer,
});
