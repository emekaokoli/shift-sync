import { fetchApi } from "../client";

export interface NotificationResponse {
  notifications: unknown[];
  pagination: {
    limit: number;
    offset: number;
    total: number;
  };
}

export const notificationsApi = {
  getAll: (params?: { read?: boolean; limit?: number; offset?: number }) => {
    const searchParams = new URLSearchParams();
    if (params?.read !== undefined) searchParams.set("read", String(params.read));
    if (params?.limit) searchParams.set("limit", String(params.limit));
    if (params?.offset) searchParams.set("offset", String(params.offset));
    const query = searchParams.toString();
    return fetchApi<NotificationResponse>(`/api/v1/notifications${query ? `?${query}` : ""}`);
  },
  markAsRead: (id: string) => fetchApi<unknown>(`/api/v1/notifications/${id}/read`, { method: "PATCH" }),
  markAllAsRead: () => fetchApi<unknown>("/api/v1/notifications/read-all", { method: "PATCH" }),
};