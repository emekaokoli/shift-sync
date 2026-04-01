import type { Knex } from 'knex';
import { validateAssignment } from './validateAssignment';

interface Suggestion {
  staffId: string;
  staffName: string;
  reason: string;
}

interface SuggestAlternativesParams {
  db: Knex;
  shiftId: string;
  limit?: number;
}

export async function suggestAlternatives({
  db,
  shiftId,
  limit = 3,
}: SuggestAlternativesParams): Promise<Suggestion[]> {
  const shiftRows = await db('shifts').where('id', shiftId).first();

  if (!shiftRows) {
    return [];
  }

  const shift = {
    id: shiftRows.id,
    locationId: shiftRows.location_id,
    requiredSkillId: shiftRows.required_skill_id,
  };

  const qualifiedStaffRows = await db('users')
    .join('user_skills', 'users.id', 'user_skills.user_id')
    .join('user_locations', 'users.id', 'user_locations.user_id')
    .where('users.role', 'STAFF')
    .where('user_skills.skill_id', shift.requiredSkillId)
    .where('user_locations.location_id', shift.locationId)
    .groupBy('users.id')
    .select('users.id', 'users.name');

  const qualifiedStaff = await Promise.all(
    qualifiedStaffRows.map(async (staffRow) => ({
      id: staffRow.id,
      name: staffRow.name,
      skills: await db('user_skills')
        .join('skills', 'user_skills.skill_id', 'skills.id')
        .where('user_skills.user_id', staffRow.id)
        .select('skills.id', 'skills.name'),
      locationCertifications: await db('user_locations')
        .where('user_id', staffRow.id)
        .select('location_id'),
      availability: await db('availability').where('user_id', staffRow.id).select(),
    }))
  );

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
        reason: 'Available and qualified',
      });
    } else {
      const blockingViolation = result.violations.find(
        (v) => v.code.includes('BLOCK') || v.code === 'OVERLAP' || v.code === 'SKILL_MISMATCH'
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
      const aValid = a.reason === 'Available and qualified';
      const bValid = b.reason === 'Available and qualified';
      if (aValid && !bValid) return -1;
      if (!aValid && bValid) return 1;
      return 0;
    })
    .slice(0, limit);
}
