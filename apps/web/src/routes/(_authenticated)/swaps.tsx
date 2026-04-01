import { Swaps } from "@/pages/swaps/swaps";
import { createFileRoute } from "@tanstack/react-router";
import { authGuard } from "@/components/routeAuthGuard";

export const Route = createFileRoute("/(_authenticated)/swaps")({
  beforeLoad: authGuard,
  component: Swaps,
});
