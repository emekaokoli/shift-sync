import { io, Socket } from 'socket.io-client';
import {
  useNotificationStore,
  type Notification,
} from '../lib/stores/notificationStore';

const SOCKET_URL =
  import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:1964';

class SocketClient {
  private socket: Socket | null = null;

  connect(token: string, userId: string, locations: string[] = []) {
    if (this.socket?.connected) {
      return;
    }

    this.socket = io(SOCKET_URL, {
      auth: { token },
      transports: ['websocket', 'polling'],
    });

    this.socket.on('connect', () => {
      console.log('Socket connected');
      this.socket?.emit('auth', { userId, locations });
    });

    this.socket.on('disconnect', () => {
      console.log('Socket disconnected');
    });

    this.socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
    });
  }

  disconnect() {
    this.socket?.disconnect();
    this.socket = null;
  }

  subscribeToShifts(locationId: string) {
    this.socket?.emit('subscribe:shifts', locationId);
  }

  unsubscribeFromShifts(locationId: string) {
    this.socket?.emit('unsubscribe:shifts', locationId);
  }

  subscribeToSwaps() {
    this.socket?.emit('subscribe:swaps');
  }

  onShiftCreated(callback: (data: unknown) => void) {
    this.socket?.on('shift:created', callback);
  }

  onShiftUpdated(callback: (data: unknown) => void) {
    this.socket?.on('shift:updated', callback);
  }

  onShiftDeleted(callback: (data: unknown) => void) {
    this.socket?.on('shift:deleted', callback);
  }

  onAssignmentCreated(callback: (data: unknown) => void) {
    this.socket?.on('assignment:created', callback);
  }

  onAssignmentRemoved(callback: (data: unknown) => void) {
    this.socket?.on('assignment:removed', callback);
  }

  onSwapRequested(callback: (data: unknown) => void) {
    this.socket?.on('swap:requested', callback);
  }

  onSwapApproved(callback: (data: unknown) => void) {
    this.socket?.on('swap:approved', callback);
  }

  onSwapRejected(callback: (data: unknown) => void) {
    this.socket?.on('swap:rejected', callback);
  }

  onSwapCancelled(callback: (data: unknown) => void) {
    this.socket?.on('swap:cancelled', callback);
  }

  onNotification(callback: (data: Notification) => void) {
    this.socket?.on('notification', (data: Notification) => {
      useNotificationStore.getState().addNotification({
        id: data.id || crypto.randomUUID(),
        type: data.type || 'info',
        message: data.message,
        read: false,
        data: data.data,
        createdAt: data.createdAt || new Date().toISOString(),
      });
      callback(data);
    });
  }

  removeAllListeners() {
    this.socket?.removeAllListeners();
  }

  get isConnected() {
    return this.socket?.connected ?? false;
  }
}

export const socketClient = new SocketClient();
