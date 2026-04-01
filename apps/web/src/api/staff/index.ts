import { fetchApi } from "../client";

export const staffApi = {
  getAll: (params?: {
    locationId?: string;
    role?: string;
    skillId?: string;
  }) => {
    const searchParams = new URLSearchParams();
    if (params?.locationId) searchParams.set("locationId", params.locationId);
    if (params?.role) searchParams.set("role", params.role);
    if (params?.skillId) searchParams.set("skillId", params.skillId);
    const query = searchParams.toString();
    return fetchApi<unknown[]>(`/api/v1/staff${query ? `?${query}` : ""}`);
  },

  getById: (id: string) => fetchApi<unknown>(`/api/v1/staff/${id}`),

  update: (id: string, data: unknown) =>
    fetchApi<unknown>(`/api/v1/staff/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),

  addSkill: (id: string, skillId: string) =>
    fetchApi<unknown>(`/api/v1/staff/${id}/skills`, {
      method: "POST",
      body: JSON.stringify({ skillId }),
    }),

  removeSkill: (id: string, skillId: string) =>
    fetchApi<unknown>(`/api/v1/staff/${id}/skills/${skillId}`, {
      method: "DELETE",
    }),

  addLocation: (id: string, locationId: string, isManager = false) =>
    fetchApi<unknown>(`/api/v1/staff/${id}/locations`, {
      method: "POST",
      body: JSON.stringify({ locationId, isManager }),
    }),

  setAvailability: (id: string, data: unknown) =>
    fetchApi<unknown>(`/api/v1/staff/${id}/availability`, {
      method: "POST",
      body: JSON.stringify(data),
    }),
};