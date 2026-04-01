import { Calendar, dayjsLocalizer, Views } from "react-big-calendar";
import "react-big-calendar/lib/css/react-big-calendar.css";
import { useLocations } from "@/hooks/locations";
import { useShifts } from "@/hooks/shifts";
import { useSocketSync } from "@/hooks/socket";
import dayjs from "dayjs";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";

const localizer = dayjsLocalizer(dayjs);

interface CalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  allDay?: boolean;
  resource: {
    location: string;
    status: string;
    assigned: number;
    headcount: number;
  };
}

export function ScheduleCalendar() {
  const [selectedLocation, setSelectedLocation] = useState<string>("all");
  const [currentDate, setCurrentDate] = useState(dayjs().toDate());
  const [view, setView] = useState<typeof Views[keyof typeof Views]>(Views.WEEK);

  useSocketSync();

  const { data: shifts, isLoading: shiftsLoading } = useShifts({
    locationId: selectedLocation !== "all" ? selectedLocation : undefined,
    startDate: dayjs(currentDate).startOf("month").toISOString(),
    endDate: dayjs(currentDate).endOf("month").toISOString(),
  });

  const { data: locations } = useLocations();

  const events: CalendarEvent[] = useMemo(() => {
    if (!shifts) return [];
    
    return (shifts as unknown[]).map((shift) => {
      const s = shift as {
        id: string;
        start_time: string;
        end_time: string;
        status: string;
        headcount: number;
        location: { name: string };
        required_skill: { name: string };
        assignments: { staff: { name: string } }[];
      };
      
      return {
        id: s.id,
        title: `${s.required_skill?.name || "Shift"} (${s.assignments?.length || 0}/${s.headcount})`,
        start: new Date(s.start_time),
        end: new Date(s.end_time),
        resource: {
          location: s.location?.name || "",
          status: s.status,
          assigned: s.assignments?.length || 0,
          headcount: s.headcount,
        },
      };
    });
  }, [shifts]);

  const handleNavigate = (action: "PREV" | "NEXT" | "TODAY") => {
    if (action === "TODAY") {
      setCurrentDate(dayjs().toDate());
    } else {
      const newDate = dayjs(currentDate);
      if (view === Views.MONTH) {
        setCurrentDate(action === "PREV" ? newDate.subtract(1, "month").toDate() : newDate.add(1, "month").toDate());
      } else if (view === Views.WEEK) {
        setCurrentDate(action === "PREV" ? newDate.subtract(1, "week").toDate() : newDate.add(1, "week").toDate());
      } else {
        setCurrentDate(action === "PREV" ? newDate.subtract(1, "day").toDate() : newDate.add(1, "day").toDate());
      }
    }
  };

  const eventStyleGetter = (event: CalendarEvent) => {
    const isPublished = event.resource.status === "PUBLISHED";
    const isFull = event.resource.assigned >= event.resource.headcount;
    
    let backgroundColor = "#3b82f6";
    if (!isPublished) backgroundColor = "#6b7280";
    else if (isFull) backgroundColor = "#22c55e";
    
    return {
      style: {
        backgroundColor,
        borderRadius: "4px",
        opacity: 0.9,
        color: "white",
        border: "0px",
        display: "block",
      },
    };
  };

  return (
    <div className="p-6 space-y-4 w-full">
      <div>
        <h1 className="text-3xl font-bold">Schedule Calendar</h1>
        <p className="text-muted-foreground">View shifts in calendar format</p>
      </div>

      <div className="flex gap-4 items-center justify-between">
        <div className="flex gap-2 items-center">
          <Button variant="outline" size="sm" onClick={() => handleNavigate("PREV")}>
            Previous
          </Button>
          <Button variant="outline" size="sm" onClick={() => handleNavigate("TODAY")}>
            Today
          </Button>
          <Button variant="outline" size="sm" onClick={() => handleNavigate("NEXT")}>
            Next
          </Button>
        </div>

        <div className="flex gap-2">
          <Button
            variant={view === Views.MONTH ? "default" : "outline"}
            size="sm"
            onClick={() => setView(Views.MONTH)}
          >
            Month
          </Button>
          <Button
            variant={view === Views.WEEK ? "default" : "outline"}
            size="sm"
            onClick={() => setView(Views.WEEK)}
          >
            Week
          </Button>
          <Button
            variant={view === Views.DAY ? "default" : "outline"}
            size="sm"
            onClick={() => setView(Views.DAY)}
          >
            Day
          </Button>
        </div>

        <select
          className="border rounded px-3 py-2 w-48"
          value={selectedLocation}
          onChange={(e) => setSelectedLocation(e.target.value)}
        >
          <option value="all">All Locations</option>
          {(locations || []).map((loc: unknown) => {
            const location = loc as { id: string; name: string };
            return <option key={location.id} value={location.id}>{location.name}</option>;
          })}
        </select>
      </div>

      <div className="border rounded-lg p-4 bg-background" style={{ height: "calc(100vh - 250px)" }}>
        {shiftsLoading ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-muted-foreground">Loading...</p>
          </div>
        ) : (
          <Calendar
            localizer={localizer}
            events={events}
            startAccessor="start"
            endAccessor="end"
            style={{ height: "100%" }}
            view={view}
            onView={setView}
            date={currentDate}
            onNavigate={setCurrentDate}
            eventPropGetter={eventStyleGetter as never}
            popup
            selectable
            tooltipAccessor={(event: unknown) => `${(event as CalendarEvent).resource?.location} - ${(event as CalendarEvent).resource?.status}`}
          />
        )}
      </div>
    </div>
  );
}
