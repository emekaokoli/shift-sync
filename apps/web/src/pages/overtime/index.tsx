import { useLocations } from "@/hooks/locations";
import { useOvertimeStats } from "@/hooks/shifts";
import { useAuthStore } from "@/lib/stores";
import type { OvertimeResponse } from "@shift-sync/shared";
import { AlertTriangle, Clock, TrendingUp } from "lucide-react";
import { useState } from "react";

export function OvertimeDashboard() {
  const { user } = useAuthStore();
  const isManager = user?.role === "MANAGER" || user?.role === "ADMIN";
  const [selectedLocation, setSelectedLocation] = useState<string>("all");
  const [selectedWeek, setSelectedWeek] = useState(() => {
    const now = new Date();
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - now.getDay());
    weekStart.setHours(0, 0, 0, 0);
    return weekStart.toISOString();
  });

  const { data: locations } = useLocations();
  const { data: overtimeData, isLoading } = useOvertimeStats({
    locationId: selectedLocation !== "all" ? selectedLocation : undefined,
    weekStart: selectedWeek,
  });

  if (!isManager) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold">Overtime Dashboard</h1>
        <p className="text-muted-foreground mt-2">This page is only available for managers.</p>
      </div>
    );
  }

  const response = overtimeData as OvertimeResponse | undefined;
  const summary = response?.summary;
  const staffList = response?.staff;

  return (
    <div className="p-6 space-y-6 w-full">
      <div>
        <h1 className="text-3xl font-bold">Overtime Dashboard</h1>
        <p className="text-muted-foreground">Monitor staff overtime hours and compliance</p>
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

        <input
          type="date"
          className="border rounded px-3 py-2"
          value={selectedWeek.split("T")[0]}
          onChange={(e) => setSelectedWeek(new Date(e.target.value).toISOString())}
        />
      </div>

      {isLoading ? (
        <p className="text-muted-foreground">Loading...</p>
      ) : summary ? (
        <>
          <div className="grid gap-4 md:grid-cols-4">
            <div className="p-4 border rounded-lg">
              <p className="text-sm text-muted-foreground">Total Hours</p>
              <p className="text-2xl font-bold">{summary.totalHours}h</p>
            </div>
            <div className="p-4 border rounded-lg">
              <p className="text-sm text-muted-foreground">Staff Scheduled</p>
              <p className="text-2xl font-bold">{summary.staffCount}</p>
            </div>
            <div className="p-4 border rounded-lg border-yellow-200 bg-yellow-50">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-yellow-600" />
                <p className="text-sm text-yellow-800">At Limit (35-40h)</p>
              </div>
              <p className="text-2xl font-bold text-yellow-600">{summary.atLimitCount}</p>
            </div>
            <div className="p-4 border rounded-lg border-red-200 bg-red-50">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-red-600" />
                <p className="text-sm text-red-800">Over Limit (&gt;40h)</p>
              </div>
              <p className="text-2xl font-bold text-red-600">{summary.overLimitCount}</p>
            </div>
          </div>

          <div>
            <h2 className="text-xl font-semibold mb-4">Staff Hours</h2>
            {staffList && staffList.length > 0 ? (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {staffList.map((staff) => (
                  <div
                    key={staff.staffId}
                    className={`p-4 border rounded-lg ${staff.isOvertime
                      ? "border-red-300 bg-red-50"
                      : staff.isWarning
                        ? "border-yellow-300 bg-yellow-50"
                        : "border-gray-200"
                      }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-medium">{staff.staffName}</h3>
                      <div className="flex items-center gap-1">
                        {staff.isOvertime ? (
                          <AlertTriangle className="h-4 w-4 text-red-600" />
                        ) : staff.isWarning ? (
                          <TrendingUp className="h-4 w-4 text-yellow-600" />
                        ) : (
                          <Clock className="h-4 w-4 text-green-600" />
                        )}
                        <span
                          className={`font-bold ${staff.isOvertime
                            ? "text-red-600"
                            : staff.isWarning
                              ? "text-yellow-600"
                              : "text-green-600"
                            }`}
                        >
                          {staff.weeklyHours.toFixed(1)}h
                        </span>
                      </div>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      <div className="flex gap-2 flex-wrap">
                        {staff.dailyHours.map((day) => (
                          <span
                            key={day.date}
                            className={day.hours > 10 ? "text-red-600 font-medium" : ""}
                          >
                            {new Date(day.date).toLocaleDateString("en-US", {
                              weekday: "short",
                            })}
                            : {day.hours.toFixed(1)}h
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground">No staff hours data for this week.</p>
            )}
          </div>
        </>
      ) : (
        <p className="text-muted-foreground">No overtime data available.</p>
      )}
    </div>
  );
}