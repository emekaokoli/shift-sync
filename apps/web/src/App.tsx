import { useAuthStore } from '@/lib/stores';
import { RouterProvider } from '@tanstack/react-router';
import { queryClient, router } from './main';
import { NavigationTracker } from '@/components/NavigationTracker';

function AppContent() {
  const user = useAuthStore((state) => state.user);
  
  return (
    <>
      <NavigationTracker />
      <RouterProvider
        router={router}
        context={{
          auth: { user },
          queryClient,
        }}
        defaultPreload="intent"
      />
    </>
  );
}

export default AppContent;