import { fetchApi } from "../client";
import type { Location } from "@shift-sync/shared";

export const locationsApi = {
  getAll: () => fetchApi<Location[]>("/api/v1/locations"),
  getById: (id: string) => fetchApi<Location>(`/api/v1/locations/${id}`),
  create: (data: unknown) =>
    fetchApi<Location>("/api/v1/locations", {
      method: "POST",
      body: JSON.stringify(data),
    }),
};