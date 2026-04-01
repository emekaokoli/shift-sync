import { createFileRoute } from "@tanstack/react-router";
import { MyShifts } from "@/pages/shifts";
import { authGuard } from "@/components/routeAuthGuard";

export const Route = createFileRoute("/(_authenticated)/my-shifts")({
  beforeLoad: authGuard,
  component: MyShifts,
});
