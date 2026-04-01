import { Violation } from '@shift-sync/shared';
import dayjs from 'dayjs';

interface Shift {
  id: string;
  locationId: string;
  startTime: string;
  endTime: string;
  location: {
    timezone: string;
  };
}

interface Assignment {
  shift: Shift;
}

export function checkNoOverlap(
  existingAssignments: Assignment[],
  newShift: Shift
): Violation | null {
  const newStart = dayjs(newShift.startTime);
  const newEnd = dayjs(newShift.endTime);

  for (const assignment of existingAssignments) {
    const existingStart = dayjs(assignment.shift.startTime);
    const existingEnd = dayjs(assignment.shift.endTime);

    // Overlap check (inclusive start, exclusive end)
    const hasOverlap = newStart.isBefore(existingEnd) && newEnd.isAfter(existingStart);

    if (hasOverlap) {
      return {
        code: 'OVERLAP',
        message: `Overlaps with shift at ${assignment.shift.location?.timezone || 'another location'}`,
        details: {
          conflictingShiftId: assignment.shift.id,
          conflictingStart: existingStart.toISOString(),
          conflictingEnd: existingEnd.toISOString(),
        },
      };
    }
  }

  return null;
}
