import { useMarkAllNotificationsAsRead, useMarkNotificationAsRead, useNotifications } from "@/hooks/notifications";
import { useNotificationStore } from "@/lib/stores/notificationStore";
import { Bell } from "lucide-react";

interface NotificationItem {
  id: string;
  message: string;
  read: boolean;
  created_at?: string;
  createdAt?: string;
  [key: string]: unknown;
}

export function NotificationBell() {
  const { data, isLoading } = useNotifications({ limit: 20 });
  const markAsRead = useMarkNotificationAsRead();
  const markAllAsRead = useMarkAllNotificationsAsRead();
  const { markAsRead: markAsReadStore, notifications: storeNotifications } = useNotificationStore();

  const apiNotifications: NotificationItem[] = (data?.notifications as NotificationItem[]) || [];
  const storeNotifs = (storeNotifications as unknown as NotificationItem[]) || [];
  const allNotifications = apiNotifications.length > 0 ? apiNotifications : storeNotifs;
  
  const unreadCount = allNotifications.filter((n) => !n.read).length;

  const handleMarkAsRead = async (id: string) => {
    await markAsRead.mutateAsync(id);
    markAsReadStore(id);
  };

  const handleMarkAllAsRead = async () => {
    await markAllAsRead.mutateAsync();
    useNotificationStore.getState().markAllAsRead();
  };

  const getCreatedDate = (notification: NotificationItem) => {
    return notification.created_at || notification.createdAt || '';
  };

  return (
    <div className="relative group">
      <button className="relative p-2 rounded-full hover:bg-accent">
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      <div className="absolute right-0 top-full mt-2 w-80 bg-background border rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
        <div className="flex items-center justify-between p-3 border-b">
          <h3 className="font-semibold">Notifications</h3>
          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllAsRead}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              Mark all read
            </button>
          )}
        </div>

        <div className="max-h-80 overflow-y-auto">
          {isLoading ? (
            <div className="p-4 text-center text-muted-foreground">Loading...</div>
          ) : allNotifications.length === 0 ? (
            <div className="p-4 text-center text-muted-foreground">No notifications</div>
          ) : (
            allNotifications.map((notification) => (
              <div
                key={notification.id}
                className={`p-3 border-b hover:bg-accent/50 cursor-pointer ${
                  !notification.read ? "bg-accent/30" : ""
                }`}
                onClick={() => handleMarkAsRead(notification.id)}
              >
                <div className="flex items-start gap-2">
                  <div className="flex-1">
                    <p className="text-sm">{notification.message}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {getCreatedDate(notification) ? new Date(getCreatedDate(notification)).toLocaleString() : ''}
                    </p>
                  </div>
                  {!notification.read && (
                    <div className="w-2 h-2 rounded-full bg-blue-500" />
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}