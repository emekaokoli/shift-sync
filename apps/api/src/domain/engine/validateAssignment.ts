import type { Knex } from 'knex';
import type { Availability as SharedAvailability, Shift as SharedShift } from '@shift-sync/shared';
import { ValidationResult, Violation } from '@shift-sync/shared';
import {
  checkAvailability,
  checkConsecutiveDays,
  checkLocationCertification,
  checkMinRest,
  checkNoOverlap,
  checkOvertime,
  checkSkillMatch,
} from '../rules';

interface ValidateAssignmentParams {
  db: Knex;
  staffId: string;
  shiftId: string;
}

function normalizeAvailability(av: {
  id: string;
  user_id: string;
  day_of_week: number | null;
  start_time: string;
  end_time: string;
  is_recurring: boolean;
  specific_date: Date | null;
}): SharedAvailability {
  return {
    id: av.id,
    userId: av.user_id,
    dayOfWeek: av.day_of_week,
    startTime: av.start_time,
    endTime: av.end_time,
    isRecurring: av.is_recurring,
    specificDate: av.specific_date?.toISOString() ?? null,
  };
}

function normalizeShift(shift: {
  id: string;
  location_id: string;
  start_time: Date;
  end_time: Date;
  required_skill_id: string | null;
  headcount: number;
  status: string;
  published_at: Date | null;
  created_at: Date;
  updated_at: Date;
  timezone: string;
}): SharedShift & { location: { timezone: string } } {
  return {
    id: shift.id,
    locationId: shift.location_id,
    startTime: shift.start_time.toISOString(),
    endTime: shift.end_time.toISOString(),
    requiredSkillId: shift.required_skill_id || '',
    headcount: shift.headcount,
    status: shift.status as SharedShift['status'],
    publishedAt: shift.published_at?.toISOString() ?? null,
    createdAt: shift.created_at.toISOString(),
    updatedAt: shift.updated_at.toISOString(),
    location: {
      timezone: shift.timezone,
    },
  };
}

export async function validateAssignment({
  db,
  staffId,
  shiftId,
}: ValidateAssignmentParams): Promise<ValidationResult> {
  const violations: Violation[] = [];

  const [staffRows, shiftRows, assignmentRows] = await Promise.all([
    db('users').where('id', staffId).first(),
    db('shifts')
      .join('locations', 'shifts.location_id', 'locations.id')
      .where('shifts.id', shiftId)
      .select('shifts.*', 'locations.timezone')
      .first(),
    db('shift_assignments')
      .join('shifts', 'shift_assignments.shift_id', 'shifts.id')
      .join('locations', 'shifts.location_id', 'locations.id')
      .where('shift_assignments.staff_id', staffId)
      .whereIn('shifts.status', ['PUBLISHED', 'DRAFT'])
      .select(
        'shift_assignments.*',
        'shifts.id as shift_id',
        'shifts.start_time',
        'shifts.end_time',
        'shifts.status as shift_status',
        'shifts.location_id',
        'shifts.required_skill_id',
        'shifts.headcount',
        'shifts.published_at',
        'shifts.created_at',
        'shifts.updated_at',
        'locations.timezone'
      ),
  ]);

  const staff = staffRows
    ? {
        id: staffRows.id,
        name: staffRows.name,
        role: staffRows.role,
        skills: await db('user_skills')
          .join('skills', 'user_skills.skill_id', 'skills.id')
          .where('user_skills.user_id', staffId)
          .select('skills.id', 'skills.name'),
        locationCertifications: await db('user_locations')
          .where('user_id', staffId)
          .select('location_id'),
        availability: await db('availability').where('user_id', staffId).select(),
      }
    : null;

  const shift = shiftRows
    ? {
        id: shiftRows.id,
        locationId: shiftRows.location_id,
        startTime: shiftRows.start_time,
        endTime: shiftRows.end_time,
        requiredSkillId: shiftRows.required_skill_id,
        headcount: shiftRows.headcount,
        status: shiftRows.status,
        publishedAt: shiftRows.published_at,
        createdAt: shiftRows.created_at,
        updatedAt: shiftRows.updated_at,
        location: { timezone: shiftRows.timezone },
      }
    : null;

  if (!staff) {
    return {
      ok: false,
      violations: [
        {
          code: 'STAFF_NOT_FOUND',
          message: 'Staff member not found',
          details: { staffId },
        },
      ],
    };
  }

  if (!shift) {
    return {
      ok: false,
      violations: [
        {
          code: 'SHIFT_NOT_FOUND',
          message: 'Shift not found',
          details: { shiftId },
        },
      ],
    };
  }

  const normalizedAssignments = assignmentRows.map((a) => ({
    shift: normalizeShift({
      id: a.shift_id,
      location_id: a.location_id,
      start_time: a.start_time,
      end_time: a.end_time,
      required_skill_id: a.required_skill_id,
      headcount: a.headcount,
      status: a.shift_status,
      published_at: a.published_at,
      created_at: a.created_at,
      updated_at: a.updated_at,
      timezone: a.timezone,
    }),
  }));

  const normalizedShift = normalizeShift({
    id: shift.id,
    location_id: shift.locationId,
    start_time: shift.startTime,
    end_time: shift.endTime,
    required_skill_id: shift.requiredSkillId,
    headcount: shift.headcount,
    status: shift.status,
    published_at: shift.publishedAt,
    created_at: shift.createdAt,
    updated_at: shift.updatedAt,
    timezone: shift.location.timezone,
  });

  const noOverlapViolation = checkNoOverlap(normalizedAssignments, normalizedShift);
  if (noOverlapViolation) violations.push(noOverlapViolation);

  const minRestViolation = checkMinRest(normalizedAssignments, normalizedShift);
  if (minRestViolation) violations.push(minRestViolation);

  const skillViolation = checkSkillMatch(
    staff.skills.map((s) => ({ skill: s })),
    shift.requiredSkillId
  );
  if (skillViolation) violations.push(skillViolation);

  const locationViolation = checkLocationCertification(
    staff.locationCertifications,
    shift.locationId
  );
  if (locationViolation) violations.push(locationViolation);

  const availabilityViolation = checkAvailability(staff.availability.map(normalizeAvailability), {
    startTime: shift.startTime.toISOString(),
    endTime: shift.endTime.toISOString(),
    location: shift.location,
  });
  if (availabilityViolation) violations.push(availabilityViolation);

  const { violation: consecutiveViolation } = checkConsecutiveDays(
    normalizedAssignments,
    normalizedShift
  );
  if (consecutiveViolation) violations.push(consecutiveViolation);

  const overtimeViolations = checkOvertime(normalizedAssignments, normalizedShift);
  violations.push(...overtimeViolations);

  return violations.length > 0 ? { ok: false, violations } : { ok: true };
}
