import type { RouterContext } from '@/components/router-types';
import { Root } from '@/pages/root';
import { createRootRouteWithContext } from '@tanstack/react-router';


export const Route = createRootRouteWithContext<RouterContext>()({
  component: Root
})