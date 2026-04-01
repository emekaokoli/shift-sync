import dayjs from "dayjs";
import { Violation, CONSTRAINTS } from "@shift-sync/shared";

interface Shift {
  id: string;
  startTime: string;
  endTime: string;
}

interface Assignment {
  shift: Shift;
}

export function checkMinRest(
  existingAssignments: Assignment[],
  newShift: Shift,
): Violation | null {
  const newStart = dayjs(newShift.startTime);
  const newEnd = dayjs(newShift.endTime);
  const minRestHours = CONSTRAINTS.MIN_REST_HOURS;

  // Get all shifts sorted by time
  const sortedAssignments = [...existingAssignments].sort((a, b) =>
    dayjs(a.shift.startTime).diff(dayjs(b.shift.startTime)),
  );

  // Check gap BEFORE new shift
  const previousShift = sortedAssignments.find((a) =>
    dayjs(a.shift.endTime).isBefore(newStart),
  );

  if (previousShift) {
    const gapHours = dayjs(newStart).diff(
      dayjs(previousShift.shift.endTime),
      "hour",
    );

    if (gapHours < minRestHours) {
      return {
        code: "INSUFFICIENT_REST",
        message: `Only ${gapHours}h rest before shift (minimum ${minRestHours}h required)`,
        details: {
          gapHours,
          lastShiftId: previousShift.shift.id,
          hoursUntilAvailable: minRestHours - gapHours,
        },
      };
    }
  }

  // Check gap AFTER new shift
  const nextShift = sortedAssignments.find((a) =>
    dayjs(a.shift.startTime).isAfter(newEnd),
  );

  if (nextShift) {
    const gapHours = dayjs(nextShift.shift.startTime).diff(newEnd, "hour");

    if (gapHours < minRestHours) {
      return {
        code: "INSUFFICIENT_REST",
        message: `Only ${gapHours}h rest after shift (minimum ${minRestHours}h required)`,
        details: {
          gapHours,
          nextShiftId: nextShift.shift.id,
          hoursUntilAvailable: minRestHours - gapHours,
        },
      };
    }
  }

  return null;
}
