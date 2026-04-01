import dayjs from 'dayjs';
import isoWeek from 'dayjs/plugin/isoWeek';
import { Violation, CONSTRAINTS } from '@shift-sync/shared';

dayjs.extend(isoWeek);

interface Shift {
  startTime: string;
  location: {
    timezone: string;
  };
}

interface Assignment {
  shift: Shift;
}

export function checkConsecutiveDays(
  existingAssignments: Assignment[],
  newShift: Shift
): { violation: Violation | null; overrideRequired: boolean } {
  const warnAtDay = CONSTRAINTS.WARN_CONSECUTIVE_DAYS;
  const maxDays = CONSTRAINTS.MAX_CONSECUTIVE_DAYS;

  const newShiftDate = dayjs(newShift.startTime).tz(newShift.location.timezone);
  const newIsoWeek = newShiftDate.isoWeek();
  const newYear = newShiftDate.year();

  // Get unique days worked in the ISO week
  const daysWorked = new Set<number>();

  for (const assignment of existingAssignments) {
    const shiftDate = dayjs(assignment.shift.startTime).tz(assignment.shift.location.timezone);

    // Only count shifts in same ISO week
    if (shiftDate.isoWeek() === newIsoWeek && shiftDate.year() === newYear) {
      daysWorked.add(shiftDate.day());
    }
  }

  // Add new shift's day
  daysWorked.add(newShiftDate.day());

  const consecutiveCount = daysWorked.size;

  // Check for 7th consecutive day (block)
  if (consecutiveCount > maxDays) {
    return {
      violation: {
        code: 'CONSECUTIVE_DAYS_BLOCK',
        message: `Cannot work ${consecutiveCount}th consecutive day - requires manager override with reason`,
      },
      overrideRequired: true,
    };
  }

  // Check for 6th consecutive day (warning)
  if (consecutiveCount === warnAtDay) {
    return {
      violation: {
        code: 'CONSECUTIVE_DAYS_WARNING',
        message: `Warning: This will be your ${consecutiveCount}th consecutive day worked`,
      },
      overrideRequired: false,
    };
  }

  return { violation: null, overrideRequired: false };
}
