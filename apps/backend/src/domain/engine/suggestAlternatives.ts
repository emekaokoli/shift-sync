import { PrismaClient } from "@prisma/client";
import { validateAssignment } from "./validateAssignment";

interface Suggestion {
  staffId: string;
  staffName: string;
  reason: string;
}

interface SuggestAlternativesParams {
  db: PrismaClient;
  shiftId: string;
  limit?: number;
}

export async function suggestAlternatives({
  db,
  shiftId,
  limit = 3,
}: SuggestAlternativesParams): Promise<Suggestion[]> {
  const shift = await db.shift.findUnique({
    where: { id: shiftId },
    include: { location: true },
  });

  if (!shift) {
    return [];
  }

  const qualifiedStaff = await db.user.findMany({
    where: {
      role: "STAFF",
      skills: {
        some: {
          skillId: shift.requiredSkillId,
        },
      },
      locationCertifications: {
        some: {
          locationId: shift.locationId,
        },
      },
    },
    include: {
      skills: { include: { skill: true } },
      locationCertifications: true,
      availability: true,
    },
  });

  const suggestions: Suggestion[] = [];

  for (const staff of qualifiedStaff) {
    const result = await validateAssignment({
      db,
      staffId: staff.id,
      shiftId,
    });

    if (result.ok) {
      suggestions.push({
        staffId: staff.id,
        staffName: staff.name,
        reason: "Available and qualified",
      });
    } else {
      const blockingViolation = result.violations.find(
        (v) =>
          v.code.includes("BLOCK") ||
          v.code === "OVERLAP" ||
          v.code === "SKILL_MISMATCH",
      );

      if (blockingViolation) {
        suggestions.push({
          staffId: staff.id,
          staffName: staff.name,
          reason: blockingViolation.message,
        });
      }
    }

    if (suggestions.length >= limit * 2) {
      break;
    }
  }

  return suggestions
    .sort((a, b) => {
      const aValid = a.reason === "Available and qualified";
      const bValid = b.reason === "Available and qualified";
      if (aValid && !bValid) return -1;
      if (!aValid && bValid) return 1;
      return 0;
    })
    .slice(0, limit);
}
