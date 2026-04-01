import { CreateShiftDialog } from "@/components/CreateShiftDialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useLocations } from "@/hooks/locations";
import { useAssignShift, usePublishShift, useShifts, useValidateShiftAssignment } from "@/hooks/shifts";
import { useSocketSync } from "@/hooks/socket";
import { useStaff } from "@/hooks/staff";
import { useAuthStore } from "@/lib/stores";
import dayjs from "dayjs";
import { Clock, MapPin, Plus, UserPlus, Users } from "lucide-react";
import { useMemo, useState } from "react";


export function Schedule() {
  const { user } = useAuthStore();
  const isManager = user?.role === "MANAGER" || user?.role === "ADMIN";
  const [selectedLocation, setSelectedLocation] = useState<string>("all");
  const [selectedWeek, setSelectedWeek] = useState(dayjs().startOf("week"));
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [assigningShift, setAssigningShift] = useState<string | null>(null);

  useSocketSync();

  const { data: shifts, isLoading: shiftsLoading } = useShifts({
    locationId: selectedLocation !== "all" ? selectedLocation : undefined,
    startDate: selectedWeek.toISOString(),
    endDate: selectedWeek.add(7, "day").toISOString(),
  });

  const { data: locations } = useLocations();
  
  const { data: allStaff } = useStaff();

  const publishShift = usePublishShift();
  const assignShift = useAssignShift();
  const validateAssignment = useValidateShiftAssignment();

  const weekDays = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => selectedWeek.add(i, "day"));
  }, [selectedWeek]);

  const shiftsByDay = useMemo(() => {
    const map: Record<string, unknown[]> = {};
    weekDays.forEach((day) => {
      const dayStr = day.format("YYYY-MM-DD");
      map[dayStr] = (shifts || []).filter((s) => {
        const shift = s as { start_time: string };
        return dayjs(shift.start_time).format("YYYY-MM-DD") === dayStr;
      });
    });
    return map;
  }, [shifts, weekDays]);

  const handlePublish = async (shiftId: string) => {
    try {
      await publishShift.mutateAsync(shiftId);
    } catch (error) {
      console.error("Failed to publish shift:", error);
    }
  };

  const handleAssignStaff = async (shiftId: string, staffId: string) => {
    try {
      const validation = await validateAssignment.mutateAsync({ shiftId, staffId });
      const result = validation as { ok: boolean; violations?: { code: string; message: string }[] };
      
      if (!result.ok && result.violations) {
        const blockingViolations = result.violations.filter(v => 
          v.code === "OVERTIME_BLOCK" || v.code === "DAILY_OVERTIME_BLOCK"
        );
        
        if (blockingViolations.length > 0) {
          alert(`Cannot assign staff: ${blockingViolations[0].message}`);
          return;
        }
        
        const warnings = result.violations.filter(v => 
          v.code === "OVERTIME_WARNING" || v.code === "DAILY_OVERTIME_WARNING"
        );
        
        if (warnings.length > 0) {
          const confirmed = confirm(`${warnings.map(w => w.message).join("\n")}\n\nAssign anyway?`);
          if (!confirmed) return;
        }
      }
      
      await assignShift.mutateAsync({ id: shiftId, staffId });
      setAssigningShift(null);
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      alert(err.response?.data?.message || "Failed to assign staff");
    }
  };

  const getAvailableStaff = (shift: unknown) => {
    if (!allStaff || !shift) return [];
    const shiftData = shift as {
      location: { id: string };
      required_skill: { id: string };
      assignments: { staff: { id: string } }[];
    };
    const assignedIds = (shiftData.assignments || []).map(a => a.staff?.id).filter(Boolean);
    const staffList = allStaff as { id: string; name: string; location_id: string; skills: { id: string }[] }[];
    return staffList.filter(staff => 
      staff.location_id === shiftData.location?.id && 
      !assignedIds.includes(staff.id)
    );
  };

  const formatTime = (dateStr: string) => dayjs(dateStr).format("h:mm A");

  return (
    <div className="p-6 space-y-6 w-fulls">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Schedule</h1>
          <p className="text-muted-foreground">Manage staff schedules across locations</p>
        </div>
        {isManager && (
          <Button onClick={() => setCreateDialogOpen(true)} className='cursor-pointer rounded-2xl px-4 py-2 text-sm'>
            <Plus className="h-4 w-4 mr-2" />
            Create Shift
          </Button>
        )}
      </div>

      <div className="flex gap-4 items-center">
        <select
          className="border rounded px-3 py-2 w-48"
          value={selectedLocation}
          onChange={(e) => setSelectedLocation(e.target.value)}
        >
          <option value="all">All Locations</option>
          {locations?.map((loc) => {
            const location = loc as { id: string; name: string };
            return (
              <option key={location.id} value={location.id}>
                {location.name}
              </option>
            );
          })}
        </select>

        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setSelectedWeek(selectedWeek.subtract(1, "week"))}>
            Previous
          </Button>
          <Button variant="outline" onClick={() => setSelectedWeek(dayjs().startOf("week"))}>
            Today
          </Button>
          <Button variant="outline" onClick={() => setSelectedWeek(selectedWeek.add(1, "week"))}>
            Next
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-4">
        {weekDays.map((day) => {
          const dayStr = day.format("YYYY-MM-DD");
          const dayShifts = shiftsByDay[dayStr] || [];

          return (
            <Card key={dayStr} className="min-h-[300px]">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">
                  {day.format("ddd")}
                </CardTitle>
                <p className="text-xs text-muted-foreground">{day.format("MMM D")}</p>
              </CardHeader>
              <CardContent className="space-y-2 w-full">
                {shiftsLoading ? (
                  <p className="text-sm text-muted-foreground">Loading...</p>
                ) : dayShifts.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No shifts</p>
                ) : (
                  dayShifts.map((shift) => {
                    const shiftData = shift as {
                      id: string;
                      start_time: string;
                      end_time: string;
                      status: string;
                      headcount: number;
                      location: { id: string; name: string };
                      required_skill: { id: string; name: string };
                      assignments: { staff: { id: string; name: string } }[];
                    };
                    const assignedCount = shiftData.assignments?.length || 0;
                    const isFull = assignedCount >= shiftData.headcount;
                    const availableStaff = isManager && !isFull ? getAvailableStaff(shift) : [];
                    const isAssigningThis = assigningShift === shiftData.id;

                    return (
                      <div
                        key={shiftData.id}
                        className="p-2 border rounded-md text-xs space-y-1 w-full"
                      >
                        <div className="flex items-center gap-1 w-full">
                          <Clock className="h-3 w-3" />
                          {formatTime(shiftData.start_time)} - {formatTime(shiftData.end_time)}
                        </div>
                        <div className="flex items-center gap-1 w-full">
                          <MapPin className="h-3 w-3" />
                          {shiftData.location?.name}
                        </div>
                        <div className="flex items-center gap-1 w-full">
                          <Badge variant="outline">{shiftData.required_skill?.name}</Badge>
                        </div>
                        <div className="flex items-center gap-1 w-full">
                          <Users className="h-3 w-3" />
                          {assignedCount}/{shiftData.headcount}
                        </div>
                        {assignedCount > 0 && (
                          <div className="text-xs text-muted-foreground mt-1 w-full">
                            {shiftData.assignments?.map(a => a.staff?.name).join(", ")}
                          </div>
                        )}
                        {isManager && !isFull && availableStaff.length > 0 && (
                          <div className="mt-2 w-full">
                            {isAssigningThis ? (
                              <select
                                className="w-full text-xs border rounded px-1 py-1"
                                onChange={(e) => {
                                  if (e.target.value) {
                                    handleAssignStaff(shiftData.id, e.target.value);
                                  }
                                }}
                                defaultValue=""
                              >
                                <option value="">Add staff...</option>
                                {availableStaff.map(staff => (
                                  <option key={staff.id} value={staff.id}>
                                    {staff.name}
                                  </option>
                                ))}
                              </select>
                            ) : (
                              <Button
                                size="sm"
                                variant="outline"
                                className="w-full h-6 text-xs cursor-pointer"
                                onClick={() => setAssigningShift(shiftData.id)}
                              >
                                <UserPlus className="h-3 w-3 mr-1" />
                                Assign
                              </Button>
                            )}
                          </div>
                        )}
                        {shiftData.status === "DRAFT" && isManager && (
                          <Button
                            size="sm"
                            variant="secondary"
                            className="w-full mt-2 text-sm cursor-pointer"
                            onClick={() => handlePublish(shiftData.id)}
                          >
                            Publish
                          </Button>
                        )}
                        <Badge
                          variant={shiftData.status === "PUBLISHED" ? "default" : "secondary"}
                          className={`${shiftData.status === "PUBLISHED" ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"}  text-xs`}
                        >
                          {shiftData.status}
                        </Badge>
                      </div>
                    );
                  })
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <CreateShiftDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        defaultLocationId={selectedLocation !== "all" ? selectedLocation : undefined}
      />
    </div>
  );
}
