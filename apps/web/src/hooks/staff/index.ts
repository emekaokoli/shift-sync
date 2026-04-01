import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { staffApi } from "../../api/staff";
import { showError, showSuccess } from "../../lib/toast";

const queryKeys = {
  staff: (params?: Record<string, string>) => ["staff", params] as const,
  staffMember: (id: string) => ["staff", id] as const,
};

export function useStaff(params?: { locationId?: string; role?: string; skillId?: string }) {
  return useQuery({
    queryKey: queryKeys.staff(params),
    queryFn: () => staffApi.getAll(params),
  });
}

export function useStaffMember(id: string) {
  return useQuery({
    queryKey: queryKeys.staffMember(id),
    queryFn: () => staffApi.getById(id),
    enabled: !!id,
  });
}

export function useUpdateStaff() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: unknown }) => staffApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["staff"] });
      showSuccess("Staff updated", "Changes have been saved");
    },
    onError: (error: Error) => {
      showError("Failed to update staff", error.message);
    },
  });
}