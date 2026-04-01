import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { shiftsApi } from "../../api/shifts";
import { showError, showSuccess } from "../../lib/toast";

const queryKeys = {
  shifts: (params?: Record<string, string>) => ["shifts", params] as const,
  shift: (id: string) => ["shift", id] as const,
  myShifts: () => ["my-shifts"] as const,
  currentShifts: (locationId?: string) => ["current-shifts", locationId] as const,
  premiumStats: (params?: Record<string, string>) => ["premium-stats", params] as const,
};

export function useShifts(params?: { locationId?: string; status?: string; startDate?: string; endDate?: string }) {
  return useQuery({
    queryKey: queryKeys.shifts(params),
    queryFn: () => shiftsApi.getAll(params),
  });
}

export function useMyShifts() {
  return useQuery({
    queryKey: queryKeys.myShifts(),
    queryFn: () => shiftsApi.getMyShifts(),
  });
}

export function useShift(id: string) {
  return useQuery({
    queryKey: queryKeys.shift(id),
    queryFn: () => shiftsApi.getById(id),
    enabled: !!id,
  });
}

export function useCreateShift() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: shiftsApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["shifts"] });
      showSuccess("Shift created", "New shift has been added to the schedule");
    },
    onError: (error: Error) => {
      showError("Failed to create shift", error.message);
    },
  });
}

export function useUpdateShift() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: unknown }) => shiftsApi.update(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ["shifts"] });
      queryClient.invalidateQueries({ queryKey: queryKeys.shift(id) });
      showSuccess("Shift updated", "Changes have been saved");
    },
    onError: (error: Error) => {
      showError("Failed to update shift", error.message);
    },
  });
}

export function useDeleteShift() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: shiftsApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["shifts"] });
      queryClient.invalidateQueries({ queryKey: ["my-shifts"] });
      showSuccess("Shift deleted", "Shift has been removed from the schedule");
    },
    onError: (error: Error) => {
      showError("Failed to delete shift", error.message);
    },
  });
}

export function usePublishShift() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: shiftsApi.publish,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["shifts"] });
      queryClient.invalidateQueries({ queryKey: ["my-shifts"] });
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      showSuccess("Shift published", "Shift is now visible to staff");
    },
    onError: (error: Error) => {
      showError("Failed to publish shift", error.message);
    },
  });
}

export function useAssignShift() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, staffId, version }: { id: string; staffId: string; version?: number }) =>
      shiftsApi.assign(id, { staffId, version }),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ["shifts"] });
      queryClient.invalidateQueries({ queryKey: ["my-shifts"] });
      queryClient.invalidateQueries({ queryKey: queryKeys.shift(id) });
      showSuccess("Staff assigned", "Employee has been assigned to the shift");
    },
    onError: (error: Error) => {
      showError("Failed to assign staff", error.message);
    },
  });
}

export function useValidateShiftAssignment() {
  return useMutation({
    mutationFn: ({ shiftId, staffId }: { shiftId: string; staffId: string }) =>
      shiftsApi.validate(shiftId, { staffId }),
  });
}

export function useOvertimeStats(params?: { locationId?: string; weekStart?: string }) {
  return useQuery({
    queryKey: ["overtime-stats", params],
    queryFn: () => shiftsApi.getOvertimeStats(params),
  });
}

export function useCurrentShifts(locationId?: string) {
  return useQuery({
    queryKey: queryKeys.currentShifts(locationId),
    queryFn: () => shiftsApi.getCurrent({ locationId }),
  });
}

export function usePremiumStats(params?: { locationId?: string; startDate?: string; endDate?: string }) {
  return useQuery({
    queryKey: queryKeys.premiumStats(params),
    queryFn: () => shiftsApi.getPremiumStats(params),
  });
}