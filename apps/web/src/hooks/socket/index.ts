import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect } from 'react';
import { socketClient } from '../../api/socket';
import { useAuthStore, useNotificationStore } from '../../lib/stores';
import { showInfo, showSuccess } from '../../lib/toast';

export function useSocketSync() {
  const { user, accessToken: token } = useAuthStore();
  const queryClient = useQueryClient();

  const handleShiftCreated = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['shifts'] });
    showInfo('New shift created', 'A new shift has been added to the schedule');
  }, [queryClient]);

  const handleShiftUpdated = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['shifts'] });
    showInfo('Shift updated', 'A shift has been modified');
  }, [queryClient]);

  const handleShiftDeleted = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['shifts'] });
    showInfo('Shift deleted', 'A shift has been removed from the schedule');
  }, [queryClient]);

  const handleAssignmentCreated = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['shifts'] });
    showInfo('New shift assigned', "You've been assigned to a new shift");
  }, [queryClient]);

  const handleAssignmentRemoved = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['shifts'] });
    showInfo('Shift unassigned', "You've been removed from a shift");
  }, [queryClient]);

  const handleSwapRequested = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['swaps'] });
    showInfo('New swap request', 'You have a new swap request to review');
  }, [queryClient]);

  const handleSwapApproved = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['swaps'] });
    showSuccess('Swap approved', 'Your swap request has been approved');
  }, [queryClient]);

  const handleSwapRejected = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['swaps'] });
    showInfo('Swap rejected', 'Your swap request was not approved');
  }, [queryClient]);

  const handleSwapCancelled = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['swaps'] });
    showInfo('Swap cancelled', 'A swap request has been cancelled');
  }, [queryClient]);

  const handleNotification = useCallback(
    (data: unknown) => {
      const notification = data as {
        id?: string;
        type?: string;
        message?: string;
        data?: Record<string, unknown>;
        createdAt?: string;
      };
      if (notification && notification.message) {
        useNotificationStore.getState().addNotification({
          id: notification.id || crypto.randomUUID(),
          type: notification.type || 'info',
          message: notification.message,
          read: false,
          data: notification.data,
          createdAt: notification.createdAt || new Date().toISOString(),
        });
      }
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
    [queryClient],
  );

  useEffect(() => {
    if (token && user) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const locations = user.locations?.map((l: any) => l.id) || [];
      socketClient.connect(token, user.id, locations);
      socketClient.subscribeToSwaps();

      socketClient.onShiftCreated(handleShiftCreated);
      socketClient.onShiftUpdated(handleShiftUpdated);
      socketClient.onShiftDeleted(handleShiftDeleted);
      socketClient.onAssignmentCreated(handleAssignmentCreated);
      socketClient.onAssignmentRemoved(handleAssignmentRemoved);
      socketClient.onShiftPublished(handleShiftUpdated);
      socketClient.onSwapRequested(handleSwapRequested);
      socketClient.onSwapApproved(handleSwapApproved);
      socketClient.onSwapRejected(handleSwapRejected);
      socketClient.onSwapCancelled(handleSwapCancelled);
      socketClient.onNotification(handleNotification);
    }

    return () => {
      socketClient.removeAllListeners();
    };
  }, [
    token,
    user,
    handleShiftCreated,
    handleShiftUpdated,
    handleShiftDeleted,
    handleAssignmentCreated,
    handleAssignmentRemoved,
    handleSwapRequested,
    handleSwapApproved,
    handleSwapRejected,
    handleSwapCancelled,
    handleNotification,
  ]);
}
