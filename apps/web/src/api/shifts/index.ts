import { fetchApi } from "../client";

export const shiftsApi = {
  getAll: (params?: {
    locationId?: string;
    status?: string;
    startDate?: string;
    endDate?: string;
  }) => {
    const searchParams = new URLSearchParams();
    if (params?.locationId) searchParams.set("locationId", params.locationId);
    if (params?.status) searchParams.set("status", params.status);
    if (params?.startDate) searchParams.set("startDate", params.startDate);
    if (params?.endDate) searchParams.set("endDate", params.endDate);
    const query = searchParams.toString();
    return fetchApi<unknown[]>(`/api/v1/shifts${query ? `?${query}` : ""}`);
  },

  getMyShifts: () => fetchApi<unknown[]>("/api/v1/shifts/my-shifts"),

  getById: (id: string) => fetchApi<unknown>(`/api/v1/shifts/${id}`),

  create: (data: {
    locationId: string;
    startTime: string;
    endTime: string;
    requiredSkillId: string;
    headcount?: number;
    status?: string;
  }) =>
    fetchApi<unknown>("/api/v1/shifts", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  update: (id: string, data: unknown) =>
    fetchApi<unknown>(`/api/v1/shifts/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),

  delete: (id: string) =>
    fetchApi<unknown>(`/api/v1/shifts/${id}`, { method: "DELETE" }),

  publish: (id: string) =>
    fetchApi<unknown>(`/api/v1/shifts/${id}/publish`, { method: "POST" }),

  assign: (id: string, data: { staffId: string; version?: number }) =>
    fetchApi<unknown>(`/api/v1/shifts/${id}/assign`, {
      method: "POST",
      body: JSON.stringify(data),
    }),

  validate: (id: string, data: { staffId: string }) =>
    fetchApi<unknown>(`/api/v1/shifts/${id}/validate`, {
      method: "POST",
      body: JSON.stringify(data),
    }),

  getSuggestions: (id: string, limit = 3) =>
    fetchApi<unknown[]>(`/api/v1/shifts/${id}/suggestions?limit=${limit}`),

  getOvertimeStats: (params?: { locationId?: string; weekStart?: string }) => {
    const searchParams = new URLSearchParams();
    if (params?.locationId) searchParams.set("locationId", params.locationId);
    if (params?.weekStart) searchParams.set("weekStart", params.weekStart);
    const query = searchParams.toString();
    return fetchApi<unknown>(`/api/v1/shifts/overtime-stats${query ? `?${query}` : ""}`);
  },

  getCurrent: (params?: { locationId?: string }) => {
    const searchParams = new URLSearchParams();
    if (params?.locationId) searchParams.set("locationId", params.locationId);
    const query = searchParams.toString();
    return fetchApi<unknown[]>(`/api/v1/shifts/current${query ? `?${query}` : ""}`);
  },

  getPremiumStats: (params?: { locationId?: string; startDate?: string; endDate?: string }) => {
    const searchParams = new URLSearchParams();
    if (params?.locationId) searchParams.set("locationId", params.locationId);
    if (params?.startDate) searchParams.set("startDate", params.startDate);
    if (params?.endDate) searchParams.set("endDate", params.endDate);
    const query = searchParams.toString();
    return fetchApi<unknown[]>(`/api/v1/shifts/premium-stats${query ? `?${query}` : ""}`);
  },
};