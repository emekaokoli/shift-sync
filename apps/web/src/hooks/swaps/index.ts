import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { swapsApi } from "../../api/swaps";
import { showError, showSuccess } from "../../lib/toast";

const queryKeys = {
  swaps: (params?: Record<string, string>) => ["swaps", params] as const,
};

export function useSwaps(params?: { status?: string; userId?: string; shiftId?: string }) {
  return useQuery({
    queryKey: queryKeys.swaps(params),
    queryFn: () => swapsApi.getAll(params),
  });
}

export function useCreateSwap() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: swapsApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["swaps"] });
      showSuccess("Swap request created", "Your swap request has been submitted");
    },
    onError: (error: Error) => {
      showError("Failed to create swap request", error.message);
    },
  });
}

export function useRespondSwap() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, action }: { id: string; action: string }) => swapsApi.respond(id, action),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["swaps"] });
      showSuccess("Response recorded", "Your response has been saved");
    },
    onError: (error: Error) => {
      showError("Failed to respond", error.message);
    },
  });
}

export function useCancelSwap() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: swapsApi.cancel,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["swaps"] });
      showSuccess("Swap cancelled", "Swap request has been cancelled");
    },
    onError: (error: Error) => {
      showError("Failed to cancel swap", error.message);
    },
  });
}