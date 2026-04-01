import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useSocketSync } from "@/hooks/socket";
import { useMyShifts } from "@/hooks/shifts";
import { useSwaps } from "@/hooks/swaps";
import { useAuthStore } from "@/lib/stores";
import dayjs from "dayjs";
import { Clock, MapPin } from "lucide-react";

export function MyShifts() {
  const { user } = useAuthStore();
  
  useSocketSync();

  const { data: myShifts } = useMyShifts();
  const { data: swaps } = useSwaps({ userId: user?.id });

  return (
    <div className="container w-full">
      <div>
        <h1 className="text-3xl font-bold">My Shifts</h1>
        <p className="text-muted-foreground">View and manage your upcoming shifts</p>
      </div>

      <div className="space-y-6 mt-6">
        <div>
          <h2 className="text-xl font-semibold mb-4">My Assigned Shifts</h2>
          {(myShifts || []).length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                No assigned shifts
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {(myShifts || []).map((shift: any) => (
                <Card key={shift.id}>
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm">
                        {shift.location?.name || 'Shift'}
                      </CardTitle>
                      <Badge
                        variant={shift.status === "PUBLISHED" ? "default" : "secondary"}
                      >
                        {shift.status}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-4 text-sm">
                      <div className="flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        {dayjs(shift.start_time).format("MMM D, h:mm A")} - {dayjs(shift.end_time).format("h:mm A")}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 text-sm mt-1">
                      <MapPin className="h-4 w-4" />
                      {shift.location?.name}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        <div>
          <h2 className="text-xl font-semibold mb-4">My Swap Requests</h2>
          {(swaps || []).length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                No swap requests
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2 max-w-full">
              {(swaps || []).map((swap: any) => (
                <Card key={swap.id}>
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm">
                        {swap.type} Request
                      </CardTitle>
                      <Badge
                        variant={
                          swap.status === "PENDING"
                            ? "outline"
                            : swap.status === "APPROVED"
                              ? "default"
                              : "secondary"
                        }
                      >
                        {swap.status}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-4 text-sm">
                      <div className="flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        {swap.shift?.start_time ? dayjs(swap.shift.start_time).format("MMM D, h:mm A") : 'N/A'}
                      </div>
                      <div className="flex items-center gap-1">
                        <MapPin className="h-4 w-4" />
                        {swap.shift?.location?.name || 'N/A'}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}