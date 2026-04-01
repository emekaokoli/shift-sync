import { useQuery } from "@tanstack/react-query";
import { locationsApi } from "../../api/locations";
import type { Location } from "@shift-sync/shared";

const queryKeys = {
  locations: () => ["locations"] as const,
  location: (id: string) => ["location", id] as const,
};

export function useLocations() {
  return useQuery<Location[], Error>({
    queryKey: queryKeys.locations(),
    queryFn: locationsApi.getAll,
    retry: 1,
    throwOnError: false,
  });
}

export function useLocation(id: string) {
  return useQuery<Location, Error>({
    queryKey: queryKeys.location(id),
    queryFn: () => locationsApi.getById(id),
    enabled: !!id,
    retry: 1,
    throwOnError: false,
  });
}