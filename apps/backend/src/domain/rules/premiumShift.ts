import dayjs from "dayjs";
import { Shift, PREMIUM_SHIFT } from "@shift-sync/shared";

export function isPremiumShift(shift: Shift): boolean {
  const shiftStart = dayjs(shift.startTime);
  const timezone = (shift as unknown as { location?: { timezone: string } })
    .location?.timezone;

  const shiftInZone = timezone ? shiftStart.tz(timezone) : shiftStart;
  const day = shiftInZone.day();
  const hour = shiftInZone.hour();

  return (
    PREMIUM_SHIFT.DAYS.includes(day as 5 | 6) &&
    hour >= PREMIUM_SHIFT.START_HOUR &&
    hour < PREMIUM_SHIFT.END_HOUR
  );
}

export interface FairnessScore {
  staffId: string;
  staffName: string;
  premiumShifts: number;
  totalShifts: number;
  share: number;
  expectedShare: number;
  deviation: number;
}

export function calculateFairnessScore(
  staffId: string,
  staffName: string,
  allShifts: Shift[],
  staffAssignments: Shift[],
): FairnessScore {
  const premiumShifts = staffAssignments.filter((s) => isPremiumShift(s));
  const totalPremium = allShifts.filter((s) => isPremiumShift(s));

  const totalShifts = staffAssignments.length;
  const expectedShare =
    totalPremium.length > 0 ? totalPremium.length / allShifts.length : 0;
  const actualShare =
    totalShifts > 0 ? premiumShifts.length / Math.max(1, allShifts.length) : 0;

  return {
    staffId,
    staffName,
    premiumShifts: premiumShifts.length,
    totalShifts,
    share: actualShare,
    expectedShare,
    deviation: Math.abs(actualShare - expectedShare),
  };
}
