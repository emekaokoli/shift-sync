import { useEffect, useRef } from 'react';

export function NavigationTracker() {
  const prevPathRef = useRef<string | null>(null);

  useEffect(() => {
    const handleLocationChange = () => {
      const currentPath = window.location.pathname;
      const prevPath = prevPathRef.current;

      if (currentPath !== prevPath && prevPath) {
        sessionStorage.setItem('shiftsync-referrer', prevPath);
      }

      prevPathRef.current = currentPath;
    };

    handleLocationChange();

    const originalPushState = window.history.pushState;
    const originalReplaceState = window.history.replaceState;

    window.history.pushState = function(...args) {
      originalPushState.apply(window.history, args);
      handleLocationChange();
    };

    window.history.replaceState = function(...args) {
      originalReplaceState.apply(window.history, args);
      handleLocationChange();
    };

    window.addEventListener('popstate', handleLocationChange);

    return () => {
      window.removeEventListener('popstate', handleLocationChange);
      window.history.pushState = originalPushState;
      window.history.replaceState = originalReplaceState;
    };
  }, []);

  return null;
}