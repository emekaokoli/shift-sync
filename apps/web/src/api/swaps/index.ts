import { fetchApi } from "../client";

export const swapsApi = {
  getAll: (params?: {
    status?: string;
    userId?: string;
    shiftId?: string;
  }) => {
    const searchParams = new URLSearchParams();
    if (params?.status) searchParams.set("status", params.status);
    if (params?.userId) searchParams.set("userId", params.userId);
    if (params?.shiftId) searchParams.set("shiftId", params.shiftId);
    const query = searchParams.toString();
    return fetchApi<unknown[]>(`/api/v1/swaps${query ? `?${query}` : ""}`);
  },

  create: (data: { shiftId: string; targetId?: string }) =>
    fetchApi<unknown>("/api/v1/swaps", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  respond: (id: string, action: string) =>
    fetchApi<unknown>(`/api/v1/swaps/${id}/respond`, {
      method: "POST",
      body: JSON.stringify({ swapId: id, action }),
    }),

  cancel: (id: string) =>
    fetchApi<unknown>(`/api/v1/swaps/${id}`, { method: "DELETE" }),
};