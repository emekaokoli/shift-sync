import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useSocketSync } from "@/hooks/socket";
import { useRespondSwap, useSwaps } from "@/hooks/swaps";
import { useAuthStore } from "@/lib/stores";
import dayjs from "dayjs";
import { Clock, MapPin, User } from "lucide-react";
import { useState } from "react";


export function Swaps() {
  const { user } = useAuthStore();
  const [filter, setFilter] = useState<string>("all");

  useSocketSync();

  const { data: swaps } = useSwaps(
    filter !== "all" ? { status: filter } : undefined
  );
  const respondSwap = useRespondSwap();

  const handleRespond = async (swapId: string, action: string) => {
    try {
      await respondSwap.mutateAsync({ id: swapId, action });
    } catch (error) {
      console.error("Failed to respond to swap:", error);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Swap Requests</h1>
          <p className="text-muted-foreground">Manage shift swap and drop requests</p>
        </div>
      </div>

      <div className="flex gap-2">
        {["all", "PENDING", "APPROVED", "REJECTED", "CANCELLED"].map((status) => (
          <Button
            key={status}
            variant={filter === status ? "default" : "outline"}
            onClick={() => setFilter(status)}
            className='cursor-pointer rounded-2xl px-4 py-2 text-sm'
          >
            {status === "all" ? "All" : status}
          </Button>
        ))}
      </div>

      <div className="space-y-4">
        {(swaps || []).length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              No swap requests found
            </CardContent>
          </Card>
        ) : (
          (swaps || []).map((swap) => {
            const swapData = swap as {
              id: string;
              status: string;
              type: string;
              requester: { id: string; name: string };
              target: { id: string; name: string } | null;
              shift: {
                start_time: string;
                end_time: string;
                location: { name: string };
              };
            };
            const isPending = swapData.status === "PENDING";
            const isAccepted = swapData.status === "ACCEPTED";
            const isMyRequest = swapData.requester?.id === user?.id;

            const showActions = (isPending || isAccepted) && !isMyRequest;

            return (
              <Card key={swapData.id}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <User className="h-4 w-4" />
                      {swapData.requester?.name}
                      {swapData.target && (
                        <>
                          <span className="text-muted-foreground">→</span>
                          {swapData.target.name}
                        </>
                      )}
                    </CardTitle>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{swapData.type}</Badge>
                      <Badge
                        variant={
                          swapData.status === "PENDING"
                            ? "outline"
                            : swapData.status === "APPROVED"
                              ? "default"
                              : swapData.status === "REJECTED"
                                ? "destructive"
                                : "secondary"
                        }
                      >
                        {swapData.status}
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-4 text-sm mb-4">
                    <div className="flex items-center gap-1">
                      <Clock className="h-4 w-4" />
                      {dayjs(swapData.shift?.start_time).format("MMM D, h:mm A")}
                    </div>
                    <div className="flex items-center gap-1">
                      <MapPin className="h-4 w-4" />
                      {swapData.shift?.location?.name}
                    </div>
                  </div>

                  {showActions && (
                    <div className="flex gap-2">
                      {isPending ? (
                        <>
                          <Button
                            size="sm"
                            onClick={() => handleRespond(swapData.id, "accept")}
                            disabled={respondSwap.isPending}
                            className="bg-green-500 hover:bg-green-600 text-white cursor-pointer rounded-2xl"
                          >
                            Accept
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleRespond(swapData.id, "cancel")}
                            disabled={respondSwap.isPending}
                            className="cursor-pointer rounded-2xl"
                          >
                            Cancel
                          </Button>
                        </>
                      ) : isAccepted ? (
                        <>
                          <Button
                            size="sm"
                            onClick={() => handleRespond(swapData.id, "approve")}
                            disabled={respondSwap.isPending}
                              className="bg-green-500 hover:bg-green-600 text-white cursor-pointer rounded-2xl"
                          >
                            Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleRespond(swapData.id, "reject")}
                            disabled={respondSwap.isPending}
                            className="cursor-pointer bg-red-500 hover:bg-red-600 text-white rounded-2xl"
                          >
                            Reject
                          </Button>
                        </>
                      ) : null}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}
