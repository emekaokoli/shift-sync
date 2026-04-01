import dayjs from 'dayjs';
import db from '../infrastructure/database';

export interface CutoffCheckResult {
  allowed: boolean;
  error?: string;
  cutoffTime?: Date;
}

export async function checkCutoffViolation(
  shiftId: string,
  action: 'publish' | 'edit' | 'delete'
): Promise<CutoffCheckResult> {
  const shift = await db('shifts')
    .join('locations', 'shifts.location_id', 'locations.id')
    .where('shifts.id', shiftId)
    .select(
      'shifts.id',
      'shifts.start_time',
      'shifts.status',
      'locations.cutoff_hours',
      'locations.timezone'
    )
    .first();

  if (!shift) {
    return { allowed: true };
  }

  const shiftStart = dayjs(shift.start_time);
  const cutoffHours = shift.cutoff_hours || 48;
  const cutoffTime = shiftStart.subtract(cutoffHours, 'hour');
  const now = dayjs();

  if (now.isAfter(cutoffTime)) {
    return {
      allowed: false,
      error: `Cannot ${action} shift - past cutoff time (${cutoffHours}h before shift). Cutoff was at ${cutoffTime.format('MMM D, YYYY h:mm A')}`,
      cutoffTime: cutoffTime.toDate(),
    };
  }

  return { allowed: true, cutoffTime: cutoffTime.toDate() };
}
