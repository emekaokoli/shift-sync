import { OvertimeDashboard } from "@/pages/overtime";
import { createFileRoute } from "@tanstack/react-router";
import { authGuard } from "@/components/routeAuthGuard";

export const Route = createFileRoute("/(_authenticated)/overtime")({
  beforeLoad: authGuard,
  component: OvertimeDashboard,
});
