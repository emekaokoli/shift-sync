import { PrismaClient, Shift as PrismaShift } from "@prisma/client";
import type {
  Availability as SharedAvailability,
  Shift as SharedShift,
} from "@shift-sync/shared";
import { ValidationResult, Violation } from "@shift-sync/shared";
import {
  checkAvailability,
  checkConsecutiveDays,
  checkLocationCertification,
  checkMinRest,
  checkNoOverlap,
  checkOvertime,
  checkSkillMatch,
} from "../rules";

interface ValidateAssignmentParams {
  db: PrismaClient;
  staffId: string;
  shiftId: string;
}

function normalizeAvailability(av: {
  id: string;
  userId: string;
  dayOfWeek: number | null;
  startTime: string;
  endTime: string;
  isRecurring: boolean;
  specificDate: Date | null;
}): SharedAvailability {
  return {
    id: av.id,
    userId: av.userId,
    dayOfWeek: av.dayOfWeek,
    startTime: av.startTime,
    endTime: av.endTime,
    isRecurring: av.isRecurring,
    specificDate: av.specificDate?.toISOString() ?? null,
  };
}

function normalizeShift(
  shift: PrismaShift & { location: { timezone: string } },
): SharedShift & { location: { timezone: string } } {
  return {
    id: shift.id,
    locationId: shift.locationId,
    startTime: shift.startTime.toISOString(),
    endTime: shift.endTime.toISOString(),
    requiredSkillId: shift.requiredSkillId,
    headcount: shift.headcount,
    status: shift.status as SharedShift["status"],
    publishedAt: shift.publishedAt?.toISOString() ?? null,
    createdAt: shift.createdAt.toISOString(),
    updatedAt: shift.updatedAt.toISOString(),
    location: {
      timezone: shift.location.timezone,
    },
  };
}

export async function validateAssignment({
  db,
  staffId,
  shiftId,
}: ValidateAssignmentParams): Promise<ValidationResult> {
  const violations: Violation[] = [];

  // Fetch related data
  const [staff, shift, existingAssignments] = await Promise.all([
    db.user.findUnique({
      where: { id: staffId },
      include: {
        skills: { include: { skill: true } },
        locationCertifications: true,
        availability: true,
      },
    }),
    db.shift.findUnique({
      where: { id: shiftId },
      include: { location: true },
    }),
    db.shiftAssignment.findMany({
      where: {
        staffId,
        shift: {
          status: { in: ["PUBLISHED", "DRAFT"] },
        },
      },
      include: {
        shift: {
          include: { location: true },
        },
      },
    }),
  ]);

  if (!staff) {
    return {
      ok: false,
      violations: [
        {
          code: "STAFF_NOT_FOUND",
          message: "Staff member not found",
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
          code: "SHIFT_NOT_FOUND",
          message: "Shift not found",
          details: { shiftId },
        },
      ],
    };
  }

  // Run all constraint checks
  const normalizedAssignments = existingAssignments.map((a) => ({
    shift: normalizeShift(a.shift),
  }));

  const noOverlapViolation = checkNoOverlap(
    normalizedAssignments,
    normalizeShift(shift),
  );
  if (noOverlapViolation) violations.push(noOverlapViolation);

  const minRestViolation = checkMinRest(
    normalizedAssignments,
    normalizeShift(shift),
  );
  if (minRestViolation) violations.push(minRestViolation);

  const skillViolation = checkSkillMatch(staff.skills, shift.requiredSkillId);
  if (skillViolation) violations.push(skillViolation);

  const locationViolation = checkLocationCertification(
    staff.locationCertifications,
    shift.locationId,
  );
  if (locationViolation) violations.push(locationViolation);

  const availabilityViolation = checkAvailability(
    staff.availability.map(normalizeAvailability),
    {
      startTime: shift.startTime.toISOString(),
      endTime: shift.endTime.toISOString(),
      location: shift.location,
    },
  );
  if (availabilityViolation) violations.push(availabilityViolation);

  const { violation: consecutiveViolation } = checkConsecutiveDays(
    normalizedAssignments,
    normalizeShift(shift),
  );
  if (consecutiveViolation) violations.push(consecutiveViolation);

  const overtimeViolations = checkOvertime(
    normalizedAssignments,
    normalizeShift(shift),
  );
  violations.push(...overtimeViolations);

  return violations.length > 0 ? { ok: false, violations } : { ok: true };
}
