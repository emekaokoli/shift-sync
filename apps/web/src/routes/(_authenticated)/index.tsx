import { Home } from '@/pages'
import { createFileRoute } from '@tanstack/react-router'
import { authGuard } from '@/components/routeAuthGuard';

export const Route = createFileRoute('/(_authenticated)/')({
  beforeLoad: authGuard,
  component: Home,
})
