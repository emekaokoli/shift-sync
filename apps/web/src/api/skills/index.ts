import { fetchApi } from "../client";

export const skillsApi = {
  getAll: () => fetchApi<unknown[]>("/api/v1/skills"),
  getById: (id: string) => fetchApi<unknown>(`/api/v1/skills/${id}`),
  create: (data: unknown) =>
    fetchApi<unknown>("/api/v1/skills", {
      method: "POST",
      body: JSON.stringify(data),
    }),
};