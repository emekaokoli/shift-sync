import { locationsApi, shiftsApi } from "@/api";
import { queryClient } from "@/main";
import { ScheduleCalendar } from "@/pages/schedules/calendar";
import { createFileRoute } from "@tanstack/react-router";
import { authGuard } from "@/components/routeAuthGuard";

export const Route = createFileRoute("/(_authenticated)/schedules/calendar")({
  beforeLoad: authGuard,
  component: ScheduleCalendar,
  loader: async () => {
    const now = new Date();
    const monthStart = new Date(now);
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);
    
    const monthEnd = new Date(now);
    monthEnd.setMonth(monthEnd.getMonth() + 1);
    monthEnd.setDate(0);
    
    await Promise.all([
      queryClient.prefetchQuery({
        queryKey: ['shifts', { startDate: monthStart.toISOString(), endDate: monthEnd.toISOString() }],
        queryFn: () => shiftsApi.getAll({
          startDate: monthStart.toISOString(),
          endDate: monthEnd.toISOString(),
        }),
      }),
      queryClient.prefetchQuery({
        queryKey: ['locations'],
        queryFn: () => locationsApi.getAll(),
      }),
    ]);
  },
});
