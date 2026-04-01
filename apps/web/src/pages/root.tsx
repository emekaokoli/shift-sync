import { NotificationBell } from "@/components/Notifications";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/lib/stores";
import { Link, Outlet, useNavigate } from "@tanstack/react-router";
import { TanStackRouterDevtools } from "@tanstack/react-router-devtools";
import { LogOut, User } from 'lucide-react';


export function Root() {
  const navigate = useNavigate();
  
  const { user, accessToken, logout } = useAuthStore();
  const isAuthenticated = !!accessToken;

  const handleLogout = () => {
    logout();
    navigate({ to: '/auth/login' });
  };

  return (
    <div className="w-full min-h-screen flex flex-col justify-start">
      <header className="border-b px-4 py-3">
        <div className="container mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold"><Link to='/'>ShiftSync</Link></h1>
            <p className="text-sm text-muted-foreground">Multi-location staff scheduling</p>
          </div>

          {isAuthenticated && user && (
            <div className="flex items-center gap-4">
              <nav className="flex items-center gap-2">
                <Link
                  to="/schedule"
                  className="text-sm px-3 py-1 rounded hover:bg-gray-100"
                >
                  Schedule
                </Link>
                <Link
                  to="/schedules/calendar"
                  className="text-sm px-3 py-1 rounded hover:bg-gray-100"
                >
                  Calendar
                </Link>
                <Link
                  to="/now"
                  className="text-sm px-3 py-1 rounded hover:bg-gray-100"
                >
                  Now
                </Link>
                <Link
                  to="/overtime"
                  className="text-sm px-3 py-1 rounded hover:bg-gray-100"
                >
                  Overtime
                </Link>
                <Link
                  to="/analytics"
                  className="text-sm px-3 py-1 rounded hover:bg-gray-100"
                >
                  Analytics
                </Link>
                <Link
                  to="/premium"
                  className="text-sm px-3 py-1 rounded hover:bg-gray-100"
                >
                  Premium
                </Link>
                <Link
                  to="/audit"
                  className="text-sm px-3 py-1 rounded hover:bg-gray-100"
                >
                  Audit
                </Link>
                <Link
                  to="/settings"
                  className="text-sm px-3 py-1 rounded hover:bg-gray-100"
                >
                  Settings
                </Link>
              </nav>
              <NotificationBell />
              <div className="flex items-center gap-2 text-sm">
                <User className="h-4 w-4" />
                <span className="font-medium">{user.name}</span>
                <span className="text-muted-foreground">({user.role})</span>
              </div>
              <Button variant="ghost" size="sm" onClick={handleLogout}>
                <LogOut className="h-4 w-4 mr-1" />
                Logout
              </Button>
            </div>
          )}
        </div>
      </header>

      <main className="flex flex-col px-5 justify-center items-center w-full">
        <Outlet />
        <TanStackRouterDevtools />
      </main>
    </div>
  );
}
