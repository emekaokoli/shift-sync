import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/lib/stores";
import { Link } from "@tanstack/react-router";


export function index() {
   // eslint-disable-next-line react-hooks/rules-of-hooks
  const { user } = useAuthStore();
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link to="/">
            <h1 className="text-xl font-bold">ShiftSync</h1>
          </Link>

          <nav className="flex gap-4 items-center">
            <Link to="/schedule">
              <Button variant="ghost">Schedule</Button>
            </Link>
            <Link to="/my-shifts">
              <Button variant="ghost">My Shifts</Button>
            </Link>
            <Link to="/swaps">
              <Button variant="ghost">Swaps</Button>
            </Link>
            <div className="flex items-center gap-2 ml-4">
              <span className="text-sm text-muted-foreground">{user?.name}</span>
              <Badge variant="outline">{user?.role}</Badge>
              <Button variant="outline" size="sm" onClick={() => useAuthStore.getState().logout()}>
                Logout
              </Button>
            </div>
          </nav>
        </div>
      </header>
      </div>
  )
}
