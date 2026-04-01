import type { Violation } from '@shift-sync/shared';
import dayjs from 'dayjs';
import timezone from 'dayjs/plugin/timezone';
import utc from 'dayjs/plugin/utc';

dayjs.extend(utc);
dayjs.extend(timezone);

interface Availability {
  id: string;
  dayOfWeek: number | null;
  startTime: string;
  endTime: string;
  isRecurring: boolean;
  specificDate: string | null;
}

interface Shift {
  startTime: string;
  endTime: string;
  location: {
    timezone: string;
  };
}

export function checkAvailability(availability: Availability[], shift: Shift): Violation | null {
  const shiftStart = dayjs(shift.startTime).tz(shift.location.timezone);
  const shiftDate = shiftStart.format('YYYY-MM-DD');
  const dayOfWeek = shiftStart.day();
  const timeStr = shiftStart.format('HH:mm');

  // Check for specific date availability first (one-off)
  const specificAvail = availability.find(
    (a) =>
      !a.isRecurring && a.specificDate && dayjs(a.specificDate).format('YYYY-MM-DD') === shiftDate
  );

  if (specificAvail) {
    if (timeStr < specificAvail.startTime || timeStr > specificAvail.endTime) {
      return {
        code: 'UNAVAILABLE',
        message: `Staff member is not available at this time (specific date override)`,
        details: {
          date: shiftDate,
          startTime: specificAvail.startTime,
          endTime: specificAvail.endTime,
        },
      };
    }
    return null;
  }

  // Check recurring availability
  const recurringAvail = availability.find((a) => a.isRecurring && a.dayOfWeek === dayOfWeek);

  if (!recurringAvail) {
    return {
      code: 'UNAVAILABLE',
      message: `Staff member is not available on this day of the week`,
      details: {
        dayOfWeek,
        dayName: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][
          dayOfWeek
        ],
      },
    };
  }

  // Check time window
  if (timeStr < recurringAvail.startTime || timeStr > recurringAvail.endTime) {
    return {
      code: 'UNAVAILABLE',
      message: `Staff member is not available at this time`,
      details: {
        dayOfWeek,
        dayName: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][
          dayOfWeek
        ],
        availableStart: recurringAvail.startTime,
        availableEnd: recurringAvail.endTime,
        shiftTime: timeStr,
      },
    };
  }

  return null;
}
