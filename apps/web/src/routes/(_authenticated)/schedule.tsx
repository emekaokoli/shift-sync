import { Schedule } from "@/pages/schedules";
import { createFileRoute } from "@tanstack/react-router";
import { queryClient } from "../../main";
import { shiftsApi, locationsApi } from "@/api";
import { authGuard } from "@/components/routeAuthGuard";

export const Route = createFileRoute("/(_authenticated)/schedule")({
  beforeLoad: authGuard,
  component: Schedule,
  loader: async () => {
    const now = new Date();
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - now.getDay());
    weekStart.setHours(0, 0, 0, 0);
    
    await Promise.all([
      queryClient.prefetchQuery({
        queryKey: ['shifts'],
        queryFn: () => shiftsApi.getAll({
          startDate: weekStart.toISOString(),
          endDate: new Date(weekStart.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        }),
      }),
      queryClient.prefetchQuery({
        queryKey: ['locations'],
        queryFn: () => locationsApi.getAll(),
      }),
    ]);
  },
});
