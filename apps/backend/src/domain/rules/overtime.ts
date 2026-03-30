import dayjs from "dayjs";
import isoWeek from "dayjs/plugin/isoWeek";
import { Violation, CONSTRAINTS } from "@shift-sync/shared";

dayjs.extend(isoWeek);

interface Shift {
  startTime: string;
  endTime: string;
}

interface Assignment {
  shift: Shift;
}

export function checkOvertime(
  existingAssignments: Assignment[],
  newShift: Shift,
  weekStart?: dayjs.Dayjs,
): Violation[] {
  const violations: Violation[] = [];
  const weeklyWarning = CONSTRAINTS.WEEKLY_WARNING_THRESHOLD;
  const weeklyMax = CONSTRAINTS.WEEKLY_MAX;
  const dailyWarning = CONSTRAINTS.DAILY_WARNING;
  const dailyMax = CONSTRAINTS.DAILY_MAX;

  const startOfWeek = weekStart || dayjs().startOf("isoWeek");
  const endOfWeek = startOfWeek.add(7, "day");

  // Calculate weekly hours
  const weeklyHours = existingAssignments
    .filter((a) => {
      const shiftStart = dayjs(a.shift.startTime);
      return shiftStart.isAfter(startOfWeek) && shiftStart.isBefore(endOfWeek);
    })
    .reduce((sum, a) => {
      const hours = dayjs(a.shift.endTime).diff(
        dayjs(a.shift.startTime),
        "hour",
      );
      return sum + hours;
    }, 0);

  const newShiftHours = dayjs(newShift.endTime).diff(
    dayjs(newShift.startTime),
    "hour",
  );
  const projectedWeekly = weeklyHours + newShiftHours;

  // Weekly check
  if (projectedWeekly > weeklyMax) {
    violations.push({
      code: "OVERTIME_BLOCK",
      message: `Would exceed weekly limit (${projectedWeekly}h > ${weeklyMax}h)`,
      details: {
        currentHours: weeklyHours,
        newShiftHours,
        projectedHours: projectedWeekly,
        limit: weeklyMax,
      },
    });
  } else if (projectedWeekly >= weeklyWarning) {
    violations.push({
      code: "OVERTIME_WARNING",
      message: `Approaching overtime (${projectedWeekly}h/${weeklyMax}h this week)`,
      details: {
        currentHours: weeklyHours,
        newShiftHours,
        projectedHours: projectedWeekly,
        limit: weeklyMax,
      },
    });
  }

  // Daily check
  const newShiftDay = dayjs(newShift.startTime).format("YYYY-MM-DD");
  const dailyHours = existingAssignments
    .filter(
      (a) => dayjs(a.shift.startTime).format("YYYY-MM-DD") === newShiftDay,
    )
    .reduce((sum, a) => {
      const hours = dayjs(a.shift.endTime).diff(
        dayjs(a.shift.startTime),
        "hour",
      );
      return sum + hours;
    }, 0);

  const projectedDaily = dailyHours + newShiftHours;

  if (projectedDaily > dailyMax) {
    violations.push({
      code: "DAILY_OVERTIME_BLOCK",
      message: `Would exceed daily limit (${projectedDaily}h > ${dailyMax}h)`,
      details: {
        currentHours: dailyHours,
        newShiftHours,
        projectedHours: projectedDaily,
        limit: dailyMax,
        date: newShiftDay,
      },
    });
  } else if (projectedDaily > dailyWarning) {
    violations.push({
      code: "DAILY_OVERTIME_WARNING",
      message: `Approaching daily limit (${projectedDaily}h/${dailyMax}h today)`,
      details: {
        currentHours: dailyHours,
        newShiftHours,
        projectedHours: projectedDaily,
        limit: dailyMax,
        date: newShiftDay,
      },
    });
  }

  return violations;
}
